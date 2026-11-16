# Gera _locales/<idioma>/messages.json a partir de tools/locales.json.
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/gen-locales.ps1
# pt_PT recebe os mesmos textos de pt_BR (melhor do que cair no inglês).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src = Get-Content (Join-Path $root 'tools\locales.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$locales = @('en', 'pt_BR', 'es', 'fr', 'de', 'ja')
$copies = @{ 'pt_PT' = 'pt_BR' }
$utf8 = New-Object Text.UTF8Encoding $false

function Escape([string]$s) {
  $sb = New-Object Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    switch ($ch) {
      '"' { [void]$sb.Append('\"') }
      '\' { [void]$sb.Append('\\') }
      "`n" { [void]$sb.Append('\n') }
      "`r" { }
      "`t" { [void]$sb.Append('\t') }
      default { [void]$sb.Append($ch) }
    }
  }
  $sb.ToString()
}

$keys = $src.PSObject.Properties | Where-Object { $_.Name -notlike '_*' }
foreach ($loc in $locales + $copies.Keys) {
  $from = if ($copies.ContainsKey($loc)) { $copies[$loc] } else { $loc }
  $lines = @()
  foreach ($k in $keys) {
    $msg = $k.Value.$from
    if ($null -eq $msg) { $msg = $k.Value.en; Write-Warning "$($k.Name) sem texto em $from (usando en)" }
    $lines += "  `"$($k.Name)`": { `"message`": `"$(Escape $msg)`" }"
  }
  $dir = Join-Path $root "_locales\$loc"
  New-Item -ItemType Directory -Force $dir | Out-Null
  [IO.File]::WriteAllText((Join-Path $dir 'messages.json'), "{`n" + ($lines -join ",`n") + "`n}`n", $utf8)
}
Write-Host ("Gerados: " + (($locales + $copies.Keys) -join ', ') + " ($($keys.Count) textos)")
