import { useCallback, useEffect, useMemo, useState } from 'react';
import { ASSIGNMENT_STATES, assignmentStateOf, fetchAssignments, fetchFilterOptions, fetchIndicators, PAGE_SIZE, upsertAssignments } from './assignment.service.js';
import { mapSupabaseError } from '../../services/supabase/errors.js';

const EMPTY_FILTERS = { nivel: '', tipologia: '', clasificacion: '', servicio: '', busqueda: '', estado_asignacion: '' };
const EMPTY_BULK = { estado: '', fuenteRegla: '', justificacion: '', vigenciaDesde: '', vigenciaHasta: '' };
const STATE_LABELS = { SIN_CONFIGURAR: 'Sin configurar', REQUERIDA: 'Requeridas', OPCIONAL: 'Opcionales', NO_PERMITIDA: 'No permitidas' };

function idOf(row) {
  return row.catalogo_id ?? row.prestacion_id ?? row.id;
}

function Filters({ filters, options, onChange }) {
  const field = (key) => (event) => onChange({ ...filters, [key]: event.target.value });
  return (
    <div className="filters" aria-label="Filtros de asignación">
      <label>Nivel<select value={filters.nivel} onChange={field('nivel')}><option value="">Todos</option>{options.niveles.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Tipología<select value={filters.tipologia} onChange={field('tipologia')}><option value="">Todas</option>{options.tipologias.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Clasificación<select value={filters.clasificacion} onChange={field('clasificacion')}><option value="">Todas</option>{options.clasificaciones.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Servicio<select value={filters.servicio} onChange={field('servicio')}><option value="">Todos</option>{options.servicios.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Estado<select value={filters.estado_asignacion} onChange={field('estado_asignacion')}><option value="">Todos</option>{ASSIGNMENT_STATES.map((value) => <option key={value} value={value}>{STATE_LABELS[value]}</option>)}</select></label>
      <label className="filters__search">Buscar prestación<input type="search" value={filters.busqueda} onChange={field('busqueda')} placeholder="Nombre de la prestación" /></label>
      <button className="button button--quiet" onClick={() => onChange(EMPTY_FILTERS)}>Limpiar</button>
    </div>
  );
}

export function TypologyAssignmentPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [options, setOptions] = useState({ niveles: [], tipologias: [], clasificaciones: [], servicios: [] });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [indicators, setIndicators] = useState(Object.fromEntries(ASSIGNMENT_STATES.map((state) => [state, 0])));
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [bulk, setBulk] = useState(EMPTY_BULK);
  const [status, setStatus] = useState({ loading: true, saving: false, error: null, success: '' });

  useEffect(() => { fetchFilterOptions().then(setOptions).catch((error) => setStatus((value) => ({ ...value, error: mapSupabaseError(error) }))); }, []);
  const load = useCallback(async () => {
    setStatus((value) => ({ ...value, loading: true, error: null, success: '' }));
    try {
      const [result, counts] = await Promise.all([fetchAssignments(filters, page), fetchIndicators(filters)]);
      setRows(result.rows); setTotal(result.total); setIndicators(counts);
      setSelected(new Set());
      setStatus((value) => ({ ...value, loading: false }));
    } catch (error) {
      setStatus((value) => ({ ...value, loading: false, error: mapSupabaseError(error) }));
    }
  }, [filters, page]);
  useEffect(() => { void load(); }, [load]);

  const visibleIds = useMemo(() => rows.map(idOf).filter(Boolean), [rows]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const updateFilters = (next) => { setFilters(next); setPage(0); };
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(visibleIds));
  const toggleOne = (id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const save = async (event) => {
    event.preventDefault();
    setStatus((value) => ({ ...value, saving: true, error: null, success: '' }));
    try {
      await upsertAssignments({ ...bulk, nivel: filters.nivel, tipologia: filters.tipologia, catalogoIds: [...selected] });
      setBulk(EMPTY_BULK); setSelected(new Set());
      setStatus((value) => ({ ...value, saving: false, success: 'Asignaciones guardadas correctamente.' }));
      await load();
    } catch (error) {
      setStatus((value) => ({ ...value, saving: false, error: mapSupabaseError(error) }));
    }
  };

  const countTotal = Object.values(indicators).reduce((sum, value) => sum + value, 0);
  return (
    <section>
      <div className="eyebrow">Administración Central</div><h1>Asignación por Tipología/Nivel</h1>
      <p className="lead">Configure la aplicabilidad institucional de las prestaciones. Sin configurar representa la ausencia de una regla.</p>
      <Filters filters={filters} options={options} onChange={updateFilters} />
      <div className="indicators">
        <div><strong>{countTotal}</strong><span>Total filtrado</span></div>
        {ASSIGNMENT_STATES.map((state) => <div key={state}><strong>{indicators[state]}</strong><span>{STATE_LABELS[state]}</span></div>)}
      </div>
      {status.error && <div className="alert alert--error" role="alert"><strong>{status.error.kind === 'permission_denied' ? 'Permiso denegado.' : 'No se pudo completar la operación.'}</strong> {status.error.userMessage}</div>}
      {status.success && <div className="alert alert--success" role="status">{status.success}</div>}
      <div className="card table-card" aria-busy={status.loading}>
        <div className="table-toolbar"><span>{total} resultados · {selected.size} seleccionados</span><button className="button button--quiet" disabled={!selected.size} onClick={() => setSelected(new Set())}>Deseleccionar</button></div>
        <div className="table-scroll"><table><thead><tr><th><input aria-label="Seleccionar visibles" type="checkbox" checked={allVisibleSelected} onChange={toggleAll} /></th><th>Clasificación</th><th>Servicio</th><th>Prestación</th><th>Nivel</th><th>Tipología</th><th>Estado</th><th>Fuente</th><th>Justificación</th><th>Vigencia</th></tr></thead>
          <tbody>{status.loading ? <tr><td colSpan="10">Cargando configuración…</td></tr> : rows.length === 0 ? <tr><td colSpan="10">No existen resultados para los filtros seleccionados.</td></tr> : rows.map((row) => { const id = idOf(row); const assignmentState = assignmentStateOf(row); return <tr key={`${row.nivel}-${row.tipologia}-${id}`}><td><input aria-label={`Seleccionar ${row.prestacion}`} type="checkbox" checked={selected.has(id)} onChange={() => toggleOne(id)} /></td><td>{row.clasificacion ?? '—'}</td><td>{row.servicio ?? '—'}</td><td>{row.prestacion ?? '—'}</td><td>{row.nivel ?? '—'}</td><td>{row.tipologia ?? '—'}</td><td><span className={`status status--${assignmentState.toLowerCase()}`}>{STATE_LABELS[assignmentState] ?? assignmentState}</span></td><td>{row.fuente_regla ?? '—'}</td><td>{row.justificacion ?? '—'}</td><td>{row.vigencia_desde ? `${row.vigencia_desde} — ${row.vigencia_hasta ?? 'vigente'}` : '—'}</td></tr>; })}</tbody>
        </table></div>
        <div className="pagination"><button className="button button--quiet" disabled={page === 0 || status.loading} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><button className="button button--quiet" disabled={(page + 1) * PAGE_SIZE >= total || status.loading} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div>
      </div>
      <form className="card bulk-form" onSubmit={save}>
        <div><h2>Operación masiva</h2><p>Se aplicará a {selected.size} prestaciones seleccionadas de la página visible.</p></div>
        <label>Estado<select value={bulk.estado} onChange={(event) => setBulk({ ...bulk, estado: event.target.value })} required><option value="">Seleccione</option>{ASSIGNMENT_STATES.filter((state) => state !== 'SIN_CONFIGURAR').map((state) => <option key={state} value={state}>{STATE_LABELS[state]}</option>)}</select></label>
        <label>Fuente de regla<input value={bulk.fuenteRegla} onChange={(event) => setBulk({ ...bulk, fuenteRegla: event.target.value })} required /></label>
        <label>Justificación<textarea value={bulk.justificacion} onChange={(event) => setBulk({ ...bulk, justificacion: event.target.value })} required /></label>
        <label>Vigencia desde<input type="date" value={bulk.vigenciaDesde} onChange={(event) => setBulk({ ...bulk, vigenciaDesde: event.target.value })} required /></label>
        <label>Vigencia hasta<input type="date" value={bulk.vigenciaHasta} onChange={(event) => setBulk({ ...bulk, vigenciaHasta: event.target.value })} /></label>
        <button className="button" disabled={!selected.size || status.saving}>{status.saving ? 'Guardando…' : 'Guardar asignaciones'}</button>
      </form>
    </section>
  );
}
