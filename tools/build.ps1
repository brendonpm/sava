# Gera o pacote da extensão e atualiza o site.
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/build.ps1
#
# Saídas:
#   dist/sava-<versão>.zip        -> envio para a Chrome Web Store
#   site/download/sava.zip        -> download manual no site (mesmo conteúdo)
#   site/app/...                  -> cópia do código da personagem para a demonstração do site
#
# O ZIP leva só o que a extensão usa: manifest.json, _locales/, src/ e assets/ (sem dev/, tools/, site/, README).
# Os caminhos dentro do ZIP usam "/" (o Compress-Archive do Windows PowerShell 5.1 usa "\", que a loja rejeita).
#
# Recurso interno do tablet USB: o código entre "@tablet-start" e "@tablet-end", a permissão
# entrada http://127.0.0.1/* de optional_host_permissions e os textos opt_tablet/tab* ficam FORA do pacote (e do site). Para usá-los,
# carregue a pasta do projeto sem compactação no Chrome.
#   -Out <arquivo.zip>  gera só o pacote nesse caminho, sem mexer em dist/ nem no site (para conferir)
param([string]$Out)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version

# ---------- arquivos da extensão ----------
$include = @('manifest.json')
$include += Get-ChildItem (Join-Path $root 'src') -Recurse -File | ForEach-Object { $_.FullName.Substring($root.Length + 1) }
$include += Get-ChildItem (Join-Path $root '_locales') -Recurse -File | ForEach-Object { $_.FullName.Substring($root.Length + 1) }
$include += Get-ChildItem (Join-Path $root 'assets\icons') -File | ForEach-Object { $_.FullName.Substring($root.Length + 1) }
$include += Get-ChildItem (Join-Path $root 'assets\sprites') -Recurse -File | ForEach-Object { $_.FullName.Substring($root.Length + 1) }

# ---------- cópia limpa, sem o recurso interno do tablet ----------
$stage = Join-Path ([IO.Path]::GetTempPath()) "sava-build-$PID"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
$utf8 = New-Object Text.UTF8Encoding($false)
foreach ($rel in $include) {
  $src = Join-Path $root $rel
  $dst = Join-Path $stage $rel
  New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
  if ($rel -match '\.(js|html|json)$') {
    $text = [IO.File]::ReadAllText($src, $utf8)
    $text = [regex]::Replace($text, '(?ms)^[ \t]*(?://|<!--) @tablet-start.*?@tablet-end[^\n]*\n', '')
    # só o endereço do tablet sai; os sites opcionais (ChatGPT, Perplexity...) ficam.
    # Ele precisa ser o primeiro item da lista, numa linha só, para o JSON continuar válido.
    if ($rel -eq 'manifest.json') { $text = [regex]::Replace($text, '(?m)^[ \t]*"http://127\.0\.0\.1/\*",[ \t]*\r?\n', '') }
    if ($rel -match '^_locales') { $text = [regex]::Replace($text, '(?m)^[ \t]*"(opt_tablet|tabThinking|tabAnswering|tabAnswered)".*\r?\n', '') }
    [IO.File]::WriteAllText($dst, $text, $utf8)
  } else {
    Copy-Item $src $dst
  }
}
# Trava de segurança: nada do tablet pode sobrar no pacote.
$leak = Get-ChildItem $stage -Recurse -File -Include *.js, *.html, *.json |
  Select-String -Pattern '@tablet|tabletUsb|127\.0\.0\.1|47800|opt_tablet|tabThinking' -List
if ($leak) { throw "O recurso interno do tablet vazou para o pacote: $($leak.Path -join ', ')" }
foreach ($rel in @('manifest.json') + @(Get-ChildItem (Join-Path $stage '_locales') -Recurse -File | ForEach-Object { $_.FullName })) {
  $p = if ([IO.Path]::IsPathRooted($rel)) { $rel } else { Join-Path $stage $rel }
  [IO.File]::ReadAllText($p, $utf8) | ConvertFrom-Json | Out-Null  # JSON continua válido?
}

function New-Zip($path, $files) {
  if (Test-Path $path) { Remove-Item $path -Force }
  New-Item -ItemType Directory -Force (Split-Path $path) | Out-Null
  $zip = [IO.Compression.ZipFile]::Open($path, 'Create')
  try {
    foreach ($rel in $files) {
      $entry = $rel -replace '\\', '/'
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $stage $rel), $entry, 'Optimal') | Out-Null
    }
  } finally { $zip.Dispose() }
}

if ($Out) {
  New-Zip $Out $include
  Remove-Item $stage -Recurse -Force
  Write-Host "Pacote de conferencia: $Out ($($include.Count) arquivos)"
  return
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
      'src\shared\settings.js', 'src\shared\i18n.js', 'src\shared\instruction.js',
      'src\emotion\emotions.js', 'src\emotion\detect.js',
      'src\avatar\sprite-pack.js', 'src\avatar\avatar.js')) {
    $dst = Join-Path $app $rel
    New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
    Copy-Item (Join-Path $stage $rel) $dst
  }
  $spr = Join-Path $app 'assets\sprites\default'
  New-Item -ItemType Directory -Force $spr | Out-Null
  Copy-Item (Join-Path $root 'assets\sprites\default\*') $spr
  Copy-Item (Join-Path $root 'assets\icons\icon128.png') (Join-Path $site 'icon.png') -Force

  # versão exibida no site
  "window.SAVA_VERSION = '$version';" | Out-File (Join-Path $site 'version.js') -Encoding utf8
  Write-Host "Site atualizado: site\download\sava.zip, site\app\ e site\version.js"
}

Remove-Item $stage -Recurse -Force
