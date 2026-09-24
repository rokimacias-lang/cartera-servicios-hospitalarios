import express from 'express';
import pg from 'pg';

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


export default router;
