#!/usr/bin/env bash
# One-command run: imports a clean database, seeds a TEST admin, starts PHP, runs the API E2E suite.
# Local XAMPP: just run it (MySQL root, no password).  CI: export DB_HOST / DB_USER / DB_PASS first.
# Needs: php (with mysqli), mysql client, node 22+.
set -euo pipefail
cd "$(dirname "$0")/../.."
export E2E_ADMIN_USER="${E2E_ADMIN_USER:-e2e_admin}" E2E_ADMIN_PASS="${E2E_ADMIN_PASS:-E2eAdmin#2026}"
DB_HOST="${DB_HOST:-localhost}"; DB_USER="${DB_USER:-root}"; DB_PASS="${DB_PASS:-}"
export DB_HOST DB_USER DB_PASS   # db.php reads these, and the PHP server inherits them
mysql_run() { if [ -n "$DB_PASS" ]; then MYSQL_PWD="$DB_PASS" mysql -h"$DB_HOST" -u"$DB_USER" "$@"; else mysql -h"$DB_HOST" -u"$DB_USER" "$@"; fi; }
mysql_run < database/select_cutz_db.sql
HASH=$(php -r 'echo password_hash(getenv("E2E_ADMIN_PASS"), PASSWORD_DEFAULT);')
mysql_run selectcutz -e "INSERT INTO admins (FullName,Username,Password,Role) VALUES ('E2E Admin','$E2E_ADMIN_USER','$HASH','Administrator');"
PHP_CLI_SERVER_WORKERS=8 php -S 127.0.0.1:8081 -t backend >/tmp/selectcutz-php.log 2>&1 &
PHP_PID=$!; trap 'kill $PHP_PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do curl -sf http://127.0.0.1:8081/api/health.php >/dev/null && break; sleep 0.5; done
BASE_URL=http://127.0.0.1:8081/api node tests/api/api-e2e.mjs
