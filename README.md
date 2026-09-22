# Cartera de Servicios Hospitalarios — Etapa 3

Versión orientada a producción: React/Vite + Nginx + Express + PostgreSQL + sesiones persistentes.

> La evaluación de la línea base y los bloqueadores que deben resolverse antes de SIGCAS-MSP v0.4 están documentados en [`docs/diagnostico-tecnico-v0.4.md`](docs/diagnostico-tecnico-v0.4.md).
> Los controles de separación de secretos, artefactos y ambientes aplicados para v0.4 se detallan en [`docs/aislamiento-seguro-v0.4.md`](docs/aislamiento-seguro-v0.4.md).
> La arquitectura objetivo, límites de módulos, modelo de datos y plan evolutivo están definidos en [`docs/diseno-arquitectonico-v0.4.md`](docs/diseno-arquitectonico-v0.4.md).

## 1. Requisitos
- Docker Desktop / Docker Engine + Compose
- Un servidor con HTTPS para producción

## 2. Configuración
Copie `.env.example` como `.env` y cambie como mínimo:
- POSTGRES_PASSWORD
- SESSION_SECRET
- DEFAULT_ADMIN_PASSWORD

Los archivos `.env` están excluidos de Git y de los contextos Docker. No elimine los marcadores de la plantilla sin reemplazarlos por secretos generados para el ambiente correspondiente.

Genere un secreto con:
`openssl rand -hex 32`

## 3. Arranque
`docker compose up -d --build`

La aplicación queda disponible en:
`http://localhost`

El backend realiza automáticamente la creación de tablas y la carga inicial del catálogo y establecimientos incluidos en esta versión.

## 4. Credenciales
El usuario inicial es `admin`. La contraseña se toma de `DEFAULT_ADMIN_PASSWORD` durante el primer arranque.
Cambie la contraseña inmediatamente desde la aplicación antes de producción.

## 5. Backup
El script `scripts/backup.sh` usa `pg_dump`. En el host con PostgreSQL client instalado:
`POSTGRES_HOST=localhost POSTGRES_DB=cartera POSTGRES_USER=cartera_app POSTGRES_PASSWORD=secreto ./scripts/backup.sh`

Para producción se recomienda programarlo con cron y copiar los archivos a almacenamiento externo.

## 6. Seguridad antes de publicar
- Colocar un proxy HTTPS (Caddy, Traefik o Nginx) delante del servicio.
- Usar una contraseña PostgreSQL aleatoria y larga.
- Usar SESSION_SECRET aleatorio y largo.
- No publicar el puerto 5432.
- Mantener Docker y dependencias actualizados.
- Configurar backups automáticos y probar restauraciones.
- Revisar CORS_ORIGIN para el dominio real.

## 7. Arquitectura
Navegador → Nginx → API Express → PostgreSQL

Las sesiones se almacenan en PostgreSQL mediante `connect-pg-simple`, evitando la memoria del proceso como almacenamiento de sesión.
