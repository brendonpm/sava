# Agente da Sava no PC: roda escondido desde o login do Windows.
#  - Quando o tablet é conectado: liga o túnel USB (adb forward) e abre o app.
#  - A cada 5 s: CPU, RAM, GPU (uso e temperatura), disco C: e rede para o painel do tablet.
#  - CPU alta por um tempo: a Sava fica assustada. RAM alta: fica tonta ("cabeça cheia").
#  - Notificação nova do navegador (Zoho Cliq, Google Agenda...): a Sava avisa no tablet.
#  - Música/vídeo novo tocando (Spotify, navegador, etc.): a Sava fica feliz e mostra a faixa.
# As reações do agente são temporárias (hold): depois ela volta ao que estava (ex.: Claude Code).
param([switch]$Once)  # -Once: faz uma rodada e sai (para testar)
$ErrorActionPreference = 'Continue'

# Rede de segurança: qualquer erro inesperado vai para o log e o agente segue rodando
# (antes, um erro logo depois do login derrubava o agente sem deixar rastro).
$LogFile = Join-Path $env:USERPROFILE 'SavaTablet\agent.log'
function Write-Log([string]$msg) {
  try {
    if ((Test-Path $LogFile) -and (Get-Item $LogFile).Length -gt 512KB) { Remove-Item $LogFile -Force }
    Add-Content -Path $LogFile -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $msg) -Encoding UTF8
  } catch {}
}
trap {
  Write-Log ("ERRO: " + $_.Exception.Message + " (linha " + $_.InvocationInfo.ScriptLineNumber + ")")
  continue
}

$Port = 47800
$App = 'com.savatablet.app/.MainActivity'

# Uma instância só.
$mutex = New-Object System.Threading.Mutex($false, 'Local\SavaTabletAgent')
$owned = $false
try { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }  # o anterior foi encerrado à força
if (-not $owned) { return }
if (-not $Once) { Write-Log 'agente iniciado' }

# ---------------------------------------------------------------- adb
function Find-Adb {
  $c = @($env:SAVA_ADB,
    (Get-Command adb -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source),
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'),
    'C:\Program Files (x86)\Touch Portal\plugins\adb\platform-tools\adb.exe')
  foreach ($p in $c) { if ($p -and (Test-Path $p)) { return $p } }
  return $null
}
$adb = Find-Adb

function Adb([string[]]$a) {
  if (-not $adb) { return '' }
  try { return (& $adb @a 2>$null | Out-String).Trim() } catch { return '' }
}

# ---------------------------------------------------------------- envio para o tablet
function Send-Sava([string]$emo, [string]$text, [string]$detail, [string]$src, [int]$hold = 0) {
  $q = @("emo=$([Uri]::EscapeDataString($emo))", "text=$([Uri]::EscapeDataString($text))",
    "detail=$([Uri]::EscapeDataString($detail))", "src=$([Uri]::EscapeDataString($src))", "hold=$hold") -join '&'
  try {
    $req = [System.Net.WebRequest]::Create("http://127.0.0.1:$Port/state?$q")
    $req.Proxy = $null  # sem detecção automática de proxy: ela trava chamadas locais
    $req.Timeout = 1500
    $req.GetResponse().Close()
    return $true
  } catch { return $false }
}

# ---------------------------------------------------------------- música (Windows media session)
$media = $null
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
  function Await($op, [Type]$t) {
    $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op))
    if (-not $task.Wait(3000)) { return $null }
    return $task.Result
  }
  $mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  $propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
  $media = Await ($mgrType::RequestAsync()) $mgrType
} catch { $media = $null }

function Get-NowPlaying {
  if (-not $media) { return $null }
  try {
    $s = $media.GetCurrentSession()
    if (-not $s) { return $null }
    if ($s.GetPlaybackInfo().PlaybackStatus.ToString() -ne 'Playing') { return $null }
    $p = Await ($s.TryGetMediaPropertiesAsync()) $propsType
    if (-not $p -or -not $p.Title) { return $null }
    $app = ($s.SourceAppUserModelId -split '[!\\.]')[0]
    return [pscustomobject]@{ Title = $p.Title; Artist = $p.Artist; App = $app }
  } catch { return $null }
}

# ---------------------------------------------------------------- notificações do navegador
# Lê a central de notificações do Windows (o Chrome mostra as dos sites por ela). Só olha
# navegadores e apps web instalados (Zoho Cliq, Google Agenda); o resto é ignorado.
$notif = $null
$seenNotif = New-Object 'System.Collections.Generic.HashSet[uint32]'
try {
  $listenerType = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]
  $kindsType = [Windows.UI.Notifications.NotificationKinds, Windows.UI.Notifications, ContentType = WindowsRuntime]
  $listType = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]
  $toastBinding = [Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric
  if ($listenerType::Current.GetAccessStatus().ToString() -eq 'Allowed') { $notif = $listenerType::Current }
} catch { $notif = $null }

$BrowserApps = 'Chrome|Edge|Opera|Brave|Firefox|Vivaldi|Cliq|Zoho|Agenda|Calendar'

function Get-NewNotifications([switch]$Prime) {
  if (-not $notif) { return @() }
  $list = Await ($notif.GetNotificationsAsync($kindsType::Toast)) $listType
  if (-not $list) { return @() }
  $out = @()
  foreach ($n in $list) {
    if (-not $seenNotif.Add($n.Id)) { continue }  # já visto
    if ($Prime) { continue }                       # primeira leitura: só marca o que já estava lá
    $app = ''
    try { $app = $n.AppInfo.DisplayInfo.DisplayName } catch {}
    if ($app -notmatch $BrowserApps) { continue }
    $texts = @()
    try {
      $b = $n.Notification.Visual.GetBinding($toastBinding)
      if ($b) { $texts = @($b.GetTextElements() | ForEach-Object { $_.Text } | Where-Object { $_ }) }
    } catch {}
    if ($texts.Count -eq 0) { continue }
    $out += [pscustomobject]@{ App = $app; Title = $texts[0]; Body = ($texts | Select-Object -Skip 1) -join ' · ' }
  }
  return $out
}

# Decide a reação. O Windows não informa de qual site veio a notificação do Chrome (só título e
# texto), então: cara de agenda -> reunião; o resto -> mensagem nova (no caso, quase sempre o Cliq).
$MeetingPattern = 'calendar|agenda|reuni|meeting|evento|\bevent\b|lembrete|reminder|come[cç]a|starts|' +
  'em \d+ min|in \d+ min|agora|\bnow\b|\d{1,2}(:\d{2}|h\d{0,2})\s*[–-]\s*\d{1,2}(:\d{2}|h\d{0,2})'
function Send-Notification($n) {
  $all = "$($n.App) $($n.Title) $($n.Body)"
  $detail = if ($n.Body) { "$($n.Title): $($n.Body)" } else { $n.Title }
  if ($detail.Length -gt 120) { $detail = $detail.Substring(0, 119) + '…' }
  $src = if ($n.App -match 'Chrome|Edge|Opera|Brave|Firefox|Vivaldi') { "Navegador · $($n.App)" } else { $n.App }
  if ($all -match $MeetingPattern) {
    Send-Sava 'surpresa' 'Reunião chegando!' $detail $src 20000 | Out-Null
  } else {
    Send-Sava 'piscadinha' 'Mensagem nova!' $detail $src 12000 | Out-Null
  }
}
try { Get-NewNotifications -Prime | Out-Null } catch {}  # logo após o login o Windows pode não estar pronto

# ---------------------------------------------------------------- laço
$wasConnected = $false
$lastForwardCheck = [datetime]::MinValue
$lastTrack = ''
$tick = 0

$connected = $false
$inv = [Globalization.CultureInfo]::InvariantCulture

# Diagnóstico: com o arquivo debug.flag na pasta, cada medição vai para o log.
$debugOn = Test-Path (Join-Path $env:USERPROFILE 'SavaTablet\debug.flag')

# GPU NVIDIA: o nvidia-smi vem com o driver (uso, temperatura e memória de vídeo, sem admin).
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
if (-not $smi -and (Test-Path "$env:SystemRoot\System32\nvidia-smi.exe")) { $smi = "$env:SystemRoot\System32\nvidia-smi.exe" }

# Coleta tudo o que vai para o painel. Cada parte é independente: se uma falhar, as outras seguem.
# (Temperatura da CPU não entra: o Windows só informa com um driver de sensores rodando como admin.)
# CPU e RAM direto da API do Windows: leve mesmo com o PC no talo. A CPU é a média desde a última
# leitura (o Win32_Processor dava um instante só, marcava 88% com a CPU a 100% e travava sob carga).
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SavaSys {
    [DllImport("kernel32.dll")] static extern bool GetSystemTimes(out long idle, out long kernel, out long user);
    [StructLayout(LayoutKind.Sequential)]
    public class MemStatus {
        public uint dwLength = 64; public uint dwMemoryLoad;
        public ulong ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile, ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual;
    }
    [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx([In, Out] MemStatus m);
    static long pIdle, pKernel, pUser;
    public static int Cpu() {
        long i, k, u;
        if (!GetSystemTimes(out i, out k, out u)) return -1;
        long di = i - pIdle, total = (k - pKernel) + (u - pUser);  // o tempo de kernel inclui o ocioso
        pIdle = i; pKernel = k; pUser = u;
        if (total <= 0) return -1;
        return (int)Math.Max(0, Math.Min(100, Math.Round(100.0 * (total - di) / total)));
    }
    public static ulong[] Mem() { var m = new MemStatus(); GlobalMemoryStatusEx(m); return new ulong[] { m.ullTotalPhys, m.ullAvailPhys }; }
}
'@
[void][SavaSys]::Cpu()  # primeira leitura só marca o ponto de partida
# Prioridade um pouco acima do normal: sem isso, com a CPU cheia o agente ficava ~50 s sem medir.
try { [System.Diagnostics.Process]::GetCurrentProcess().PriorityClass = 'AboveNormal' } catch {}

# ---------------------------------------------------------------- medidor (linha de execução própria)
# CPU/RAM, o envio do painel e os alertas rodam numa thread separada e de prioridade alta, a cada 5 s.
# Assim nada do laço principal (adb, nvidia-smi, consultas do Windows, notificações), que fica lento
# com o PC no talo, atrasa a medição ou o alerta. O laço principal só entrega os dados pesados em $shared.
$shared = [hashtable]::Synchronized(@{
    connected = $false; heavy = @{}; cpu = 0; stop = $false
    port = $Port; log = $LogFile; debug = $debugOn
  })
$meterRs = [runspacefactory]::CreateRunspace()
$meterRs.Open()
$meterRs.SessionStateProxy.SetVariable('shared', $shared)
$meter = [powershell]::Create()
$meter.Runspace = $meterRs
[void]$meter.AddScript({
    [System.Threading.Thread]::CurrentThread.Priority = 'Highest'
    $inv = [Globalization.CultureInfo]::InvariantCulture
    function Log([string]$m) {
      try { Add-Content -Path $shared.log -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $m) -Encoding UTF8 } catch {}
    }
    function Call([string]$path, [hashtable]$q) {
      $qs = ($q.GetEnumerator() | ForEach-Object { "$($_.Key)=$([Uri]::EscapeDataString([string]$_.Value))" }) -join '&'
      try {
        $r = [System.Net.WebRequest]::Create("http://127.0.0.1:$($shared.port)$path`?$qs")
        $r.Proxy = $null
        $r.Timeout = 2500
        $r.GetResponse().Close()
        return $true
      } catch { return $false }
    }
    # Alertas: 2 das últimas 3 medições acima do limite (~10 s de carga; a CPU já é a média do
    # intervalo). No máximo um alerta a cada 3 min por tipo.
    $alerts = @(
      @{ Key = 'cpu'; Limit = 90; Emo = 'assustada'; Text = 'O PC está suando!'; Detail = 'Processador em {0}%'; Hist = @(); Last = [datetime]::MinValue },
      @{ Key = 'ram'; Limit = 90; Emo = 'entediada'; Text = 'Minha cabeça está cheia!'; Detail = 'Memória em {0}%'; Hist = @(); Last = [datetime]::MinValue },
      @{ Key = 'gpuTemp'; Limit = 85; Emo = 'assustada'; Text = 'A placa de vídeo está fervendo!'; Detail = 'GPU a {0} °C'; Hist = @(); Last = [datetime]::MinValue }
    )
    while (-not $shared.stop) {
      $t = [System.Diagnostics.Stopwatch]::StartNew()
      $st = @{}
      try { $c = [SavaSys]::Cpu(); if ($c -ge 0) { $st.cpu = $c; $shared.cpu = $c } } catch {}
      if ($shared.connected) {
        try {
          $m = [SavaSys]::Mem()
          $total = [double]$m[0]; $used = $total - [double]$m[1]
          $st.ram = [int][math]::Round(100 * $used / $total)
          $st.ramUsed = ($used / 1GB).ToString('0.0', $inv)
          $st.ramTotal = ($total / 1GB).ToString('0', $inv)
          $h = $shared.heavy
          foreach ($k in @($h.Keys)) { $st[$k] = $h[$k] }
          $cs = [System.Diagnostics.Stopwatch]::StartNew(); [void](Call '/stats' $st)
          if ($shared.debug) { Log "tempo: volta $([int]$t.ElapsedMilliseconds) ms, envio $([int]$cs.ElapsedMilliseconds) ms" }
          foreach ($al in $alerts) {
            $v = $st[$al.Key]
            if ($null -eq $v) { continue }
            $al.Hist = @(@($al.Hist) + [int]($v -ge $al.Limit) | Select-Object -Last 3)
            $hits = ($al.Hist | Measure-Object -Sum).Sum
            if ($shared.debug) { Log "medição $($al.Key)=$v  histórico=$($al.Hist -join '')" }
            if ($hits -ge 2 -and ((Get-Date) - $al.Last).TotalMinutes -ge 3) {
              $detail = $al.Detail -f $v
              if (Call '/state' @{ emo = $al.Emo; text = $al.Text; detail = $detail; src = 'PC'; hold = 10000 }) {
                $al.Last = Get-Date
                Log "alerta: $($al.Text) ($detail)"
              }
              $al.Hist = @()
            }
          }
        } catch { Log "ERRO nas medições: $($_.Exception.Message)" }
      }
      $left = 5000 - [int]$t.ElapsedMilliseconds
      if ($left -gt 0) { Start-Sleep -Milliseconds $left }
    }
  })
[void]$meter.BeginInvoke()

# Pesadas (abrem processos/consultas do Windows): GPU, disco e rede. Com a CPU cheia, ficam mais espaçadas.
function Get-HeavyStats {
  $s = @{}
  if ($smi) {
    try {
      $p = ((& $smi --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>$null) |
        Select-Object -First 1) -split ',\s*'
      if ($p.Count -ge 4) {
        $s.gpu = [int]$p[0]; $s.gpuTemp = [int]$p[1]
        $s.vramUsed = ([double]$p[2] / 1024).ToString('0.0', $inv); $s.vramTotal = ([double]$p[3] / 1024).ToString('0', $inv)
      }
    } catch {}
  }
  try {
    $c = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    $s.disk = [int][math]::Round(100 * ($c.Size - $c.FreeSpace) / $c.Size)
    $s.diskFree = [int][math]::Round($c.FreeSpace / 1GB)
    $d = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'"
    $s.diskBusy = [math]::Max(0, [math]::Min(100, 100 - [int]$d.PercentIdleTime))
  } catch {}
  try {
    $n = @(Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface)
    $s.down = [long](($n | Measure-Object BytesReceivedPersec -Sum).Sum)
    $s.up = [long](($n | Measure-Object BytesSentPersec -Sum).Sum)
  } catch {}
  return $s
}

# Agenda por relógio (não por voltas do laço, que ficam lentas com o PC sob carga).
# Com a CPU acima de 85%, o que é pesado (adb, GPU/disco/rede, notificações, música) fica mais espaçado
# para não atrasar a medição de CPU/RAM e os alertas.
$clock = [System.Diagnostics.Stopwatch]::StartNew()
$due = @{ adb = 0; heavy = 0; notif = 0; music = 0 }
$busy = $false
function Test-Due([string]$name, [double]$everySec, [double]$busySec) {
  $now = $clock.Elapsed.TotalSeconds
  if ($Once -or $now -ge $due[$name]) {
    $due[$name] = $now + $(if ($busy) { $busySec } else { $everySec })
    return $true
  }
  return $false
}

while ($true) {
  $tick++
  # Tablet conectado?
  if (Test-Due 'adb' 3 10) {
    $state = Adb @('get-state')
    $connected = $state -eq 'device'
    if ($connected -and -not $wasConnected) {
      Adb @('forward', "tcp:$Port", "tcp:$Port") | Out-Null
      Adb @('shell', 'am', 'start', '-n', $App) | Out-Null
      $lastForwardCheck = Get-Date
      try { Get-NewNotifications -Prime | Out-Null } catch {}  # não despeja as antigas de uma vez
    } elseif ($connected -and ((Get-Date) - $lastForwardCheck).TotalSeconds -ge 20) {
      # O túnel some se o adb reiniciar (o Touch Portal também usa o adb).
      if ((Adb @('forward', '--list')) -notmatch "tcp:$Port") { Adb @('forward', "tcp:$Port", "tcp:$Port") | Out-Null }
      $lastForwardCheck = Get-Date
    }
    $wasConnected = $connected
    $shared.connected = $connected
    # O servidor do adb é quem leva os dados pelo cabo: com prioridade normal, ele também atrasa sob carga.
    if ($connected) { Get-Process adb -ErrorAction SilentlyContinue | ForEach-Object { try { if ($_.PriorityClass -ne "AboveNormal") { $_.PriorityClass = "AboveNormal" } } catch {} } }
  }

  # Dados pesados para o painel (GPU, disco, rede): o medidor junta com CPU/RAM e envia.
  $busy = $shared.cpu -ge 85
  if ($connected -and (Test-Due 'heavy' 5 15)) {
    try { $shared.heavy = Get-HeavyStats } catch {}
  }

  # Notificações novas dos navegadores: a cada 2 s.
  if ($connected -and (Test-Due 'notif' 2 6)) {
    try { foreach ($n in (Get-NewNotifications)) { Send-Notification $n } } catch {}
  }

  # Música: só quando muda a faixa que está tocando.
  if ($connected -and (Test-Due 'music' 3 9)) {
    $np = Get-NowPlaying
    if ($np) {
      $key = "$($np.Title)|$($np.Artist)"
      if ($key -ne $lastTrack) {
        $detail = if ($np.Artist) { "$($np.Title) - $($np.Artist)" } else { $np.Title }
        if (Send-Sava 'feliz' 'Tocando agora' $detail ("Música · " + $np.App) 8000) { $lastTrack = $key }
      }
    }
  }

  if ($Once) { break }
  Start-Sleep -Milliseconds 250
}
