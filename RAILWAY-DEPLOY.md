# Despliegue piloto en Railway

Esta versión 4.1 está preparada para desplegar frontend + API en un único servicio Railway y PostgreSQL como segundo servicio.

## Arquitectura

- Servicio `cartera-app`: Dockerfile.railway
- Servicio `Postgres`: PostgreSQL administrado por Railway
- La aplicación Express sirve la API `/api/*` y el frontend React desde el mismo dominio.
- Healthcheck: `/api/health`

## 1. Crear proyecto

En Railway crea un proyecto nuevo y agrega PostgreSQL desde `+ New` → `Database` → `PostgreSQL`.

## 2. Crear servicio de aplicación

Conecta el repositorio GitHub que contiene este proyecto. Railway detectará `railway.toml` y usará `Dockerfile.railway`.

## 3. Variables del servicio de aplicación

Configura estas variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
SESSION_SECRET=<secreto-largo-aleatorio>
DEFAULT_ADMIN_PASSWORD=<contraseña-inicial-segura>
DATABASE_SSL=true
TRUST_PROXY=1
COOKIE_SAMESITE=lax
DB_POOL_MAX=10
```

`CORS_ORIGIN` no es necesario porque frontend y API se sirven desde el mismo dominio. Si se separan posteriormente, puede definirse explícitamente.

## 4. Desplegar

Railway construirá el Dockerfile y levantará la aplicación en el puerto `PORT` que Railway inyecta automáticamente.

El backend ejecuta la migración al iniciar y crea las tablas/semillas si corresponde.

## 5. Dominio

En el servicio de aplicación: `Settings` → `Networking` → `Generate Domain`.

La URL pública tendrá formato `https://<nombre>.up.railway.app`.

## 6. Verificación

Abrir:

```text
https://<dominio>/api/health
```

Debe devolver JSON con `ok: true` y `db: "postgres"`.

Después abrir la raíz `/` y comprobar el inicio de sesión.

## 7. Credenciales

El administrador inicial se crea con `DEFAULT_ADMIN_PASSWORD`. Cambiar la contraseña inmediatamente después del primer acceso.

No guardar secretos en GitHub ni subir `.env`.

## 8. Prueba masiva

Antes de invitar a establecimientos:

1. Crear/provisionar usuarios hospitalarios.
2. Confirmar que cada usuario solo vea su establecimiento.
3. Probar actualización de número y tipo de cama.
4. Probar cartera de servicios.
5. Probar importación masiva.
6. Revisar auditoría.
7. Realizar pruebas concurrentes progresivas.
8. Verificar backups de PostgreSQL antes de cargar información real.
