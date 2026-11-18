# Devolve o caminho do adb.exe: variável SAVA_ADB, PATH, SDK do Android ou o que vem com o Touch Portal.
$candidates = @(
  $env:SAVA_ADB,
  (Get-Command adb -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source),
  (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'),
  'C:\Program Files (x86)\Touch Portal\plugins\adb\platform-tools\adb.exe'
)
foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
throw 'adb.exe não encontrado. Instale o Android platform-tools ou defina SAVA_ADB.'
