const API_BASE = (import.meta.env.VITE_SIGCAS_API_URL || '/api/v1').replace(/\/$/, '');

const TOKEN_KEY = 'sigcas_access_token';

export const sigcasSession = {
  getAccessToken: () => sessionStorage.getItem(TOKEN_KEY) || '',
  setAccessToken: (token) => token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY),
  clear: () => sessionStorage.removeItem(TOKEN_KEY)
  ,registerDocumento(payload) {
    return request('/documentos', { method: 'POST', auth: true, body: JSON.stringify(payload) });
  }
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
};
