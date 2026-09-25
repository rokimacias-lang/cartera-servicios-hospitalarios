import express from 'express';
import pg from 'pg';
import { requireSigcasBearer, sigcasRest } from './sigcas-auth.js';

const { Pool } = pg;
const router = express.Router();

const connectionString = process.env.SIGCAS_DATABASE_URL;
const sigcasPool = connectionString ? new Pool({
  connectionString,
  max: Number(process.env.SIGCAS_DB_POOL_MAX || 5),
  ssl: process.env.SIGCAS_DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
}) : null;

const requireSigcas = (req, res, next) => {
  if (!sigcasPool) return res.status(503).json({ error: 'SIGCAS_DATABASE_URL no configurada' });
  next();
};

router.use(requireSigcas);

router.get('/catalogo/configuracion-funcional', async (_req, res, next) => {
  try {
    const { rows } = await sigcasPool.query(`
      select
        cs.id, cs.codigo, cs.clasificacion, cs.area, cs.servicio,
        cs.prestacion, cs.prestacion_homologada, cs.estado_homologacion,
        cs.requiere_subprestacion,
        cf.requiere_atencion, cf.opciones_atencion, cf.permite_otra_atencion,
        cf.requiere_jornada, cf.opciones_jornada, cf.permite_otra_jornada,
        cf.permite_otros, cf.tipo_otros, cf.requiere_capacidad,
        cf.categorias_capacidad, cf.configuracion_especial
      from public.catalogo_servicios cs
      join public.catalogo_configuracion_funcional cf on cf.catalogo_id = cs.id
      where cs.activo = true and cf.activo = true
      order by cs.clasificacion, cs.servicio, coalesce(cs.prestacion_homologada, cs.prestacion), cs.orden nulls last
    `);
    res.json(rows);
  } catch (error) { next(error); }
});

router.get('/catalogo/:catalogoId/subprestaciones', async (req, res, next) => {
  try {
    const { rows } = await sigcasPool.query(`
      select id, catalogo_id, grupo, subgrupo, nombre, codigo, orden
      from public.catalogo_subprestaciones
      where catalogo_id = $1 and activo = true
      order by grupo nulls first, subgrupo nulls first, orden nulls last, nombre
    `, [req.params.catalogoId]);
    res.json(rows);
  } catch (error) { next(error); }
});

router.get('/carteras/:carteraId/items', async (req, res, next) => {
  try {
    const { rows } = await sigcasPool.query(`
      select ci.*, cs.codigo, cs.servicio, coalesce(cs.prestacion_homologada, cs.prestacion) prestacion,
        coalesce(jsonb_agg(distinct cim.modalidad) filter (where cim.id is not null), '[]'::jsonb) modalidades,
        coalesce(jsonb_agg(distinct cis.subprestacion_id) filter (where cis.id is not null), '[]'::jsonb) subprestaciones
      from public.cartera_items ci
      left join public.catalogo_servicios cs on cs.id=ci.catalogo_id
      left join public.cartera_item_modalidades cim on cim.cartera_item_id=ci.id
      left join public.cartera_item_subprestaciones cis on cis.cartera_item_id=ci.id
      where ci.cartera_id=$1
      group by ci.id,cs.codigo,cs.servicio,cs.prestacion_homologada,cs.prestacion
      order by ci.created_at
    `, [req.params.carteraId]);
    res.json(rows);
  } catch (error) { next(error); }
});


router.get('/establecimientos/:establecimientoId/cartera-activa', requireSigcasBearer, async (req,res,next)=>{try{
 const p=new URLSearchParams({select:'id,establecimiento_id,periodo,version,estado,creada_por,created_at',establecimiento_id:'eq.'+req.params.establecimientoId,periodo:'eq.'+(req.query.periodo||new Date().getFullYear()),estado:'in.(BORRADOR,OBSERVADA)',order:'version.desc',limit:'1'});
 const rows=await sigcasRest('carteras?'+p.toString(),req.sigcasAccessToken);
 res.json(rows?.[0]||null);
}catch(error){next(error);}});

router.post('/establecimientos/:establecimientoId/carteras', requireSigcasBearer, async (req,res,next)=>{try{
 const establecimientoId=req.params.establecimientoId; const periodo=String(req.body?.periodo||new Date().getFullYear()).trim();
 const existingParams=new URLSearchParams({select:'id,establecimiento_id,periodo,version,estado,creada_por,created_at',establecimiento_id:'eq.'+establecimientoId,periodo:'eq.'+periodo,estado:'in.(BORRADOR,OBSERVADA)',order:'version.desc',limit:'1'});
 const existing=await sigcasRest('carteras?'+existingParams.toString(),req.sigcasAccessToken);
 if(existing?.[0]) return res.status(200).json(existing[0]);
 const versionParams=new URLSearchParams({select:'version',establecimiento_id:'eq.'+establecimientoId,periodo:'eq.'+periodo,order:'version.desc',limit:'1'});
 const versions=await sigcasRest('carteras?'+versionParams.toString(),req.sigcasAccessToken);
 const version=Number(versions?.[0]?.version||0)+1;
 const created=await sigcasRest('carteras',req.sigcasAccessToken,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({establecimiento_id:establecimientoId,periodo,version,estado:'BORRADOR',creada_por:req.sigcasUserId})});
 res.status(201).json(created?.[0]||null);
}catch(error){next(error);}});

router.post('/carteras/:carteraId/items', requireSigcasBearer, async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await sigcasRest('rpc/sigcas_save_cartera_item', req.sigcasAccessToken, {
      method: 'POST',
      body: JSON.stringify({
        p_cartera_id: req.params.carteraId,
        p_catalogo_id: b.catalogo_id,
        p_estado_disponibilidad: b.estado_disponibilidad,
        p_configuracion: b.configuracion || {},
        p_subprestaciones: b.subprestaciones || [],
        p_modalidades: b.modalidades || []
      })
    });
    res.status(200).json({ id: result });
  } catch (error) { next(error); }
});

router.post('/documentos', requireSigcasBearer, async (req,res,next)=>{try{const b=req.body||{};const result=await sigcasRest('rpc/sigcas_registrar_documento',req.sigcasAccessToken,{method:'POST',body:JSON.stringify({p_establecimiento_id:b.establecimiento_id,p_tipo:b.tipo,p_obligatorio:b.obligatorio!==false,p_archivo_path:b.archivo_path,p_archivo_nombre:b.archivo_nombre,p_archivo_mime:b.archivo_mime,p_archivo_tamano_bytes:b.archivo_tamano_bytes,p_archivo_hash_sha256:b.archivo_hash_sha256,p_fecha_emision:b.fecha_emision||null,p_fecha_vigencia:b.fecha_vigencia||null,p_responsable:b.responsable||null,p_observaciones:b.observaciones||null})});res.status(201).json({id:result});}catch(error){next(error);}});

export default router;
