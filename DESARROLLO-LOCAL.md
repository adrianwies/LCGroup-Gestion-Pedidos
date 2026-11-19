# Desarrollo local

Este entorno utiliza únicamente la base Docker `APLICACION_CONTA_DESARROLLO`. No contiene conexiones a MonsterASP.NET ni a producción.

## Requisitos

- Docker Desktop con Docker Compose.
- Puertos libres: `5183` (React), `5093` (API) y `14336` (SQL Server).

## Primer inicio

1. Copia `.env.local.example` como `.env.local`.
2. Cambia `LOCAL_DB_PASSWORD` por una contraseña local robusta.
3. Desde PowerShell ejecuta:

   `powershell -ExecutionPolicy Bypass -File .\scripts\iniciar-local.ps1`

4. Abre `http://localhost:5183`.

El contenedor `db-init` crea la base, aplica `demo-schema.sql`, la migración de notificaciones y `demo-seed.sql`. Todos son incrementales o idempotentes. El volumen conserva los datos entre reinicios.

## Detener

`powershell -ExecutionPolicy Bypass -File .\scripts\detener-local.ps1`

El comando conserva el volumen SQL. Para reinicializar deliberadamente los datos de desarrollo, detén el entorno y elimina exclusivamente el volumen `aplicacion-conta-desarrollo_aplicacion-conta-desarrollo-data`.

## Direcciones

- Aplicación React: `http://localhost:5183`
- API ASP.NET Core: `http://localhost:5093`
- SQL Server: `localhost,14336`

React usa Vite con recarga automática. La API usa `dotnet watch`. `/api`, cookies y SSE pasan por el proxy de Vite para conservar el mismo origen durante el desarrollo.

## Cuentas ficticias

Consulta `database/CUENTAS-DEMO.md`. Las contraseñas documentadas corresponden únicamente a los hashes ficticios del seed local.

## Web Push local

Las claves VAPID no se incluyen. Para probar Web Push, genera un par exclusivo de desarrollo y colócalo solamente en `.env.local`. Las notificaciones internas y SSE funcionan sin esas claves.
