# Self-hosting StashIt

Two ways to run StashIt: **Docker Compose** (simplest) and **plain Docker** (manual).

Both give you the same artifact: an HTTP API on port 3333, backed by Postgres (pgvector) + Redis, with an enrichment worker running alongside.

## Quick start (Docker Compose)

```bash
git clone https://github.com/Nardjo/stashit.git
cd stashit
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
| `POSTGRES_USER`     | no       | `stashit`               |                                                                       |
| `POSTGRES_PASSWORD` | no       | `stashit`               | **Change for production.**                                            |
| `POSTGRES_DB`       | no       | `stashit`               |                                                                       |
| `POSTGRES_PORT`     | no       | `5435`                  | Host port for direct psql access.                                     |
| `REDIS_PORT`        | no       | `6385`                  | Host port. Containers reach Redis on the internal network.            |

## Plain Docker (no compose)

If you'd rather wire it manually:

```bash
docker network create stashit

docker run -d --name stashit-postgres --network stashit \
  -e POSTGRES_USER=stashit -e POSTGRES_PASSWORD=stashit -e POSTGRES_DB=stashit \
  -v stashit-pg-data:/var/lib/postgresql/data \
  pgvector/pgvector:pg16

docker run -d --name stashit-redis --network stashit \
  -v stashit-redis-data:/data \
  redis:7-alpine

docker build -t stashit-api -f apps/api/Dockerfile .

docker run -d --name stashit-api --network stashit \
  -e APP_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  -e APP_URL=http://localhost:3333 \
  -e DATABASE_URL=postgres://stashit:stashit@stashit-postgres:5432/stashit \
  -e REDIS_URL=redis://stashit-redis:6379 \
  -p 3333:3333 \
  stashit-api

docker run -d --name stashit-worker --network stashit \
  -e APP_KEY=<same-as-api> \
  -e APP_URL=http://localhost:3333 \
  -e DATABASE_URL=postgres://stashit:stashit@stashit-postgres:5432/stashit \
  -e REDIS_URL=redis://stashit-redis:6379 \
  -e HOST=0.0.0.0 -e PORT=3333 \
  stashit-api node ace queue:listen
```

## Backup & restore

**Backup** (with the stack running):

```bash
docker compose exec -T postgres \
  pg_dump -U stashit -d stashit --format=custom --no-owner \
  > stashit-$(date +%Y%m%d-%H%M%S).dump
```

**Restore** to a clean stack:

```bash
# Stop the api/worker so nothing writes during restore
docker compose stop api worker

# Drop + recreate the database
docker compose exec -T postgres \
  psql -U stashit -d postgres -c "DROP DATABASE stashit; CREATE DATABASE stashit;"

# Restore
cat stashit-20260427-120000.dump | \
  docker compose exec -T postgres pg_restore -U stashit -d stashit --no-owner

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
