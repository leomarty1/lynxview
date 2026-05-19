# install-autostart.ps1 — crée un raccourci dans shell:startup qui lance
# lynxter-bridge.vbs au login Windows. Console cachée.
#
# Usage : npm run install:autostart
# Désinstall : npm run uninstall:autostart

$ErrorActionPreference = "Stop"

$repoDir   = Split-Path -Parent $PSScriptRoot
$vbsTarget = Join-Path $repoDir "bridge\bin\lynxter-bridge.vbs"

if (-not (Test-Path $vbsTarget)) {
    Write-Error "Cible introuvable : $vbsTarget"
    exit 1
}

$startupDir = [Environment]::GetFolderPath("Startup")
$shortcut   = Join-Path $startupDir "Lynxter Bridge.lnk"

# WshShell pour créer le .lnk
$wshShell = New-Object -ComObject WScript.Shell
$link = $wshShell.CreateShortcut($shortcut)
$link.TargetPath       = "wscript.exe"
$link.Arguments        = "`"$vbsTarget`""
$link.WorkingDirectory = $repoDir
$link.WindowStyle      = 7  # minimized (mais wscript ouvre déjà caché via Run 0)
$link.Description      = "Lynxter Bridge — bridge local pour piloter le plugin lynxter-support"
$link.Save()

Write-Host "[OK] Raccourci créé : $shortcut"
Write-Host "[OK] Cible           : wscript $vbsTarget"
Write-Host ""
Write-Host "Le bridge démarrera silencieusement au prochain login."
Write-Host "Pour le lancer maintenant sans rebooter :"
Write-Host "  npm run bridge"
Write-Host ""
Write-Host "Pour vérifier qu'il tourne :"
Write-Host "  curl http://127.0.0.1:5174/status"
