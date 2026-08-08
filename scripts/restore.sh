#!/usr/bin/env sh
set -eu
: "${POSTGRES_DB:?POSTGRES_DB requerido}"
: "${POSTGRES_USER:?POSTGRES_USER requerido}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD requerido}"
FILE=${1:?Uso: ./scripts/restore.sh archivo.sql.gz}
gunzip -c "$FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql -h "${POSTGRES_HOST:-localhost}" -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "Restauración finalizada."
