import React, { useEffect, useMemo, useState } from 'react';
import { sigcasApi } from '../api/sigcasApi.js';
import { buildMiCarteraFields } from '../domain/miCarteraRules.js';
import { filterMiCarteraCatalog, miCarteraDisplayName } from '../domain/miCarteraCatalog.js';

export default function MiCarteraCatalog({ onSelect }) {
  const [catalogo, setCatalogo] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    sigcasApi.getCatalogoConfiguracion().then(setCatalogo).catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => filterMiCarteraCatalog(catalogo, query), [catalogo, query]);

  return <div>
    <input className="csh-input" value={query} onChange={(e) => setQuery(e.target.value)}
      placeholder="Buscar en Catálogo Maestro SIGCAS" />
    {error && <p style={{color:'#A1443F',fontSize:12}}>{error}</p>}
    <div style={{marginTop:10,maxHeight:360,overflowY:'auto'}}>
      {rows.map((item) => <button type="button" key={item.id}
        onClick={() => onSelect?.({ item, fields: buildMiCarteraFields(item, item) })}
        style={{display:'block',width:'100%',textAlign:'left',padding:9,marginBottom:4}}>
        <strong>{miCarteraDisplayName(item)}</strong>
        <span style={{display:'block',fontSize:11}}>{item.clasificacion} · {item.servicio}</span>
      </button>)}
    </div>
  </div>;
}
