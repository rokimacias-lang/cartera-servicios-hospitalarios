export const buildMiCarteraFields = (catalogo, config) => {
  if (!catalogo || !config) return [];

  const fields = [];
  if (catalogo.requiere_subprestacion) {
    fields.push({ key: 'subprestaciones', type: 'multi-select', required: true });
  }
  if (config.requiere_atencion) {
    fields.push({
      key: 'atencion', type: 'select', required: true,
      options: config.opciones_atencion || [],
      allowOther: Boolean(config.permite_otra_atencion),
      otherKey: 'otra_atencion'
    });
  }
  if (config.requiere_jornada) {
    fields.push({
      key: 'jornada', type: 'select', required: true,
      options: config.opciones_jornada || [],
      allowOther: Boolean(config.permite_otra_jornada),
      otherKey: 'otra_jornada'
    });
  }
  if (config.requiere_capacidad) {
    fields.push({
      key: 'capacidad', type: 'capacity', required: true,
      categories: config.categorias_capacidad || []
    });
  }
  fields.push({ key: 'modalidades', type: 'multi-select', required: true });
  fields.push({ key: 'estado_disponibilidad', type: 'select', required: true });
  if (config.permite_otros) {
    fields.push({
      key: 'otros', type: config.tipo_otros === 'PROPUESTA_CATALOGO' ? 'catalog-proposal' : 'local-other',
      required: false
    });
  }
  return fields;
};

export const validateDynamicConfig = (fields, values = {}) => {
  const errors = {};
  for (const field of fields) {
    if (!field.required) continue;
    const value = values[field.key];
    if (Array.isArray(value) ? value.length === 0 : !value) errors[field.key] = 'Campo obligatorio';
  }
  for (const field of fields) {
    if (!field.allowOther) continue;
    const value = values[field.key];
    if (value === 'OTROS' && !values[field.otherKey]?.trim()) errors[field.otherKey] = 'Especifique';
  }
  return errors;
};

export const SIGCAS_AVAILABILITY = [
  'DISPONIBLE',
  'TEMPORALMENTE_SUSPENDIDA',
  'EN_IMPLEMENTACION',
  'NO_DISPONIBLE',
  'NO_APLICA'
];

export const SIGCAS_MODALITIES = [
  'PRESENCIAL',
  'AMBULATORIA',
  'HOSPITALARIA',
  'EMERGENCIA',
  'PROGRAMADA',
  'TELEMEDICINA'
];
