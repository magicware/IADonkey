# Script to generate all MagicPlan notification icons (situations 1 to 20 for Dev, Service, Dev-Crit, Service-Crit)
$glyphPaths = Get-Content -Raw "scratch/glyph_paths.json" | ConvertFrom-Json

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
  $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$root = (Get-Location).Path
$tmpDir = "$root\scratch\mp_icons_gen"
if (-not (Test-Path $tmpDir)) {
  New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
}

$targetDirs = @(
  "$root\electron\assets\notifications",
  "$root\dist-electron\assets\notifications"
)

# Situation configurations:
# [sitId, indicatorGlyphName, normalColor, criticalColor]
$situations = @(
  @{ id = 1;  glyph = 'schedule';      norm = '#f97316'; crit = '#ef4444' },
  @{ id = 2;  glyph = 'lightbulb';     norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 3;  glyph = 'lightbulb';     norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 4;  glyph = 'lightbulb';     norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 5;  glyph = 'person';        norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 6;  glyph = 'person';        norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 7;  glyph = 'arrow_forward'; norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 8;  glyph = 'person';        norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 9;  glyph = 'close';         norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 10; glyph = 'person';        norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 11; glyph = 'arrow_upward';   norm = '#6366f1'; crit = '#ef4444' },
  @{ id = 12; glyph = 'priority_high';  norm = '#ef4444'; crit = '#ef4444' },
  @{ id = 13; glyph = 'check';          norm = '#22c55e'; crit = '#22c55e' },
  @{ id = 14; glyph = 'check';          norm = '#22c55e'; crit = '#22c55e' },
  @{ id = 15; glyph = 'person';         norm = '#22c55e'; crit = '#22c55e' },
  @{ id = 16; glyph = 'person';         norm = '#22c55e'; crit = '#22c55e' },
  @{ id = 17; glyph = 'priority_high';  norm = '#ef4444'; crit = '#ef4444' },
  @{ id = 18; glyph = 'lightbulb';      norm = '#ef4444'; crit = '#ef4444' },
  @{ id = 19; glyph = 'schedule';      norm = '#6366f1'; crit = '#6366f1' },
  @{ id = 20; glyph = 'lightbulb';     norm = '#6366f1'; crit = '#6366f1' }
)

$types = @(
  @{ name = 'dev';          mainGlyph = 'code';  mainColor = '#ffffff'; isCrit = $false },
  @{ name = 'service';      mainGlyph = 'build'; mainColor = '#ffffff'; isCrit = $false },
  @{ name = 'dev-crit';     mainGlyph = 'code';  mainColor = '#ef4444'; isCrit = $true },
  @{ name = 'service-crit'; mainGlyph = 'build'; mainColor = '#ef4444'; isCrit = $true }
)

$renderedCount = 0

foreach ($sit in $situations) {
  $indPath = $glyphPaths.$($sit.glyph)

  foreach ($t in $types) {
    $filename = "mp-$($sit.id)-$($t.name).png"
    $mainPath = $glyphPaths.$($t.mainGlyph)
    $indColor = if ($t.isCrit) { $sit.crit } else { $sit.norm }

    $html = @"
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:128px;height:128px;overflow:hidden;background:transparent;}</style></head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <svg x="6" y="6" width="84" height="84" viewBox="0 -960 960 960">
      <path d="$mainPath" fill="$($t.mainColor)"/>
    </svg>
    <circle cx="98" cy="98" r="26" fill="#14151c" stroke="$indColor" stroke-width="2.5"/>
    <svg x="80" y="80" width="36" height="36" viewBox="0 -960 960 960">
      <path d="$indPath" fill="$indColor"/>
    </svg>
  </svg>
</body>
</html>
"@

    $htmlPath = "$tmpDir\mp-$($sit.id)-$($t.name).html"
    $pngPath = "$tmpDir\$filename"
    Set-Content -Path $htmlPath -Value $html -Encoding UTF8
    $uri = [System.Uri]::new($htmlPath).AbsoluteUri
    & $edgePath --headless --screenshot="$pngPath" --window-size=128,128 --default-background-color=00000000 --hide-scrollbars "$uri" 2>&1 | Out-Null

    if (Test-Path $pngPath) {
      $renderedCount++
      foreach ($td in $targetDirs) {
        if (Test-Path $td) {
          Copy-Item -Path $pngPath -Destination "$td\$filename" -Force
        }
      }
    } else {
      Write-Error "Failed to generate $filename"
    }
  }
  Write-Host "Completed situation $($sit.id)/20"
}

Write-Host "Successfully generated $renderedCount icons!"
