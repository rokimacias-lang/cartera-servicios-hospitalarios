import { requireSupabase } from '../services/supabase/client.js';

function db() {
  return requireSupabase();
}

function fail(error) {
  if (error) throw error;
}

export const sigcasSession = {
  getAccessToken: () => {
    try { return JSON.parse(sessionStorage.getItem('sigcas.supabase.session') || 'null')?.access_token || ''; }
    catch { return ''; }
  },
  clear: () => sessionStorage.removeItem('sigcas.supabase.session')
};

export const sigcasApi = {
  async getEstablecimientos() {
    const { data, error } = await db().from('establecimientos')
      .select('id,unicodigo,nombre,provincia_id,canton,tipologia,nivel,activo,provincias(nombre)')
      .eq('activo', true).order('nombre');
    fail(error);
    return (data || []).map((row) => ({ ...row, provincia: row.provincias?.nombre || '', provincias: undefined }));
  },

  async getDashboardCarteras() {
    const { data, error } = await db().from('carteras')
      .select('id,establecimiento_id,periodo,version,estado,created_at,establecimientos(id,unicodigo,nombre,provincia_id,tipologia,nivel,provincias(nombre)),cartera_items(id,catalogo_id,estado_disponibilidad,catalogo_servicios(id,clasificacion,area,servicio,prestacion))')
      .order('created_at', { ascending: false });
    fail(error);
    return data || [];
  },

  async getCatalogoConfiguracion() {
    const select = 'id,codigo,clasificacion,area,servicio,prestacion,prestacion_homologada,estado_homologacion,requiere_subprestacion,catalogo_configuracion_funcional!inner(requiere_atencion,opciones_atencion,permite_otra_atencion,requiere_jornada,opciones_jornada,permite_otra_jornada,permite_otros,tipo_otros,requiere_capacidad,categorias_capacidad,configuracion_especial)';
    const { data, error } = await db().from('catalogo_servicios').select(select)
      .eq('activo', true).eq('catalogo_configuracion_funcional.activo', true)
      .order('clasificacion').order('servicio').order('orden');
    fail(error);
    return (data || []).map((row) => ({
      ...row,
      ...(Array.isArray(row.catalogo_configuracion_funcional) ? row.catalogo_configuracion_funcional[0] : row.catalogo_configuracion_funcional),
      catalogo_configuracion_funcional: undefined
    }));
  },

  async getSubprestaciones(catalogoId) {
    const { data, error } = await db().from('catalogo_subprestaciones')
      .select('id,catalogo_id,grupo,subgrupo,nombre,codigo,orden')
      .eq('catalogo_id', catalogoId).eq('activo', true)
      .order('grupo').order('subgrupo').order('orden').order('nombre');
    fail(error);
    return data || [];
  },

  async getCarteraActiva(establecimientoId, periodo = new Date().getFullYear()) {
    const { data, error } = await db().from('carteras')
      .select('id,establecimiento_id,periodo,version,estado,creada_por,created_at')
      .eq('establecimiento_id', establecimientoId).eq('periodo', String(periodo))
      .in('estado', ['BORRADOR', 'OBSERVADA']).order('version', { ascending: false }).limit(1);
    fail(error);
    return data?.[0] || null;
  },

  async createCartera(establecimientoId, periodo = new Date().getFullYear()) {
    const active = await this.getCarteraActiva(establecimientoId, periodo);
    if (active) return active;

    const { data: versions, error: versionError } = await db().from('carteras')
      .select('version').eq('establecimiento_id', establecimientoId)
      .eq('periodo', String(periodo)).order('version', { ascending: false }).limit(1);
    fail(versionError);

    const { data: sessionData, error: sessionError } = await db().auth.getSession();
    fail(sessionError);
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error('Sesión SIGCAS no disponible.');

    const { data, error } = await db().from('carteras').insert({
      establecimiento_id: establecimientoId,
      periodo: String(periodo),
      version: Number(versions?.[0]?.version || 0) + 1,
      estado: 'BORRADOR',
      creada_por: userId
    }).select('id,establecimiento_id,periodo,version,estado,creada_por,created_at');
    fail(error);
    return data?.[0] || null;
  },

  async getMiCartera(carteraId) {
    const { data, error } = await db().from('cartera_items')
      .select('id,cartera_id,catalogo_id,configuracion,estado_disponibilidad,created_at,catalogo_servicios(codigo,servicio,prestacion,prestacion_homologada),cartera_item_modalidades(modalidad),cartera_item_subprestaciones(subprestacion_id)')
      .eq('cartera_id', carteraId).order('created_at');
    fail(error);
    return (data || []).map((row) => ({
      ...row,
      codigo: row.catalogo_servicios?.codigo,
      servicio: row.catalogo_servicios?.servicio,
      prestacion: row.catalogo_servicios?.prestacion_homologada || row.catalogo_servicios?.prestacion,
      modalidades: (row.cartera_item_modalidades || []).map((x) => x.modalidad),
      subprestaciones: (row.cartera_item_subprestaciones || []).map((x) => x.subprestacion_id),
      catalogo_servicios: undefined,
      cartera_item_modalidades: undefined,
      cartera_item_subprestaciones: undefined
    }));
  },

  async saveCarteraItem(carteraId, payload) {
    const p = payload || {};
    const { data, error } = await db().rpc('sigcas_save_cartera_item', {
      p_cartera_id: carteraId,
      p_catalogo_id: p.catalogo_id,
      p_estado_disponibilidad: p.estado_disponibilidad,
      p_configuracion: {
        ...(p.configuracion || {}),
        ...(p.atencion !== undefined ? { atencion: p.atencion } : {}),
        ...(p.otra_atencion !== undefined ? { otra_atencion: p.otra_atencion } : {}),
        ...(p.jornada !== undefined ? { jornada: p.jornada } : {}),
        ...(p.otra_jornada !== undefined ? { otra_jornada: p.otra_jornada } : {}),
        ...(p.capacidad !== undefined ? { capacidad: p.capacidad } : {})
      },
      p_subprestaciones: p.subprestaciones || [],
      p_modalidades: p.modalidades || []
    });
    fail(error);
    return { id: data };
  },

  async registerDocumento(payload) {
    const b = payload || {};
    const { data, error } = await db().rpc('sigcas_registrar_documento', {
      p_establecimiento_id: b.establecimiento_id,
      p_tipo: b.tipo,
      p_obligatorio: b.obligatorio !== false,
      p_archivo_path: b.archivo_path,
      p_archivo_nombre: b.archivo_nombre,
      p_archivo_mime: b.archivo_mime,
      p_archivo_tamano_bytes: b.archivo_tamano_bytes,
      p_archivo_hash_sha256: b.archivo_hash_sha256,
      p_fecha_emision: b.fecha_emision || null,
      p_fecha_vigencia: b.fecha_vigencia || null,
      p_responsable: b.responsable || null,
      p_observaciones: b.observaciones || null
    });
    fail(error);
    return { id: data };
  }
};
