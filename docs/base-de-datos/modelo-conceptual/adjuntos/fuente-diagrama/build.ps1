$ErrorActionPreference = 'Continue'
$d = $PSScriptRoot
Set-Location $d
python gen.py "$d\modelo_conceptual.svg"
if ($LASTEXITCODE -ne 0) { exit 1 }
$svg = Get-Content "$d\modelo_conceptual.svg" -Raw -Encoding utf8
$print = @"
<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Modelo Conceptual SGA</title>
<style>@page{size:A3 landscape;margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block;width:420mm;height:297mm}</style>
</head><body>$svg</body></html>
"@
Set-Content "$d\modelo_conceptual_print.html" $print -Encoding utf8
$preview = $print.Replace('svg{display:block;width:420mm;height:297mm}', 'svg{display:block;width:100vw;height:auto}')
Set-Content "$d\preview.html" $preview -Encoding utf8
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$w = if ($args.Count -gt 0) { $args[0] } else { 2800 }
$h = [int]($w * 2970 / 4200)
& $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 "--window-size=$w,$h" "--screenshot=$d\preview.png" "file:///$($d -replace '\\','/')/preview.html" 2>$null | Out-Null
& $edge --headless=new --disable-gpu --no-pdf-header-footer "--print-to-pdf=$d\modelo_conceptual_A3.pdf" "file:///$($d -replace '\\','/')/modelo_conceptual_print.html" 2>$null | Out-Null
Start-Sleep -Seconds 2
Get-ChildItem $d -Filter "*.p*" | Select Name, Length

