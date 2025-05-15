# Script para instalar dependencias con permisos adecuados

# Configurar la política de ejecución para la sesión actual
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# Navegar al directorio del proyecto
Set-Location -Path $PSScriptRoot

# Limpiar la caché de npm
Write-Host "Limpiando caché de npm..." -ForegroundColor Yellow
npm cache clean --force

# Eliminar node_modules y package-lock.json si existen
if (Test-Path "node_modules") {
    Write-Host "Eliminando node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules
}

if (Test-Path "package-lock.json") {
    Write-Host "Eliminando package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force package-lock.json
}

# Instalar dependencias con permisos de administrador
Write-Host "Instalando dependencias..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "install --legacy-peer-deps" -Verb RunAs -Wait

# Verificar la instalación
Write-Host "Verificando la instalación..." -ForegroundColor Yellow
npm list @angular/core @angular/common @angular/router

# Mensaje de finalización
Write-Host "Proceso completado. Por favor, verifica que no hay errores en la instalación." -ForegroundColor Green
Write-Host "Si hay errores, intenta ejecutar manualmente: npm install --legacy-peer-deps" -ForegroundColor Yellow
