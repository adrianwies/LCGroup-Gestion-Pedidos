$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
docker compose --env-file .env.local -f compose.local.yaml down
