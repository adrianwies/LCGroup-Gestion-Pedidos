#!/usr/bin/env bash
set -euo pipefail
SQLCMD=/opt/mssql-tools18/bin/sqlcmd
SERVER=db
DATABASE=APLICACION_CONTA_DESARROLLO
"$SQLCMD" -S "$SERVER" -U sa -P "$LOCAL_DB_PASSWORD" -C -b -d master -Q "IF DB_ID(N'$DATABASE') IS NULL CREATE DATABASE [$DATABASE];"
for script in /database/demo-schema.sql /database/2026-11-18-notifications.sql /database/2026-11-19-order-units.sql /database/2026-11-20-stock-perseo-total.sql /database/2026-11-21-stock-current-catalog.sql /database/demo-seed.sql /database/2026-11-22-fulfillment.sql /database/2026-11-23-fulfillment-notifications.sql; do
  echo "Aplicando $(basename "$script")..."
  "$SQLCMD" -S "$SERVER" -U sa -P "$LOCAL_DB_PASSWORD" -C -b -d "$DATABASE" -i "$script"
done
echo "Base local $DATABASE preparada correctamente."
