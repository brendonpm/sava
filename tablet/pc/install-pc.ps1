# Instala a parte do PC em %USERPROFILE%\SavaTablet (caminho sem acentos):
#  - sava-hook.sh (hooks do Claude Code), sava-agent.ps1 (agente) e sava-tray.ps1 (ícone na bandeja)
#  - tarefa agendada "sava-tablet": abre o ícone da bandeja no login, e ele cuida do agente
#  - inicia tudo agora
# Para desinstalar: .\install-pc.ps1 -Uninstall
param([switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:USERPROFILE 'SavaTablet'
$taskName = 'sava-tablet'
$oldLnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Sava Tablet.lnk'

# Para o que estiver rodando (bandeja e agente) e remove o atalho da versão anterior.
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue }
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object { $_.CommandLine -match 'sava-(agent|tray)\.ps1' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Remove-Item $oldLnk -ErrorAction SilentlyContinue

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  foreach ($f in 'sava-agent.ps1', 'sava-tray.ps1', 'icon.png') { Remove-Item (Join-Path $dir $f) -ErrorAction SilentlyContinue }
  'Sava Tablet removida do PC (tarefa, bandeja e agente). Os hooks do Claude Code continuam em ~/.claude/settings.json.'
  return
}

New-Item -ItemType Directory -Force $dir | Out-Null
foreach ($f in 'sava-hook.sh', 'sava-agent.ps1', 'sava-tray.ps1') { Copy-Item (Join-Path $PSScriptRoot $f) $dir -Force }
Copy-Item (Join-Path $PSScriptRoot '..\..\assets\icons\icon128.png') (Join-Path $dir 'icon.png') -Force

$ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$action = New-ScheduledTaskAction -Execute $ps `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $dir 'sava-tray.ps1')`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$trigger.Delay = 'PT15S'  # deixa o Windows terminar de subir a sessão
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
  -Description 'Sava Tablet: ícone na bandeja e agente (túnel USB, CPU/RAM, notificações e música para a Sava no tablet)' -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
"Instalado em $dir; tarefa '$taskName' criada (inicia no login) e iniciada agora."
