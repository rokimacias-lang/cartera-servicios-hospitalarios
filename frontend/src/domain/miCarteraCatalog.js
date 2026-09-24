export const miCarteraDisplayName = (item) =>
  item?.prestacion_homologada || item?.prestacion || item?.servicio || 'Prestación';

export const filterMiCarteraCatalog = (catalogo = [], query = '') => {
  const q = query.trim().toLowerCase();
  if (!q) return catalogo;
  return catalogo.filter((item) =>
    [item.codigo, item.clasificacion, item.area, item.servicio, item.prestacion_homologada, item.prestacion]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
};

export const groupMiCarteraCatalog = (catalogo = []) =>
  catalogo.reduce((tree, item) => {
    const clasificacion = item.clasificacion || 'Sin clasificación';
    const servicio = item.servicio || 'Sin servicio';
    tree[clasificacion] ||= {};
    tree[clasificacion][servicio] ||= [];
    tree[clasificacion][servicio].push(item);
    return tree;
  }, {});
