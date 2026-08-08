# Cartera de Servicios Hospitalarios — Etapa 3

Versión orientada a producción: React/Vite + Nginx + Express + PostgreSQL + sesiones persistentes.

## 1. Requisitos
- Docker Desktop / Docker Engine + Compose
- Un servidor con HTTPS para producción

## 2. Configuración
Copie `.env.example` como `.env` y cambie como mínimo:
- POSTGRES_PASSWORD
- SESSION_SECRET
- DEFAULT_ADMIN_PASSWORD

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
