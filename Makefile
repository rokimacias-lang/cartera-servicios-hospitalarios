up:
	docker compose up -d --build

logs:
	docker compose logs -f

down:
	docker compose down

status:
	docker compose ps

backup:
	docker compose exec db pg_dump -U $${POSTGRES_USER:-cartera_app} -d $${POSTGRES_DB:-cartera} --no-owner --no-privileges | gzip > backups/cartera-$$(date -u +%Y%m%dT%H%M%SZ).sql.gz
