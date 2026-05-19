# uninstall-autostart.ps1 — supprime le raccourci shell:startup.

$ErrorActionPreference = "Stop"

$startupDir = [Environment]::GetFolderPath("Startup")
$shortcut   = Join-Path $startupDir "Lynxter Bridge.lnk"

if (Test-Path $shortcut) {
    Remove-Item $shortcut -Force
    Write-Host "[OK] Raccourci supprimé : $shortcut"
} else {
    Write-Host "[INFO] Aucun raccourci à supprimer."
}

Write-Host ""
Write-Host "Le bridge ne démarrera plus automatiquement au login."
Write-Host "Pour killer un bridge déjà en cours :"
Write-Host "  Get-Process node | Where-Object {`$_.Path -like '*node*'} | Stop-Process"
Write-Host "(ou via Gestionnaire des tâches → cherche node.exe lynxter-bridge)"
