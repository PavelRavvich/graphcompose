#!/usr/bin/env bash
# Local Langfuse for tracing (Wiki → Tracing). Data stays on this machine.
#   scripts/langfuse.sh up      — download compose, secure it, start, write keys to .env
#   scripts/langfuse.sh down    — stop (data kept in Docker volumes)
#   scripts/langfuse.sh status  — containers and health
# LANGFUSE_DIR (default ~/langfuse) holds docker-compose.yml and its generated secrets.
set -euo pipefail
DIR="${LANGFUSE_DIR:-$HOME/langfuse}"
PROJECT_ENV="$(cd "$(dirname "$0")/.." && pwd)/.env"
COMPOSE_URL="https://raw.githubusercontent.com/langfuse/langfuse/main/docker-compose.yml"
PROJECT="$(basename "$(dirname "$PROJECT_ENV")")"

rand() { openssl rand -hex "$1"; }

write_secrets() {
  local pg minio
  pg=$(rand 16); minio=$(rand 16)
  cat > "$DIR/.env" <<ENV
# Local Langfuse — generated $(date +%F). Keep private.
SALT=$(rand 16)
ENCRYPTION_KEY=$(rand 32)
NEXTAUTH_SECRET=$(rand 32)
NEXTAUTH_URL=http://localhost:3000
POSTGRES_PASSWORD=$pg
DATABASE_URL=postgresql://postgres:$pg@postgres:5432/postgres
CLICKHOUSE_PASSWORD=$(rand 16)
MINIO_ROOT_PASSWORD=$minio
LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY=$minio
LANGFUSE_S3_MEDIA_UPLOAD_SECRET_ACCESS_KEY=$minio
LANGFUSE_S3_BATCH_EXPORT_SECRET_ACCESS_KEY=$minio
REDIS_AUTH=$(rand 16)
TELEMETRY_ENABLED=false
LANGFUSE_INIT_ORG_ID=local
LANGFUSE_INIT_ORG_NAME=Local
LANGFUSE_INIT_PROJECT_ID=$PROJECT
LANGFUSE_INIT_PROJECT_NAME=$PROJECT
LANGFUSE_INIT_PROJECT_PUBLIC_KEY=pk-lf-$(rand 16)
LANGFUSE_INIT_PROJECT_SECRET_KEY=sk-lf-$(rand 24)
LANGFUSE_INIT_USER_EMAIL=${LANGFUSE_USER_EMAIL:-admin@localhost.local}
LANGFUSE_INIT_USER_NAME=admin
LANGFUSE_INIT_USER_PASSWORD=$(rand 12)
ENV
  chmod 600 "$DIR/.env"
}

prepare() {
  mkdir -p "$DIR"
  if [[ ! -f "$DIR/docker-compose.yml" ]]; then
    curl -fsSL -o "$DIR/docker-compose.yml" "$COMPOSE_URL"
  fi
  # Only this machine may reach the UI and MinIO (upstream binds them to all interfaces).
  sed -i.bak 's/^      - 3000:3000/      - 127.0.0.1:3000:3000/; s/^      - 9090:9000/      - 127.0.0.1:9090:9000/' "$DIR/docker-compose.yml"
  rm -f "$DIR/docker-compose.yml.bak"
  [[ -f "$DIR/.env" ]] || write_secrets
}

wait_healthy() {
  for _ in $(seq 1 60); do
    curl -fs -m 3 http://localhost:3000/api/public/health >/dev/null 2>&1 && return 0
    sleep 3
  done
  echo "Langfuse did not become healthy — see: docker compose -f $DIR/docker-compose.yml logs langfuse-web" >&2
  return 1
}

write_project_keys() {
  grep -q '^LANGFUSE_PUBLIC_KEY=' "$PROJECT_ENV" 2>/dev/null && return 0
  local pk sk
  pk=$(grep '^LANGFUSE_INIT_PROJECT_PUBLIC_KEY=' "$DIR/.env" | cut -d= -f2-)
  sk=$(grep '^LANGFUSE_INIT_PROJECT_SECRET_KEY=' "$DIR/.env" | cut -d= -f2-)
  printf '\n# Local Langfuse tracing (scripts/langfuse.sh)\nLANGFUSE_PUBLIC_KEY=%s\nLANGFUSE_SECRET_KEY=%s\nLANGFUSE_BASE_URL=http://localhost:3000\nLANGFUSE_PROJECT_ID=%s\n' "$pk" "$sk" "$PROJECT" >> "$PROJECT_ENV"
  echo "Keys written to $PROJECT_ENV"
}

case "${1:-}" in
  up)
    prepare
    docker compose -f "$DIR/docker-compose.yml" --env-file "$DIR/.env" up -d
    wait_healthy
    write_project_keys
    echo "Langfuse: http://localhost:3000 — login $(grep '^LANGFUSE_INIT_USER_EMAIL=' "$DIR/.env" | cut -d= -f2-), password in $DIR/.env (LANGFUSE_INIT_USER_PASSWORD)"
    ;;
  down) docker compose -f "$DIR/docker-compose.yml" --env-file "$DIR/.env" down ;;
  status)
    docker compose -f "$DIR/docker-compose.yml" --env-file "$DIR/.env" ps --format '{{.Service}} {{.State}}'
    curl -fs -m 3 http://localhost:3000/api/public/health && echo
    ;;
  *) echo "usage: $0 up|down|status" >&2; exit 1 ;;
esac
