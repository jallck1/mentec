# Script para instalar las dependencias faltantes de Angular

# Verificar si npm está instalado
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm no está instalado. Por favor, instala Node.js y npm primero."
    exit 1
}

# Navegar al directorio del proyecto GUI
Set-Location -Path $PSScriptRoot

# Instalar las dependencias faltantes
Write-Host "Instalando @angular/core..."
npm install @angular/core@16.2.0

Write-Host "Instalando @angular/router..."
npm install @angular/router@16.2.0

Write-Host "Instalando @angular/common..."
npm install @angular/common@16.2.0

Write-Host "Instalando rxjs..."
npm install rxjs@~7.8.0

Write-Host "Instalando tslib..."
npm install tslib@^2.3.0

Write-Host "Instalando zone.js..."
npm install zone.js@~0.13.0

Write-Host "Instalando typescript..."
npm install -D typescript@~5.1.3

Write-Host "Instalando @types/node..."
npm install -D @types/node

Write-Host "Instalación completada."

# Mostrar mensaje de finalización
Write-Host "Por favor, reinicia tu IDE para que los cambios surtan efecto." -ForegroundColor Green
