# SIGCAS-MSP — Control de versión v0.7.0

**Estado:** LISTA PARA REVISIÓN  
**Tipo:** Línea base de supervisión y auditoría  
**Fecha:** 2026-09-25  
**Rama:** `sigcas/v0.7.0-supervision-baseline`  
**Base:** `main`

## Objetivo

Establecer el primer punto formal de control para que cada incremento de SIGCAS-MSP pueda ser inspeccionado, aprobado o desaprobado antes de integrarse a la rama principal o promoverse a producción.

## Inventario verificado

### GitHub
- Repositorio: `rokimacias-lang/cartera-servicios-hospitalarios`.
- Rama productiva de referencia: `main`.
- El repositorio actual declara React/Vite para frontend, Express para backend y PostgreSQL en su README.
- La versión declarada actualmente en `package.json` es `1.0.0`; esta numeración pertenece al repositorio heredado y no se utilizará como numeración funcional de SIGCAS-MSP hasta completar la homologación.

### Supabase
Proyecto objetivo: `SIGCAS-MSP`.

Estado observado al iniciar v0.7.0:
- PostgreSQL 17 activo.
- 24 provincias.
- 137 establecimientos.
- 193 registros en catálogo de servicios.
- RLS habilitado en las tablas públicas inspeccionadas.
- Migraciones existentes hasta la familia funcional v0.6.6.
- Estructuras presentes para perfiles/roles, carteras, catálogo, subprestaciones, capacidad instalada, documentos, validaciones, auditoría, reglas condicionadas y propuestas al catálogo maestro.

### Vercel
- Cuenta/equipo accesible desde la integración.
- No se detectó todavía un proyecto Vercel asociado a SIGCAS-MSP.
- No se promoverá ningún despliegue a producción sin aprobación explícita.

## Hallazgos de auditoría inicial

1. Supabase Auth reporta **Leaked Password Protection** deshabilitada.
2. `documentos_gestion.cargado_por` tiene una FK sin índice de cobertura según el asesor de rendimiento.
3. Existen índices reportados como no utilizados. No se eliminarán en esta fase: la carga de uso aún es insuficiente para concluir que sean innecesarios.
4. La arquitectura documentada en el repositorio heredado (Express/PostgreSQL propio) y la infraestructura real de SIGCAS-MSP (Supabase) deben homologarse antes de desplegar el frontend como producto definitivo.
5. La versión `1.0.0` del `package.json` no coincide con la secuencia funcional SIGCAS. Se conserva sin modificación en esta línea base para evitar cambios cosméticos antes de la decisión arquitectónica.

## Criterios de aprobación de v0.7.0

Esta versión se considera aprobada cuando el supervisor confirma:
- repositorio y rama objetivo;
- proyecto Supabase objetivo;
- esquema de versionado ascendente;
- política de no promover cambios sin aprobación;
- estrategia Preview → revisión → aprobación → integración.

## Política de versiones desde este punto

Cada incremento deberá incluir:
1. número de versión SIGCAS;
2. objetivo y alcance;
3. archivos y migraciones modificados;
4. pruebas ejecutadas y resultado;
5. hallazgos de seguridad/rendimiento;
6. URL Preview cuando exista;
7. estado: EN DESARROLLO, LISTA PARA REVISIÓN, APROBADA o DESAPROBADA;
8. decisión del supervisor.

## Próximo incremento propuesto: v0.7.1

**Integración técnica controlada.**

Alcance previsto:
- homologar frontend/backend con Supabase;
- definir variables de entorno sin exponer secretos;
- corregir el índice FK confirmado;
- preparar autenticación/RBAC contra Supabase;
- preparar proyecto Preview en Vercel;
- ejecutar pruebas de conectividad, RLS y build;
- entregar URL Preview y matriz de pruebas para aprobación.

## Regla de gobierno

Ninguna versión marcada `LISTA PARA REVISIÓN` será fusionada a `main` ni promovida a producción por este flujo hasta recibir aprobación explícita del supervisor.
