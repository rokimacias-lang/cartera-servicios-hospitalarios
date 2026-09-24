const API_BASE = (import.meta.env.VITE_SIGCAS_API_URL || '/api/v1').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
      body: JSON.stringify(payload)
    });
  }
};
