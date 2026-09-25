import { useEffect, useMemo, useState } from 'react';
import { sigcasApi } from '../../api/sigcasApi.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { roleName } from '../../config/roles.js';

const emptyFilters = { provincia:'', hospital:'', tipologia:'', nivel:'', area:'', servicio:'', prestacion:'', estado:'' };
const uniq = (rows, getter) => [...new Set(rows.map(getter).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es'));
const pct = (n,d) => d ? Math.round((n/d)*100) : 0;

function SelectFilter({label,value,onChange,options,disabled=false}) {
  return <label><span>{label}</span><select value={value} disabled={disabled} onChange={(e)=>onChange(e.target.value)}>
    <option value="">Todos</option>{options.map((x)=><option key={x} value={x}>{x}</option>)}
  </select></label>;
}

function BarList({title,rows,total}) {
  return <div className="dashboard-chart"><h2>{title}</h2>{rows.length ? rows.map(([label,value])=><div className="dashboard-bar" key={label}>
    <div><span>{label}</span><strong>{value}</strong></div><progress max={Math.max(total,1)} value={value}/>
  </div>) : <p className="dashboard-empty">Sin datos para los filtros seleccionados.</p>}</div>;
}

export function HomePage() {
  const { profile } = useAuth();
  const [carteras,setCarteras]=useState([]);
  const [establecimientos,setEstablecimientos]=useState([]);
  const [filters,setFilters]=useState(emptyFilters);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{let active=true;Promise.all([sigcasApi.getDashboardCarteras(),sigcasApi.getEstablecimientos()])
    .then(([c,e])=>{if(active){setCarteras(c);setEstablecimientos(e)}})
    .catch((err)=>active&&setError(err.message))
    .finally(()=>active&&setLoading(false));return()=>{active=false}},[]);

  const options=useMemo(()=>{
    let est=establecimientos;
    const provincias=uniq(est,x=>x.provincia);
    if(filters.provincia) est=est.filter(x=>x.provincia===filters.provincia);
    const hospitales=uniq(est,x=>x.nombre);
    if(filters.hospital) est=est.filter(x=>x.nombre===filters.hospital);
    const tipologias=uniq(est,x=>x.tipologia);
    if(filters.tipologia) est=est.filter(x=>x.tipologia===filters.tipologia);
    const niveles=uniq(est,x=>x.nivel);
    const estIds=new Set(est.map(x=>x.id));
    const items=carteras.filter(c=>estIds.has(c.establecimiento_id)).flatMap(c=>c.cartera_items||[]);
    const areas=uniq(items,x=>x.catalogo_servicios?.area);
    const servicios=uniq(items.filter(x=>!filters.area||x.catalogo_servicios?.area===filters.area),x=>x.catalogo_servicios?.servicio);
    const prestaciones=uniq(items.filter(x=>(!filters.area||x.catalogo_servicios?.area===filters.area)&&(!filters.servicio||x.catalogo_servicios?.servicio===filters.servicio)),x=>x.catalogo_servicios?.prestacion);
    const estados=uniq(items,x=>x.estado_disponibilidad);
    return {provincias,hospitales,tipologias,niveles,areas,servicios,prestaciones,estados};
  },[establecimientos,carteras,filters]);

  const setFilter=(name,value)=>setFilters(prev=>{
    const order=['provincia','hospital','tipologia','nivel','area','servicio','prestacion','estado'];
    const next={...prev,[name]:value}; const idx=order.indexOf(name);
    order.slice(idx+1).forEach(k=>next[k]=''); return next;
  });

  const view=useMemo(()=>{
    const estById=new Map(establecimientos.map(e=>[e.id,e]));
    const cs=carteras.filter(c=>{const e=estById.get(c.establecimiento_id)||c.establecimientos||{};
      const provincia=e.provincia||e.provincias?.nombre||'';
      return (!filters.provincia||provincia===filters.provincia)&&(!filters.hospital||e.nombre===filters.hospital)&&(!filters.tipologia||e.tipologia===filters.tipologia)&&(!filters.nivel||e.nivel===filters.nivel);
    });
    const items=cs.flatMap(c=>(c.cartera_items||[]).map(i=>({...i,cartera:c}))).filter(i=>{
      const x=i.catalogo_servicios||{};
      return (!filters.area||x.area===filters.area)&&(!filters.servicio||x.servicio===filters.servicio)&&(!filters.prestacion||x.prestacion===filters.prestacion)&&(!filters.estado||i.estado_disponibilidad===filters.estado);
    });
    const establishmentIds=new Set(cs.map(c=>c.establecimiento_id));
    const configured=new Set(items.map(i=>i.catalogo_id));
    const available=items.filter(i=>i.estado_disponibilidad==='DISPONIBLE').length;
    const suspended=items.filter(i=>i.estado_disponibilidad==='TEMPORALMENTE_SUSPENDIDA').length;
    const pending=cs.filter(c=>['BORRADOR','OBSERVADA','EN_REVISION'].includes(c.estado)).length;
    const states={};items.forEach(i=>states[i.estado_disponibilidad]=(states[i.estado_disponibilidad]||0)+1);
    const services={};items.forEach(i=>{const s=i.catalogo_servicios?.servicio||'Sin servicio';services[s]=(services[s]||0)+1});
    return {cs,items,establishmentIds,configured,available,suspended,pending,states,services};
  },[carteras,establecimientos,filters]);

  const stateRows=Object.entries(view.states).sort((a,b)=>b[1]-a[1]);
  const serviceRows=Object.entries(view.services).sort((a,b)=>b[1]-a[1]).slice(0,8);

  return <section>
    <div className="eyebrow">Sistema de Gestión de Carteras de Servicios · MSP</div>
    <h1>Dashboard ejecutivo</h1>
    <p className="lead">Vista dinámica según el alcance de {roleName(profile)}. Los indicadores responden a los filtros institucionales y a la información registrada en SIGCAS.</p>

    {error&&<div className="alert alert--error">{error}</div>}
    <div className="dashboard-filters">
      <SelectFilter label="Provincia" value={filters.provincia} onChange={(v)=>setFilter('provincia',v)} options={options.provincias}/>
      <SelectFilter label="Hospital" value={filters.hospital} onChange={(v)=>setFilter('hospital',v)} options={options.hospitales}/>
      <SelectFilter label="Tipología" value={filters.tipologia} onChange={(v)=>setFilter('tipologia',v)} options={options.tipologias}/>
      <SelectFilter label="Nivel" value={filters.nivel} onChange={(v)=>setFilter('nivel',v)} options={options.niveles}/>
      <SelectFilter label="Área / Unidad" value={filters.area} onChange={(v)=>setFilter('area',v)} options={options.areas}/>
      <SelectFilter label="Servicio" value={filters.servicio} onChange={(v)=>setFilter('servicio',v)} options={options.servicios}/>
      <SelectFilter label="Prestación" value={filters.prestacion} onChange={(v)=>setFilter('prestacion',v)} options={options.prestaciones}/>
      <SelectFilter label="Estado" value={filters.estado} onChange={(v)=>setFilter('estado',v)} options={options.estados}/>
    </div>

    {loading?<div className="card">Cargando indicadores institucionales...</div>:<>
      <div className="dashboard-kpis">
        <article><span>Establecimientos</span><strong>{view.establishmentIds.size}</strong><small>con cartera registrada</small></article>
        <article><span>Carteras</span><strong>{view.cs.length}</strong><small>versiones visibles</small></article>
        <article><span>Prestaciones</span><strong>{view.configured.size}</strong><small>catálogo configurado</small></article>
        <article><span>Oferta disponible</span><strong>{view.available}</strong><small>{pct(view.available,view.items.length)}% de registros filtrados</small></article>
        <article><span>Suspendidas</span><strong>{view.suspended}</strong><small>temporalmente</small></article>
        <article><span>Pendientes</span><strong>{view.pending}</strong><small>validación / revisión</small></article>
      </div>
      <div className="dashboard-grid">
        <BarList title="Oferta por estado" rows={stateRows} total={Math.max(...stateRows.map(x=>x[1]),1)}/>
        <BarList title="Prestaciones por servicio" rows={serviceRows} total={Math.max(...serviceRows.map(x=>x[1]),1)}/>
      </div>
      <div className="card dashboard-table"><div className="dashboard-table__head"><h2>Carteras operativas</h2><span>{view.cs.length} registros</span></div>
        <div className="table-scroll"><table><thead><tr><th>Establecimiento</th><th>Tipología / Nivel</th><th>Periodo</th><th>Versión</th><th>Estado</th><th>Prestaciones</th></tr></thead>
        <tbody>{view.cs.slice(0,30).map(c=>{const e=c.establecimientos||establecimientos.find(x=>x.id===c.establecimiento_id)||{};return <tr key={c.id}><td><strong>{e.nombre||'—'}</strong><br/><small>{e.unicodigo||''}</small></td><td>{e.tipologia||'—'}<br/><small>{e.nivel||''}</small></td><td>{c.periodo}</td><td>{c.version}</td><td><span className="status status--requerida">{c.estado}</span></td><td>{(c.cartera_items||[]).length}</td></tr>})}</tbody></table></div>
      </div>
    </>}
  </section>;
}
