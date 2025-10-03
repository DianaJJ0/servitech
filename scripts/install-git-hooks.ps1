# PowerShell script to install git hooks by configuring core.hooksPath to .githooks
# Run from repository root in PowerShell (Windows)

# Determine repository root: script is in <repo>/scripts/, so parent of script's folder is repo root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

Write-Host "Instalando hooks de git en: $repoRoot\.githooks"

if (-Not (Test-Path -Path "$repoRoot\.githooks")) {
    Write-Host ".githooks no existe. Creando..."
    New-Item -ItemType Directory -Path "$repoRoot\.githooks" | Out-Null
}

# Hook file we expect
$hookFile = Join-Path $repoRoot ".githooks\prepare-commit-msg"
if (-Not (Test-Path -Path $hookFile)) {
    Write-Host "Archivo de hook no encontrado: $hookFile"
    exit 1
}

# Configure git to use .githooks
git config core.hooksPath ".githooks"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al ejecutar 'git config'. Asegúrate de tener git en PATH." -ForegroundColor Red
    exit 1
}

Write-Host "Hooks instalados. Ahora los commits usarán mensajes prefijados en español." -ForegroundColor Green
Write-Host "Prueba: git status --porcelain; git add .; git commit"