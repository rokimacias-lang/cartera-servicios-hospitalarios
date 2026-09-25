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

router.get('/catalogo/configuracion-funcional', requireSigcasBearer, async (req,res,next)=>{try{
 const select='id,codigo,clasificacion,area,servicio,prestacion,prestacion_homologada,estado_homologacion,requiere_subprestacion,catalogo_configuracion_funcional!inner(requiere_atencion,opciones_atencion,permite_otra_atencion,requiere_jornada,opciones_jornada,permite_otra_jornada,permite_otros,tipo_otros,requiere_capacidad,categorias_capacidad,configuracion_especial)';
 const p=new URLSearchParams({select,activo:'eq.true','catalogo_configuracion_funcional.activo':'eq.true',order:'clasificacion.asc,servicio.asc,orden.asc'});
 const rows=await sigcasRest('catalogo_servicios?'+p.toString(),req.sigcasAccessToken);
 res.json((rows||[]).map(r=>({...r,...(Array.isArray(r.catalogo_configuracion_funcional)?r.catalogo_configuracion_funcional[0]:r.catalogo_configuracion_funcional),catalogo_configuracion_funcional:undefined})));
}catch(error){next(error);}});

router.get('/catalogo/:catalogoId/subprestaciones', requireSigcasBearer, async (req,res,next)=>{try{
 const p=new URLSearchParams({select:'id,catalogo_id,grupo,subgrupo,nombre,codigo,orden',catalogo_id:'eq.'+req.params.catalogoId,activo:'eq.true',order:'grupo.asc,subgrupo.asc,orden.asc,nombre.asc'});
 res.json(await sigcasRest('catalogo_subprestaciones?'+p.toString(),req.sigcasAccessToken));
}catch(error){next(error);}});

router.get('/carteras/:carteraId/items', requireSigcasBearer, async (req,res,next)=>{try{
 const p=new URLSearchParams({select:'id,cartera_id,catalogo_id,configuracion,estado_disponibilidad,created_at,catalogo_servicios(codigo,servicio,prestacion,prestacion_homologada),cartera_item_modalidades(modalidad),cartera_item_subprestaciones(subprestacion_id)',cartera_id:'eq.'+req.params.carteraId,order:'created_at.asc'});
 const rows=await sigcasRest('cartera_items?'+p.toString(),req.sigcasAccessToken);
 res.json((rows||[]).map(r=>({...r,codigo:r.catalogo_servicios?.codigo,servicio:r.catalogo_servicios?.servicio,prestacion:r.catalogo_servicios?.prestacion_homologada||r.catalogo_servicios?.prestacion,modalidades:(r.cartera_item_modalidades||[]).map(x=>x.modalidad),subprestaciones:(r.cartera_item_subprestaciones||[]).map(x=>x.subprestacion_id),catalogo_servicios:undefined,cartera_item_modalidades:undefined,cartera_item_subprestaciones:undefined})));
}catch(error){next(error);}});

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
