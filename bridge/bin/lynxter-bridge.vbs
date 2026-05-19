' lynxter-bridge.vbs — lance node bridge/src/index.js en console cachée
' Appelé par le raccourci dans shell:startup (créé par install-autostart.ps1).
' Pas de console visible : Run(..., 0, False) = window hidden, do not wait.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Le repo lynxview est à côté de ce fichier : ..\..\
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
bridgeDir = fso.GetParentFolderName(scriptDir)
repoDir   = fso.GetParentFolderName(bridgeDir)

' cmd /c cd "<repo>" && npm run bridge — passé par cmd pour résoudre npm.cmd
cmdLine = "cmd /c cd /d """ & repoDir & """ && npm run bridge >> """ & repoDir & "\bridge\bridge.log"" 2>&1"
WshShell.Run cmdLine, 0, False
