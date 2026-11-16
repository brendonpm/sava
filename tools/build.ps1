# Gera o pacote da extensão e atualiza o site.
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/build.ps1
#
# Saídas:
#   dist/sava-<versão>.zip        -> envio para a Chrome Web Store
#   site/download/sava.zip        -> download manual no site (mesmo conteúdo)
#   site/app/...                  -> cópia do código da personagem para a demonstração do site
#
# O ZIP leva só o que a extensão usa: manifest.json, src/ e assets/ (sem dev/, tools/, site/, README).
# Os caminhos dentro do ZIP usam "/" (o Compress-Archive do Windows PowerShell 5.1 usa "\", que a loja rejeita).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version

# ---------- arquivos da extensão ----------
$include = @('manifest.json')
$include += Get-ChildItem (Join-Path $root 'src') -Recurse -File | ForEach-Object { $_.FullName.Substring($root.Length + 1) }
$include += Get-ChildItem (Join-Path $root 'assets\icons') -File | ForEach-Object { $_.FullName.Substring($root.Length + 1) }
$include += Get-ChildItem (Join-Path $root 'assets\sprites') -Recurse -File | ForEach-Object { $_.FullName.Substring($root.Length + 1) }

function New-Zip($path, $files) {
  if (Test-Path $path) { Remove-Item $path -Force }
  New-Item -ItemType Directory -Force (Split-Path $path) | Out-Null
  $zip = [IO.Compression.ZipFile]::Open($path, 'Create')
  try {
    foreach ($rel in $files) {
      $entry = $rel -replace '\\', '/'
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $root $rel), $entry, 'Optimal') | Out-Null
    }
  } finally { $zip.Dispose() }
}

$distZip = Join-Path $root "dist\sava-$version.zip"
New-Zip $distZip $include
Write-Host "Pacote da loja: dist\sava-$version.zip ($([math]::Round((Get-Item $distZip).Length / 1KB)) KB, $($include.Count) arquivos)"

# ---------- site ----------
$site = Join-Path $root 'site'
if (Test-Path $site) {
  $dl = Join-Path $site 'download'
  New-Item -ItemType Directory -Force $dl | Out-Null
  Copy-Item $distZip (Join-Path $dl 'sava.zip') -Force

  # código da personagem para a demonstração (o site não depende da pasta da extensão)
  $app = Join-Path $site 'app'
  if (Test-Path $app) { Remove-Item $app -Recurse -Force }
  foreach ($rel in @(
      'src\shared\settings.js', 'src\shared\instruction.js',
      'src\emotion\emotions.js', 'src\emotion\detect.js',
      'src\avatar\sprite-pack.js', 'src\avatar\avatar.js')) {
    $dst = Join-Path $app $rel
    New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
    Copy-Item (Join-Path $root $rel) $dst
  }
  $spr = Join-Path $app 'assets\sprites\default'
  New-Item -ItemType Directory -Force $spr | Out-Null
  Copy-Item (Join-Path $root 'assets\sprites\default\*') $spr
  Copy-Item (Join-Path $root 'assets\icons\icon128.png') (Join-Path $site 'icon.png') -Force

  # versão exibida no site
  "window.SAVA_VERSION = '$version';" | Out-File (Join-Path $site 'version.js') -Encoding utf8
  Write-Host "Site atualizado: site\download\sava.zip, site\app\ e site\version.js"
}
