#!/usr/bin/env bash
# Creates the owner and app roles and the dev/test databases on a local Postgres.
# Usage: PGSUPER=postgres://postgres@localhost:5432/postgres scripts/dev-db.sh
set -euo pipefail
SUPER="${PGSUPER:-postgres://postgres@localhost:5432/postgres}"
psql "$SUPER" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fc_owner') THEN CREATE ROLE fc_owner LOGIN PASSWORD 'fc_owner_dev'; END IF;
  ALTER ROLE fc_owner BYPASSRLS; -- owner runs migrations and SECURITY DEFINER entry points only
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fc_app') THEN CREATE ROLE fc_app LOGIN PASSWORD 'fc_app_dev' NOBYPASSRLS; END IF;
END $$;
SQL
for db in fc_dev fc_test; do
  if ! psql "$SUPER" -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
    psql "$SUPER" -v ON_ERROR_STOP=1 -c "CREATE DATABASE $db OWNER fc_owner"
  fi
  psql "${SUPER%/*}/$db" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto" -c "REVOKE CREATE ON SCHEMA public FROM PUBLIC" -c "ALTER SCHEMA public OWNER TO fc_owner"
done
echo "Roles fc_owner, fc_app and databases fc_dev, fc_test are ready."
