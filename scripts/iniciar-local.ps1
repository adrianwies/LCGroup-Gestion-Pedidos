$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
if (-not (Test-Path .env.local)) { throw "Falta .env.local. Copia .env.local.example y define LOCAL_DB_PASSWORD." }
docker compose --env-file .env.local -f compose.local.yaml up --build -d
docker compose --env-file .env.local -f compose.local.yaml ps
Write-Host "Aplicación: http://localhost:5183"
Write-Host "API:        http://localhost:5093"
