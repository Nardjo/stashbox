# Self-hosting Stashbox

Two ways to run Stashbox: **Docker Compose** (simplest) and **plain Docker** (manual).

Both give you the same artifact: an HTTP API on port 3333, backed by Postgres (pgvector) + Redis, with an enrichment worker running alongside.

## Quick start (Docker Compose)

```bash
git clone https://github.com/Nardjo/stashbox.git
cd stashbox
cp .env.example .env

# Generate a strong APP_KEY (32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste into .env as APP_KEY=...

docker compose up -d
```

The first boot builds the image (~2 min), then runs migrations automatically. Verify:

```bash
curl http://localhost:3333/
# → {"ok":true}
```

Create your first API key:

```bash
docker compose exec api node ace key:create my-laptop
# → copy the plaintext, you'll never see it again
```

Test the API:

```bash
curl -X POST http://localhost:3333/bookmarks \
  -H "Authorization: Bearer <plaintext-from-above>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Environment reference

| Variable            | Required | Default                 | Notes                                                                 |
| ------------------- | -------- | ----------------------- | --------------------------------------------------------------------- |
| `APP_KEY`           | yes      | —                       | 32+ char secret. Used for cookie/signed-URL crypto. Rotate carefully. |
| `APP_URL`           | yes      | `http://localhost:3333` | Public URL the API is reachable at.                                   |
| `LOG_LEVEL`         | no       | `info`                  | `trace`, `debug`, `info`, `warn`, `error`, `silent`.                  |
| `TZ`                | no       | `UTC`                   | Container timezone.                                                   |
| `API_PORT`          | no       | `3333`                  | Host port mapping. Container always listens on 3333.                  |
| `POSTGRES_USER`     | no       | `stashbox`              |                                                                       |
| `POSTGRES_PASSWORD` | no       | `stashbox`              | **Change for production.**                                            |
| `POSTGRES_DB`       | no       | `stashbox`              |                                                                       |
| `POSTGRES_PORT`     | no       | `5435`                  | Host port for direct psql access.                                     |
| `REDIS_PORT`        | no       | `6385`                  | Host port. Containers reach Redis on the internal network.            |

## Plain Docker (no compose)

If you'd rather wire it manually:

```bash
docker network create stashbox

docker run -d --name stashbox-postgres --network stashbox \
  -e POSTGRES_USER=stashbox -e POSTGRES_PASSWORD=stashbox -e POSTGRES_DB=stashbox \
  -v stashbox-pg-data:/var/lib/postgresql/data \
  pgvector/pgvector:pg16

docker run -d --name stashbox-redis --network stashbox \
  -v stashbox-redis-data:/data \
  redis:7-alpine

docker build -t stashbox-api -f apps/api/Dockerfile .

docker run -d --name stashbox-api --network stashbox \
  -e APP_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  -e APP_URL=http://localhost:3333 \
  -e DATABASE_URL=postgres://stashbox:stashbox@stashbox-postgres:5432/stashbox \
  -e REDIS_URL=redis://stashbox-redis:6379 \
  -p 3333:3333 \
  stashbox-api

docker run -d --name stashbox-worker --network stashbox \
  -e APP_KEY=<same-as-api> \
  -e APP_URL=http://localhost:3333 \
  -e DATABASE_URL=postgres://stashbox:stashbox@stashbox-postgres:5432/stashbox \
  -e REDIS_URL=redis://stashbox-redis:6379 \
  -e HOST=0.0.0.0 -e PORT=3333 \
  stashbox-api node ace queue:listen
```

## Backup & restore

**Backup** (with the stack running):

```bash
docker compose exec -T postgres \
  pg_dump -U stashbox -d stashbox --format=custom --no-owner \
  > stashbox-$(date +%Y%m%d-%H%M%S).dump
```

**Restore** to a clean stack:

```bash
# Stop the api/worker so nothing writes during restore
docker compose stop api worker

# Drop + recreate the database
docker compose exec -T postgres \
  psql -U stashbox -d postgres -c "DROP DATABASE stashbox; CREATE DATABASE stashbox;"

# Restore
cat stashbox-20260427-120000.dump | \
  docker compose exec -T postgres pg_restore -U stashbox -d stashbox --no-owner

# Restart the app
docker compose start api worker
```

> `pgvector` extension is provisioned on first migration (`1_enable_pgvector`). After a restore on a fresh database, run migrations once: `docker compose exec api node ace migration:run --force`.

## Upgrades

```bash
git pull
docker compose build --no-cache api
docker compose up -d
```

Migrations run automatically on container start (the `api` service entrypoint runs `node ace migration:run --force` before booting the server).

## Logs & troubleshooting

```bash
docker compose logs -f api worker
```

- **API hangs on first start** → likely waiting for postgres healthcheck. Check `docker compose logs postgres`.
- **`extension "vector" is not available`** → wrong Postgres image. Must be `pgvector/pgvector:pg16`, not vanilla `postgres:16`.
- **`401 unauthorized` on every request** → no API key created or wrong header format. Use `Authorization: Bearer <plaintext>`.
- **Bookmarks stay in `pending`** → worker container not running or can't reach Redis. Check `docker compose logs worker`.
