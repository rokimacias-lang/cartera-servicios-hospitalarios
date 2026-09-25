import React, { useEffect, useMemo, useState } from 'react';
import { sigcasApi } from '../api/sigcasApi.js';
import { buildMiCarteraFields } from '../domain/miCarteraRules.js';
import { filterMiCarteraCatalog, miCarteraDisplayName } from '../domain/miCarteraCatalog.js';

const keyOf = (...parts) => parts.map((x) => x || 'SIN_CLASIFICAR').join('::');

const GROUP_ORDER = ['Administrativos', 'Apoyo Diagnóstico y Terapéutico', 'Asistencial'];
const GROUP_ALIAS = {
  'Apoyo Diagnóstico': 'Apoyo Diagnóstico y Terapéutico',
  'Apoyo Terapéutico': 'Apoyo Diagnóstico y Terapéutico',
  'Apoyo Diagnóstico y Terapéutico': 'Apoyo Diagnóstico y Terapéutico',
  'Administrativos': 'Administrativos',
  'Asistencial': 'Asistencial'
};

function groupCatalog(rows) {
  const root = new Map();
  for (const item of rows) {
    const clasificacion = GROUP_ALIAS[item.clasificacion] || item.clasificacion || 'Sin clasificación';
    const servicio = item.servicio || item.area || 'Sin servicio';
    if (!root.has(clasificacion)) root.set(clasificacion, new Map());
    const servicios = root.get(clasificacion);
    if (!servicios.has(servicio)) servicios.set(servicio, []);
    servicios.get(servicio).push(item);
  }
  return new Map([...root.entries()].sort(([a],[b]) => {
    const ai = GROUP_ORDER.indexOf(a), bi = GROUP_ORDER.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b, 'es');
  }));
}

export default function MiCarteraCatalog({ onSelect }) {
  const [catalogo, setCatalogo] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [classification, setClassification] = useState('');
  const [open, setOpen] = useState({});

  useEffect(() => {
    sigcasApi.getCatalogoConfiguracion().then(setCatalogo).catch((e) => setError(e.message));
  }, []);

  const classifications = useMemo(
    () => [...new Set(catalogo.map((x) => x.clasificacion).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'es')),
    [catalogo]
  );
  const rows = useMemo(
    () => filterMiCarteraCatalog(catalogo, query)
      .filter((x) => !classification || x.clasificacion === classification),
    [catalogo, query, classification]
  );
  const tree = useMemo(() => groupCatalog(rows), [rows]);
  const searching = Boolean(query.trim());
  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const expanded = (key) => searching || Boolean(open[key]);

  return <div className="sigcas-catalog">
    <div className="sigcas-catalog__intro">
      <div>
        <h2>Catálogo Maestro SIGCAS</h2>
        <p>Seleccione la prestación siguiendo la estructura institucional. Las subprestaciones se configuran únicamente al seleccionar la prestación.</p>
      </div>
      <span className="sigcas-catalog__count">{rows.length} prestaciones</span>
    </div>

    <div className="sigcas-catalog__filters">
      <input className="csh-input" value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar servicio o prestación" />
      <select className="csh-select" value={classification} onChange={(e) => setClassification(e.target.value)}>
        <option value="">Todas las clasificaciones</option>
        {classifications.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>

    {error && <p className="alert alert--error">{error}</p>}
    {!error && rows.length === 0 && <p className="sigcas-catalog__empty">No se encontraron prestaciones con los filtros seleccionados.</p>}

    <div className="sigcas-tree sigcas-tree--v7">
      {[...tree.entries()].map(([clasificacion, services]) => {
        const cKey = keyOf(clasificacion);
        const cOpen = expanded(cKey);
        const cCount = [...services.values()].reduce((n, items) => n + items.length, 0);
        return <section className="sigcas-tree__classification" key={clasificacion}>
          <button type="button" className="sigcas-tree__classification-button sigcas-tree__classification-button--v7" onClick={() => toggle(cKey)} aria-expanded={cOpen}>
            <span><strong>{clasificacion}</strong>{clasificacion === 'Administrativos' && <small>Caracterización administrativa · Ficha Institucional</small>}</span>
            <b>{cOpen ? '⌄' : '›'}</b>
          </button>
          {cOpen && <div className="sigcas-tree__classification-body">
            {[...services.entries()].sort(([a],[b])=>a.localeCompare(b,'es')).map(([servicio, items]) => {
              const sKey = keyOf(clasificacion, servicio);
              const sOpen = expanded(sKey);
              return <div className="sigcas-tree__service sigcas-tree__service--v7" key={sKey}>
                <button type="button" className="sigcas-tree__service-button sigcas-tree__service-button--v7" onClick={() => toggle(sKey)} aria-expanded={sOpen}>
                  <span><strong>{servicio}</strong>{items.length > 1 && <small>({items.length} prestaciones)</small>}</span>
                  <b>{sOpen ? '⌄' : '›'}</b>
                </button>
                {sOpen && <div className="sigcas-tree__prestations">
                  {items.slice().sort((a,b) => miCarteraDisplayName(a).localeCompare(miCarteraDisplayName(b), 'es')).map((item) =>
                    <button type="button" className="sigcas-tree__prestation" key={item.id}
                      onClick={() => onSelect?.({ item, fields: buildMiCarteraFields(item, item) })}>
                      <span>{miCarteraDisplayName(item)}</span><small>Configurar →</small>
                    </button>
                  )}
                </div>}
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>
  </div>;
}
