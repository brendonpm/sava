# Compila o app do tablet sem Gradle/Android Studio e, com -Install, instala e abre no tablet.
#   .\tablet\build.ps1            -> gera tablet\build\sava-tablet.apk
#   .\tablet\build.ps1 -Install   -> e também instala, abre e liga o túnel USB (adb forward)
# Ferramentas esperadas em %USERPROFILE%\SavaTablet\toolchain (jdk, build-tools, platform-15).
param([switch]$Install)
$ErrorActionPreference = 'Stop'

$T = Join-Path $env:USERPROFILE 'SavaTablet\toolchain'
$jdk = Join-Path $T 'jdk\bin'
$bt = Join-Path $T 'build-tools'
$jar = Join-Path $T 'platform-15\android.jar'
foreach ($p in $jdk, $bt, $jar) { if (-not (Test-Path $p)) { throw "Ferramenta não encontrada: $p" } }
$env:JAVA_HOME = Split-Path $jdk
$env:PATH = "$jdk;$env:PATH"

$root = $PSScriptRoot
$app = Join-Path $root 'app'
$outDir = Join-Path $root 'build'

# Quadros da Sava (gerados a partir do pacote de sprites da extensão).
if (-not (Test-Path (Join-Path $app 'assets\frames\index.txt'))) { & (Join-Path $root 'tools\export-frames.ps1') }

# As ferramentas do Android não lidam bem com acentos no caminho (ExtensãoIA), então o build
# acontece numa pasta só com ASCII.
$work = Join-Path $env:USERPROFILE 'SavaTablet\build'
if (Test-Path $work) { Remove-Item -Recurse -Force $work }
New-Item -ItemType Directory -Force $work, "$work\classes", "$work\res\drawable" | Out-Null
Copy-Item (Join-Path $app 'AndroidManifest.xml') $work
Copy-Item -Recurse (Join-Path $app 'assets') "$work\assets"
Copy-Item -Recurse (Join-Path $app 'src') "$work\src"
Copy-Item (Join-Path $root '..\assets\icons\icon48.png') "$work\res\drawable\icon.png"

function Run($exe) {
  & $exe @args
  if ($LASTEXITCODE -ne 0) { throw "Falhou: $exe $args" }
}

Push-Location $work
try {
  $sources = Get-ChildItem -Recurse src -Filter *.java | ForEach-Object { $_.FullName }
  Run "$jdk\javac.exe" -encoding UTF-8 -source 8 -target 8 '-Xlint:-options' -bootclasspath $jar -d classes @sources
  $classes = Get-ChildItem -Recurse classes -Filter *.class | ForEach-Object { $_.FullName }
  Run "$bt\d8.bat" --release --min-api 15 --lib $jar --output . @classes
  Run "$bt\aapt.exe" package -f -M AndroidManifest.xml -S res -A assets -I $jar -F unsigned.apk
  Run "$bt\aapt.exe" add unsigned.apk classes.dex | Out-Null
  Run "$bt\zipalign.exe" -f 4 unsigned.apk aligned.apk

  # Chave de assinatura local (de desenvolvimento), criada uma vez e reaproveitada.
  $ks = Join-Path $env:USERPROFILE 'SavaTablet\sava-debug.keystore'
  if (-not (Test-Path $ks)) {
    Run "$jdk\keytool.exe" -genkeypair -keystore $ks -storepass android -keypass android -alias sava `
      -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Sava Tablet Debug" -noprompt
  }
  Run "$bt\apksigner.bat" sign --ks $ks --ks-pass pass:android --key-pass pass:android --ks-key-alias sava `
    --min-sdk-version 15 --out sava-tablet.apk aligned.apk
} finally { Pop-Location }

New-Item -ItemType Directory -Force $outDir | Out-Null
Copy-Item "$work\sava-tablet.apk" $outDir -Force
$apk = Join-Path $outDir 'sava-tablet.apk'
"APK: $apk ($([math]::Round((Get-Item $apk).Length / 1KB)) KB)"

if ($Install) {
  $adb = & (Join-Path $root 'pc\find-adb.ps1')
  Run $adb install -r "$work\sava-tablet.apk"
  Run $adb shell am start -n com.savatablet.app/.MainActivity | Out-Null
  Run $adb forward tcp:47800 tcp:47800 | Out-Null
  "Instalado e aberto no tablet; túnel USB na porta 47800."
}
