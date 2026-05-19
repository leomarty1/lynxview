# install-autostart.ps1 -- cree un raccourci dans shell:startup qui lance
# lynxter-bridge.vbs au login Windows. Console cachee.
#
# Usage : npm run install:autostart
# Desinstall : npm run uninstall:autostart
#
# NOTE encoding : ce fichier reste en ASCII pur (pas d'accents) pour
# eviter les problemes de codepage Windows PowerShell 5.1 (qui interprete
# UTF-8 sans BOM en cp1252).

$ErrorActionPreference = "Stop"

$repoDir   = Split-Path -Parent $PSScriptRoot
$vbsTarget = Join-Path $repoDir "bridge\bin\lynxter-bridge.vbs"

if (-not (Test-Path $vbsTarget)) {
    Write-Error "Cible introuvable : $vbsTarget"
    exit 1
}

$startupDir = [Environment]::GetFolderPath("Startup")
$shortcut   = Join-Path $startupDir "Lynxter Bridge.lnk"

# WshShell pour creer le .lnk
$wshShell = New-Object -ComObject WScript.Shell
$link = $wshShell.CreateShortcut($shortcut)
$link.TargetPath       = "wscript.exe"
$link.Arguments        = "`"$vbsTarget`""
$link.WorkingDirectory = $repoDir
$link.WindowStyle      = 7  # minimized
$link.Description      = "Lynxter Bridge - bridge local pour piloter le plugin lynxter-support"
$link.Save()

Write-Host "[OK] Raccourci cree : $shortcut"
Write-Host "[OK] Cible          : wscript $vbsTarget"
Write-Host ""
Write-Host "Le bridge demarrera silencieusement au prochain login."
Write-Host "Pour le lancer maintenant sans rebooter :"
Write-Host "  npm run bridge"
Write-Host ""
Write-Host "Pour verifier qu'il tourne :"
Write-Host "  curl http://127.0.0.1:5174/status"
