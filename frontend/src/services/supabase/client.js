const url = import.meta.env?.VITE_SUPABASE_URL?.trim().replace(/\/$/, '');
const publishableKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const SESSION_KEY = 'sigcas.supabase.session';

export const supabaseConfigured = Boolean(url && publishableKey);

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) ?? null; } catch { return null; }
}

function writeSession(session) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function apiError(response, body) {
  const error = new Error(body?.message ?? body?.error_description ?? body?.hint ?? `HTTP ${response.status}`);
  error.status = response.status;
  error.code = body?.code;
  return error;
}

async function request(path, options = {}) {
  const session = readSession();
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${session?.access_token ?? publishableKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await responseBody(response);
  if (!response.ok) return { data: null, error: apiError(response, body), response };
  return { data: body, error: null, response };
}

class QueryBuilder {
  constructor(resource) { this.resource = resource; this.params = new URLSearchParams(); this.headers = {}; this.singleRow = false; }
  select(columns = '*', options = {}) { this.params.set('select', columns); if (options.count) this.headers.Prefer = `count=${options.count}`; if (options.head) this.method = 'HEAD'; return this; }
  eq(column, value) { this.params.append(column, `eq.${value}`); return this; }
  in(column, values) { this.params.append(column, `in.(${values.join(',')})`); return this; }
  insert(values) { this.method = 'POST'; this.body = JSON.stringify(values); this.headers.Prefer = 'return=representation'; return this; }
  ilike(column, value) { this.params.append(column, `ilike.${value}`); return this; }
  not(column, operator, value) { this.params.append(column, `not.${operator}.${value}`); return this; }
  order(column, options = {}) { this.params.append('order', `${column}.${options.ascending === false ? 'desc' : 'asc'}`); return this; }
  range(from, to) { this.headers.Range = `${from}-${to}`; return this; }
  limit(value) { this.params.set('limit', String(value)); return this; }
  single() { this.singleRow = true; this.headers.Accept = 'application/vnd.pgrst.object+json'; return this; }
  async execute() {
    const result = await request(`/rest/v1/${this.resource}?${this.params}`, { method: this.method ?? 'GET', headers: this.headers, ...(this.body !== undefined ? { body: this.body } : {}) });
    const contentRange = result.response?.headers.get('content-range');
    const count = contentRange ? Number(contentRange.split('/')[1]) : null;
    return { data: result.data, error: result.error, count: Number.isFinite(count) ? count : null };
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

const listeners = new Set();
function notify(event, session) { listeners.forEach((listener) => listener(event, session)); }

const auth = {
  async signInWithPassword(credentials) {
    const result = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify(credentials), headers: { Authorization: `Bearer ${publishableKey}` } });
    if (!result.error) { writeSession(result.data); notify('SIGNED_IN', result.data); }
    return { data: { session: result.data, user: result.data?.user }, error: result.error };
  },
  async signOut() {
    const result = await request('/auth/v1/logout', { method: 'POST' });
    writeSession(null); notify('SIGNED_OUT', null);
    return { error: result.error };
  },
  async getSession() {
    let session = readSession();
    if (!session) return { data: { session: null }, error: null };
    if (session.refresh_token && session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
      const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: session.refresh_token }),
        headers: { Authorization: `Bearer ${publishableKey}` },
      });
      if (refreshed.error) { writeSession(null); return { data: { session: null }, error: refreshed.error }; }
      session = refreshed.data;
      writeSession(session);
      notify('TOKEN_REFRESHED', session);
    }
    const result = await request('/auth/v1/user');
    if (result.error) { writeSession(null); return { data: { session: null }, error: result.error }; }
    const restored = { ...session, user: result.data };
    writeSession(restored);
    return { data: { session: restored }, error: null };
  },
  onAuthStateChange(callback) {
    listeners.add(callback);
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
};

export const supabase = supabaseConfigured ? {
  auth,
  from: (resource) => new QueryBuilder(resource),
  rpc: async (name, parameters) => {
    const result = await request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(parameters) });
    return { data: result.data, error: result.error };
  },
} : null;

export function requireSupabase() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  return supabase;
}
