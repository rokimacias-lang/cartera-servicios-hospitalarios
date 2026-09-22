import { requireSupabase } from '../../services/supabase/client.js';
import { mapSupabaseError, SigcasError } from '../../services/supabase/errors.js';

export const ASSIGNMENT_STATES = ['SIN_CONFIGURAR', 'REQUERIDA', 'OPCIONAL', 'NO_PERMITIDA'];
export const PAGE_SIZE = 50;

function applyFilters(query, filters, includeState = true) {
  let next = query;
  if (filters.nivel) next = next.eq('nivel', filters.nivel);
  if (filters.tipologia) next = next.eq('tipologia', filters.tipologia);
  if (filters.clasificacion) next = next.eq('clasificacion', filters.clasificacion);
  if (filters.servicio) next = next.eq('servicio', filters.servicio);
  if (includeState && filters.estado) next = next.eq('estado', filters.estado);
  if (filters.busqueda) next = next.ilike('prestacion', `%${filters.busqueda.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`);
  return next;
}

export async function fetchAssignments(filters, page = 0) {
  const from = page * PAGE_SIZE;
  let query = requireSupabase()
    .from('v_catalogo_tipologia_configuracion')
    .select('*', { count: 'exact' })
    .order('clasificacion')
    .order('servicio')
    .order('prestacion')
    .range(from, from + PAGE_SIZE - 1);
  query = applyFilters(query, filters);
  const { data, error, count } = await query;
  if (error) throw mapSupabaseError(error, 'No fue posible cargar la configuración por tipología.');
  return { rows: data ?? [], total: count ?? 0 };
}

export async function fetchFilterOptions() {
  const { data, error } = await requireSupabase()
    .from('v_catalogo_tipologia_configuracion')
    .select('nivel, tipologia, clasificacion, servicio')
    .limit(1930);
  if (error) throw mapSupabaseError(error, 'No fue posible cargar los filtros institucionales.');
  const unique = (key) => [...new Set((data ?? []).map((row) => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  return { niveles: unique('nivel'), tipologias: unique('tipologia'), clasificaciones: unique('clasificacion'), servicios: unique('servicio') };
}

export async function fetchIndicators(filters) {
  const count = async (estado) => {
    let query = requireSupabase().from('v_catalogo_tipologia_configuracion').select('*', { count: 'exact', head: true });
    query = applyFilters(query, { ...filters, estado }, true);
    const { count: result, error } = await query;
    if (error) throw mapSupabaseError(error, 'No fue posible calcular los indicadores.');
    return result ?? 0;
  };
  const values = await Promise.all(ASSIGNMENT_STATES.map(count));
  return Object.fromEntries(ASSIGNMENT_STATES.map((state, index) => [state, values[index]]));
}

export function validateBulkAssignment(input) {
  if (!input.nivel || !input.tipologia) throw new SigcasError('validation', 'Seleccione un nivel y una tipología antes de guardar.');
  if (!input.catalogoIds.length) throw new SigcasError('validation', 'Seleccione al menos una prestación visible.');
  if (!ASSIGNMENT_STATES.includes(input.estado) || input.estado === 'SIN_CONFIGURAR') {
    throw new SigcasError('validation', 'Seleccione un estado configurable para la asignación.');
  }
  if (!input.fuenteRegla.trim() || !input.justificacion.trim() || !input.vigenciaDesde) {
    throw new SigcasError('validation', 'Fuente, justificación y vigencia desde son obligatorias.');
  }
  if (input.vigenciaHasta && input.vigenciaHasta < input.vigenciaDesde) {
    throw new SigcasError('validation', 'La vigencia hasta no puede ser anterior a la vigencia desde.');
  }
}

export async function upsertAssignments(input) {
  validateBulkAssignment(input);
  const { data, error } = await requireSupabase().rpc('sigcas_upsert_asignaciones_tipologia', {
    p_nivel: input.nivel,
    p_tipologia: input.tipologia,
    p_catalogo_ids: input.catalogoIds,
    p_estado: input.estado,
    p_fuente_regla: input.fuenteRegla.trim(),
    p_justificacion: input.justificacion.trim(),
    p_vigencia_desde: input.vigenciaDesde,
    p_vigencia_hasta: input.vigenciaHasta || null,
  });
  if (error) throw mapSupabaseError(error, 'No fue posible guardar las asignaciones.');
  return data;
}
