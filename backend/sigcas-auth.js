const base = (process.env.SIGCAS_SUPABASE_URL || '').replace(/\/$/, '');
const publishableKey = process.env.SIGCAS_SUPABASE_PUBLISHABLE_KEY || '';

function jwtSubject(token) { try { const part=token.split('.')[1]; if(!part) return null; const normalized=part.replace(/-/g,'+').replace(/_/g,'/'); const payload=JSON.parse(Buffer.from(normalized,'base64').toString('utf8')); return payload?.sub || null; } catch { return null; } }

export const requireSigcasBearer = (req, res, next) => {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Autenticación SIGCAS requerida' });
  req.sigcasAccessToken = header.slice(7);
  req.sigcasUserId = jwtSubject(req.sigcasAccessToken);
  if (!req.sigcasUserId) return res.status(401).json({ error: 'Token SIGCAS inválido' });
  next();
};

export async function sigcasRest(path, accessToken, options = {}) {
  if (!base || !publishableKey) throw new Error('Configuración Supabase SIGCAS incompleta');
  const response = await fetch(base + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: publishableKey,
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || 'Error SIGCAS');
    error.status = response.status;
    throw error;
  }
  return body;
}
