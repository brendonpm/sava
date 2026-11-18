# Exporta cada expressão do pacote de sprites como um PNG 256x256 para o app do tablet.
# O Android 4.0 não lê WebP com cabeçalho estendido, então tudo vira PNG aqui no PC.
# Saída: tablet/app/assets/frames/<id>.png e frames/index.txt (id, movimento, partículas, nome).
param(
  [string]$Pack = (Join-Path $PSScriptRoot '..\..\assets\sprites\default'),
  [string]$Out = (Join-Path $PSScriptRoot '..\app\assets\frames')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore, System.Drawing

$Pack = (Resolve-Path $Pack).Path
New-Item -ItemType Directory -Force $Out | Out-Null
$Out = (Resolve-Path $Out).Path
$json = [IO.File]::ReadAllText((Join-Path $Pack 'pack.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
$W = [int]$json.cell.w; $H = [int]$json.cell.h

# Abre qualquer imagem (PNG ou WebP) pelo WIC do Windows e devolve um System.Drawing.Bitmap.
$cache = @{}
function Open-Sheet([string]$name) {
  if ($cache.ContainsKey($name)) { return $cache[$name] }
  $path = Join-Path $Pack $name
  $dec = [System.Windows.Media.Imaging.BitmapDecoder]::Create([Uri]$path, 'PreservePixelFormat', 'OnLoad')
  $src = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap($dec.Frames[0], [System.Windows.Media.PixelFormats]::Bgra32, $null, 0)
  $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($src))
  $ms = New-Object IO.MemoryStream
  $enc.Save($ms); $ms.Position = 0
  $bmp = New-Object System.Drawing.Bitmap($ms)
  $cache[$name] = $bmp
  return $bmp
}

function New-G($bmp) {
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'Half'
  $g.CompositingMode = 'SourceCopy'
  return $g
}

$attr = New-Object System.Drawing.Imaging.ImageAttributes
$attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
function Draw($g, $img, $dx, $dy, $dw, $dh, $sx, $sy, $sw, $sh) {
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle([int]$dx, [int]$dy, [int]$dw, [int]$dh)), [single]$sx, [single]$sy, [single]$sw, [single]$sh, 'Pixel', $attr)
}

$lines = New-Object System.Collections.Generic.List[string]
foreach ($prop in $json.frames.PSObject.Properties) {
  $id = $prop.Name; $f = $prop.Value
  $sheetName = if ($f.sheet) { $f.sheet } else { $json.sheet }
  $sheet = Open-Sheet $sheetName
  $outBmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = New-G $outBmp
  if ($f.fit) {
    # Mesmo enquadramento do sprite-pack.js: estende as bordas do quadro e recorta a área da escala.
    $scale = [double]$f.fit[0]; $ox = [double]$f.fit[1]; $oy = [double]$f.fit[2]
    $P = 64; $fw = [int]$f.w; $fh = [int]$f.h
    $pad = New-Object System.Drawing.Bitmap(($fw + 2 * $P), ($fh + 2 * $P), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $pg = [System.Drawing.Graphics]::FromImage($pad)
    $pg.InterpolationMode = 'NearestNeighbor'; $pg.PixelOffsetMode = 'Half'; $pg.CompositingMode = 'SourceCopy'
    Draw $pg $sheet $P $P $fw $fh $f.x $f.y $fw $fh
    Draw $pg $sheet $P 0 $fw $P $f.x $f.y $fw 1
    Draw $pg $sheet $P ($P + $fh) $fw $P $f.x ($f.y + $fh - 1) $fw 1
    $copy = $pad.Clone()
    Draw $pg $copy 0 0 $P ($fh + 2 * $P) $P 0 1 ($fh + 2 * $P)
    Draw $pg $copy ($P + $fw) 0 $P ($fh + 2 * $P) ($P + $fw - 1) 0 1 ($fh + 2 * $P)
    $pg.Dispose(); $copy.Dispose()
    Draw $g $pad 0 0 $W $H ($P + $ox) ($P + $oy) ($W / $scale) ($H / $scale)
    $pad.Dispose()
  } else {
    $g.InterpolationMode = 'NearestNeighbor'
    Draw $g $sheet 0 0 $W $H $f.x $f.y $W $H
  }
  $g.Dispose()
  $outBmp.Save((Join-Path $Out "$id.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $outBmp.Dispose()
  $motion = if ($f.motion) { $f.motion } else { '' }
  $particles = if ($f.particles) { $f.particles } else { '' }
  $lines.Add("$id`t$motion`t$particles`t$($f.label)")
}
[IO.File]::WriteAllLines((Join-Path $Out 'index.txt'), $lines, (New-Object Text.UTF8Encoding($false)))
"Exportados $($lines.Count) quadros em $Out"
