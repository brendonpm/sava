# Recebe imagens PNG (POST com base64 no corpo) e grava em -OutDir. Usado por tools/store-assets.html.
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/receive.ps1 -OutDir store -Count 5
param([string]$OutDir, [int]$Count = 5, [int]$Port = 8766)
New-Item -ItemType Directory -Force $OutDir | Out-Null
$l = New-Object Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
$n = 0
while ($n -lt $Count) {
  $ctx = $l.GetContext()
  $name = $ctx.Request.Url.AbsolutePath.TrimStart('/')
  $ctx.Response.Headers.Add('Access-Control-Allow-Origin', '*')
  if ($ctx.Request.HttpMethod -eq 'POST' -and $name -match '^[a-z0-9-]+\.png$') {
    $b64 = (New-Object IO.StreamReader($ctx.Request.InputStream)).ReadToEnd()
    [IO.File]::WriteAllBytes((Join-Path (Resolve-Path $OutDir) $name), [Convert]::FromBase64String($b64))
    Write-Host "saved $name"
    $n++
  }
  $ctx.Response.Close()
}
$l.Stop()
