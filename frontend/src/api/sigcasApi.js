const API_BASE = (import.meta.env.VITE_SIGCAS_API_URL || '/api/v1').replace(/\/$/, '');

const SUPABASE_SESSION_KEY = 'sigcas.supabase.session';

export const sigcasSession = {
  getAccessToken: () => { try { return JSON.parse(sessionStorage.getItem(SUPABASE_SESSION_KEY) || 'null')?.access_token || ''; } catch { return ''; } },
  clear: () => sessionStorage.removeItem(SUPABASE_SESSION_KEY)
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.auth ? { Authorization: `Bearer ${sigcasSession.getAccessToken()}` } : {}), ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `SIGCAS API ${response.status}`);
  }
  return response.json();
}

export const sigcasApi = {
  getCatalogoConfiguracion() {
    return request('/catalogo/configuracion-funcional');
  },
  getSubprestaciones(catalogoId) {
    return request(`/catalogo/${encodeURIComponent(catalogoId)}/subprestaciones`);
  },
  getCarteraActiva(establecimientoId, periodo = new Date().getFullYear()) {
    return request(`/establecimientos/${encodeURIComponent(establecimientoId)}/cartera-activa?periodo=${encodeURIComponent(periodo)}`, { auth: true });
  },
  createCartera(establecimientoId, periodo = new Date().getFullYear()) {
    return request(`/establecimientos/${encodeURIComponent(establecimientoId)}/carteras`, { method: 'POST', auth: true, body: JSON.stringify({ periodo: String(periodo) }) });
  },
  getMiCartera(carteraId) {
    return request(`/carteras/${encodeURIComponent(carteraId)}/items`);
  },
  saveCarteraItem(carteraId, payload) {
    return request(`/carteras/${encodeURIComponent(carteraId)}/items`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload)
    });
  }
  ,registerDocumento(payload) {
    return request('/documentos', { method: 'POST', auth: true, body: JSON.stringify(payload) });
  }
};