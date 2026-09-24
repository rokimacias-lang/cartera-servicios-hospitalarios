import React, { useEffect, useState } from 'react';
import { sigcasApi } from '../api/sigcasApi.js';
import { buildMiCarteraFields, SIGCAS_AVAILABILITY, SIGCAS_MODALITIES, validateDynamicConfig } from '../domain/miCarteraRules.js';

const pretty = (value) => String(value || '').replaceAll('_', ' ');

export default function MiCarteraDynamicForm({ item, onReady }) {
  const [values, setValues] = useState({ subprestaciones: [], modalidades: [], estado_disponibilidad: 'DISPONIBLE' });
  const [subprestaciones, setSubprestaciones] = useState([]);
  const [errors, setErrors] = useState({});

  const fields = buildMiCarteraFields(item, item);

  useEffect(() => {
    setValues({ subprestaciones: [], modalidades: [], estado_disponibilidad: 'DISPONIBLE' });
    setErrors({});
    if (!item?.requiere_subprestacion) { setSubprestaciones([]); return; }
    sigcasApi.getSubprestaciones(item.id).then(setSubprestaciones).catch(() => setSubprestaciones([]));
  }, [item?.id]);

  if (!item) return null;

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const toggle = (key, value) => setValues((v) => {
    const current = v[key] || [];
    return { ...v, [key]: current.includes(value) ? current.filter((x) => x !== value) : [...current, value] };
  });

  const submit = () => {
    const next = validateDynamicConfig(fields, values);
    setErrors(next);
    if (Object.keys(next).length === 0) onReady?.({ catalogo_id: item.id, ...values });
  };

  return <div style={{marginTop:14}}>
    {fields.some((f) => f.key === 'subprestaciones') && <div className="csh-field">
      <label className="csh-label">Subprestaciones *</label>
      {subprestaciones.map((s) => <label key={s.id} style={{display:'block',fontSize:12.5,padding:3}}>
        <input type="checkbox" checked={values.subprestaciones.includes(s.id)} onChange={() => toggle('subprestaciones', s.id)} />
        {' '}{[s.grupo,s.subgrupo,s.nombre].filter(Boolean).join(' → ')}
      </label>)}
      {errors.subprestaciones && <small>{errors.subprestaciones}</small>}
    </div>}

    {fields.find((f) => f.key === 'atencion') && <div className="csh-field">
      <label className="csh-label">Atención *</label>
      <select className="csh-select" value={values.atencion || ''} onChange={(e) => set('atencion', e.target.value)}>
        <option value="">Selecciona…</option>
        {fields.find((f) => f.key === 'atencion').options.map((x) => <option key={x}>{x}</option>)}
        {fields.find((f) => f.key === 'atencion').allowOther && <option value="OTROS">Otros</option>}
      </select>
      {values.atencion === 'OTROS' && <input className="csh-input" value={values.otra_atencion || ''} onChange={(e) => set('otra_atencion', e.target.value)} placeholder="Especifique atención" />}
    </div>}

    {fields.find((f) => f.key === 'jornada') && <div className="csh-field">
      <label className="csh-label">Jornada *</label>
      <select className="csh-select" value={values.jornada || ''} onChange={(e) => set('jornada', e.target.value)}>
        <option value="">Selecciona…</option>
        {fields.find((f) => f.key === 'jornada').options.map((x) => <option key={x}>{x}</option>)}
        {fields.find((f) => f.key === 'jornada').allowOther && <option value="OTROS">Otros</option>}
      </select>
      {values.jornada === 'OTROS' && <input className="csh-input" value={values.otra_jornada || ''} onChange={(e) => set('otra_jornada', e.target.value)} placeholder="Especifique jornada" />}
    </div>}

    {fields.find((f) => f.key === 'capacidad') && <div className="csh-field">
      <label className="csh-label">Capacidad instalada *</label>
      <select className="csh-select" value={values.capacidad || ''} onChange={(e) => set('capacidad', e.target.value)}>
        <option value="">Selecciona…</option>
        {fields.find((f) => f.key === 'capacidad').categories.map((x) => <option key={x}>{x}</option>)}
      </select>
    </div>}

    <div className="csh-field"><label className="csh-label">Modalidad *</label>
      {SIGCAS_MODALITIES.map((x) => <label key={x} style={{marginRight:10,fontSize:12.5}}><input type="checkbox" checked={values.modalidades.includes(x)} onChange={() => toggle('modalidades', x)} /> {pretty(x)}</label>)}
    </div>

    <div className="csh-field"><label className="csh-label">Disponibilidad / Estado *</label>
      <select className="csh-select" value={values.estado_disponibilidad} onChange={(e) => set('estado_disponibilidad', e.target.value)}>
        {SIGCAS_AVAILABILITY.map((x) => <option key={x} value={x}>{pretty(x)}</option>)}
      </select>
    </div>

    <button type="button" className="csh-btn" onClick={submit}>Agregar a Mi Cartera</button>
  </div>;
}
