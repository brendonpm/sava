# Sava Tablet na bandeja do Windows.
# Inicia o agente (sava-agent.ps1) como processo filho, reinicia sozinho se ele cair e mostra
# um ícone na bandeja com o estado e as opções Parar / Iniciar / Reiniciar / Abrir no tablet / Sair.
# Iniciado no login pela tarefa agendada "sava-tablet" (ver install-pc.ps1).
$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing

$dir = Join-Path $env:USERPROFILE 'SavaTablet'
$agentPath = Join-Path $dir 'sava-agent.ps1'
$logFile = Join-Path $dir 'agent.log'
$ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

function Write-Log([string]$msg) {
  try { Add-Content -Path $logFile -Value ("{0:yyyy-MM-dd HH:mm:ss}  [bandeja] {1}" -f (Get-Date), $msg) -Encoding UTF8 } catch {}
}

# Uma instância só.
$mutex = New-Object System.Threading.Mutex($false, 'Local\SavaTabletTray')
$owned = $false
try { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }
if (-not $owned) { return }

# ---------------------------------------------------------------- adb (para "Abrir no tablet")
function Find-Adb {
  foreach ($p in @($env:SAVA_ADB,
      (Get-Command adb -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source),
      (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'),
      'C:\Program Files (x86)\Touch Portal\plugins\adb\platform-tools\adb.exe')) {
    if ($p -and (Test-Path $p)) { return $p }
  }
}

# ---------------------------------------------------------------- agente
$script:agent = $null
$script:wanted = $true       # o usuário quer o servidor rodando?
$script:restarts = @()       # horários de reinícios automáticos (para não entrar em loop)

function Stop-StrayAgents {
  # Agentes antigos (do atalho de inicialização da versão anterior, ou órfãos).
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
    Where-Object { $_.CommandLine -match 'sava-agent\.ps1' -and (-not $script:agent -or $_.ProcessId -ne $script:agent.Id) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Start-Agent {
  if ($script:agent -and -not $script:agent.HasExited) { return }
  Stop-StrayAgents
  $psi = New-Object System.Diagnostics.ProcessStartInfo($ps, "-NoProfile -ExecutionPolicy Bypass -File `"$agentPath`"")
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $script:agent = [System.Diagnostics.Process]::Start($psi)
  Write-Log "servidor iniciado (pid $($script:agent.Id))"
}

function Stop-Agent {
  if ($script:agent -and -not $script:agent.HasExited) {
    try { $script:agent.Kill(); $script:agent.WaitForExit(3000) | Out-Null } catch {}
  }
  $script:agent = $null
  Stop-StrayAgents
  Write-Log 'servidor parado'
}

function Test-Tablet {
  try {
    $req = [System.Net.WebRequest]::Create('http://127.0.0.1:47800/ping')
    $req.Proxy = $null
    $req.Timeout = 800
    $r = $req.GetResponse(); $r.Close()
    return $true
  } catch { return $false }
}

# ---------------------------------------------------------------- ícone
$iconPng = Join-Path $dir 'icon.png'
$bmp = if (Test-Path $iconPng) { New-Object System.Drawing.Bitmap($iconPng) } else { [System.Drawing.SystemIcons]::Application.ToBitmap() }
function New-IconFrom($src, [bool]$gray) {
  $b = New-Object System.Drawing.Bitmap(32, 32)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'HighQualityBicubic'
  if ($gray) {
    $cm = New-Object System.Drawing.Imaging.ColorMatrix(, [single[][]]@(
        [single[]]@(.3, .3, .3, 0, 0), [single[]]@(.59, .59, .59, 0, 0), [single[]]@(.11, .11, .11, 0, 0),
        [single[]]@(0, 0, 0, .6, 0), [single[]]@(0, 0, 0, 0, 1)))
    $ia = New-Object System.Drawing.Imaging.ImageAttributes
    $ia.SetColorMatrix($cm)
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, 32, 32)), 0, 0, $src.Width, $src.Height, 'Pixel', $ia)
  } else {
    $g.DrawImage($src, 0, 0, 32, 32)
  }
  $g.Dispose()
  return [System.Drawing.Icon]::FromHandle($b.GetHicon())
}
$iconOn = New-IconFrom $bmp $false
$iconOff = New-IconFrom $bmp $true

$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = $iconOff
$tray.Text = 'Sava Tablet'
$tray.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$miStatus = $menu.Items.Add('Sava Tablet')
$miStatus.Enabled = $false
$menu.Items.Add('-') | Out-Null
$miToggle = $menu.Items.Add('Parar servidor')
$miRestart = $menu.Items.Add('Reiniciar servidor')
$miOpen = $menu.Items.Add('Abrir a Sava no tablet')
$miLog = $menu.Items.Add('Ver registro (log)')
$menu.Items.Add('-') | Out-Null
$miExit = $menu.Items.Add('Sair (para o servidor)')
$tray.ContextMenuStrip = $menu

function Update-Status {
  $running = $script:agent -and -not $script:agent.HasExited
  $online = $running -and (Test-Tablet)
  if (-not $running) { $txt = 'Servidor parado' }
  elseif ($online) { $txt = 'Rodando · tablet conectado' }
  else { $txt = 'Rodando · tablet não encontrado' }
  $miStatus.Text = $txt
  $tray.Text = "Sava Tablet: $txt"
  $tray.Icon = if ($online) { $iconOn } else { $iconOff }
  $miToggle.Text = if ($script:wanted) { 'Parar servidor' } else { 'Iniciar servidor' }
  $miRestart.Enabled = $script:wanted
}

$miToggle.add_Click({
  if ($script:wanted) { $script:wanted = $false; Stop-Agent }
  else { $script:wanted = $true; Start-Agent }
  Update-Status
})
$miRestart.add_Click({
  Stop-Agent; Start-Agent
  $tray.ShowBalloonTip(2000, 'Sava Tablet', 'Servidor reiniciado.', 'Info')
  Update-Status
})
$miOpen.add_Click({
  $adb = Find-Adb
  if ($adb) {
    & $adb forward tcp:47800 tcp:47800 2>$null | Out-Null
    & $adb shell am start -n com.savatablet.app/.MainActivity 2>$null | Out-Null
  }
})
$miLog.add_Click({ if (Test-Path $logFile) { Start-Process notepad.exe $logFile } })
$miExit.add_Click({
  Stop-Agent
  $tray.Visible = $false
  [System.Windows.Forms.Application]::Exit()
})
$tray.add_DoubleClick({ Update-Status; $tray.ShowBalloonTip(2000, 'Sava Tablet', $miStatus.Text, 'Info') })

# Vigia: a cada 5 s confere o agente (reinicia se caiu) e atualiza o ícone.
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.add_Tick({
  if ($script:wanted -and (-not $script:agent -or $script:agent.HasExited)) {
    $now = Get-Date
    $script:restarts = @($script:restarts | Where-Object { ($now - $_).TotalMinutes -lt 5 })
    if ($script:restarts.Count -lt 5) {
      if ($script:agent) { Write-Log "servidor caiu (código $($script:agent.ExitCode)); reiniciando" }
      $script:restarts += $now
      Start-Agent
    } elseif ($script:wanted) {
      # Caiu 5 vezes em 5 min: para e avisa, em vez de ficar em loop.
      $script:wanted = $false
      Write-Log 'servidor caiu 5 vezes em 5 minutos; parado'
      $tray.ShowBalloonTip(5000, 'Sava Tablet', 'O servidor caiu várias vezes e foi parado. Veja o registro no menu.', 'Warning')
    }
  }
  Update-Status
})

Start-Agent
Update-Status
$timer.Start()
[System.Windows.Forms.Application]::Run()

# Saída
$timer.Stop()
$tray.Dispose()
