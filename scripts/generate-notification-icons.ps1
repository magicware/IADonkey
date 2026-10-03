# Script to generate 13 notification icons in 128x128 PNG format with dark circular background and Material Symbols

$symbols = @(
  @{ name = 'plan-dev'; symbol = 'code'; color = '#6366f1' },
  @{ name = 'plan-service'; symbol = 'build'; color = '#6366f1' },
  @{ name = 'plan-queue'; symbol = 'inbox'; color = '#6366f1' },
  @{ name = 'plan-completed'; symbol = 'check'; color = '#22c55e' },
  @{ name = 'plan-critical'; symbol = 'warning'; color = '#ef4444' },
  @{ name = 'quickCap'; symbol = 'crop'; color = '#6366f1' },
  @{ name = 'colorMaster'; symbol = 'colorize'; color = '#6366f1' },
  @{ name = 'screenRuler'; symbol = 'straighten'; color = '#6366f1' },
  @{ name = 'syncComplete'; symbol = 'sync'; color = '#6366f1' },
  @{ name = 'update'; symbol = 'upgrade'; color = '#6366f1' },
  @{ name = 'clipboard'; symbol = 'content_copy'; color = '#6366f1' },
  @{ name = 'error'; symbol = 'error'; color = '#ef4444' },
  @{ name = 'test'; symbol = 'notifications_active'; color = '#eab308' }
)

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
  $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$tmpDir = "c:\development\IADonkey\scratch\notif_gen"
if (-not (Test-Path $tmpDir)) {
  New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
}

$targetDirs = @(
  "c:\development\IADonkey\electron\assets\notifications",
  "c:\development\IADonkey\dist-electron\assets\notifications"
)

foreach ($item in $symbols) {
  $url = "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/$($item.symbol)/default/24px.svg"
  Write-Host "Fetching $($item.name) ($($item.symbol))..."
  $svgRaw = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
  
  if ($svgRaw -match '<path\s+d="([^"]+)"') {
    $d = $matches[1]
  } else {
    Write-Error "Could not extract path for $($item.name)"
    continue
  }

  $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 128px;
    height: 128px;
    overflow: hidden;
    background: transparent;
  }
</style>
</head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <circle cx="64" cy="64" r="56" fill="#14151c" stroke="#262834" stroke-width="2.5"/>
    <svg x="32" y="32" width="64" height="64" viewBox="0 -960 960 960">
      <path d="$d" fill="$($item.color)"/>
    </svg>
  </svg>
</body>
</html>
"@

  $htmlFile = Join-Path $tmpDir "$($item.name).html"
  $pngFile = Join-Path $tmpDir "$($item.name).png"
  Set-Content -Path $htmlFile -Value $htmlContent -Encoding UTF8

  $fileUri = [System.Uri]::new($htmlFile).AbsoluteUri
  & $edgePath --headless --screenshot="$pngFile" --window-size=128,128 --default-background-color=00000000 --hide-scrollbars "$fileUri" 2>&1 | Out-Null

  Start-Sleep -Milliseconds 300

  if (Test-Path $pngFile) {
    Write-Host "Generated: $($item.name).png"
    foreach ($outDir in $targetDirs) {
      if (Test-Path $outDir) {
        Copy-Item -Path $pngFile -Destination (Join-Path $outDir "$($item.name).png") -Force
      }
    }
  } else {
    Write-Error "Failed to generate PNG for $($item.name)"
  }
}

Write-Host "All icons generated successfully!"
