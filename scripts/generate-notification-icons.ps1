param(
    [string]$OutDir = (Join-Path $PSScriptRoot "..\electron\assets\notifications"),
    [string]$PrimaryColorHex = "#6366f1"
)

Add-Type -AssemblyName System.Drawing

if (!(Test-Path $OutDir)) {
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
}

$primaryColor = try { [System.Drawing.ColorTranslator]::FromHtml($PrimaryColorHex) } catch { [System.Drawing.Color]::FromArgb(255, 99, 102, 241) }

function Create-BaseCircle {
    param([int]$size = 128)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Dark circle background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 20, 21, 28))
    $g.FillEllipse($bgBrush, 8, 8, 112, 112)
    $bgBrush.Dispose()

    # Subtle inner/outer border
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 38, 40, 52), 2.5)
    $g.DrawEllipse($borderPen, 8, 8, 112, 112)
    $borderPen.Dispose()

    return @{ Bitmap = $bmp; Graphics = $g }
}

function Save-Icon {
    param($ctx, [string]$name)
    $path = Join-Path $OutDir "$name.png"
    $ctx.Graphics.Dispose()
    $ctx.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $ctx.Bitmap.Dispose()
    Write-Host "Created: $path"
}

# 1. plan-dev (Code brackets: < / >)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen($primaryColor, 5.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
# <
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(50, 47)),
    (New-Object System.Drawing.PointF(37, 64)),
    (New-Object System.Drawing.PointF(50, 81))
))
# >
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(78, 47)),
    (New-Object System.Drawing.PointF(91, 64)),
    (New-Object System.Drawing.PointF(78, 81))
))
# /
$ctx.Graphics.DrawLine($pen, 69, 44, 59, 84)
$pen.Dispose()
Save-Icon $ctx "plan-dev"

# 2. plan-service (Wrench / Spanner)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen($primaryColor, 7.0)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
# Handle
$ctx.Graphics.DrawLine($pen, 40, 88, 73, 55)
$pen.Dispose()
# Wrench head
$headBrush = New-Object System.Drawing.SolidBrush($primaryColor)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse(64, 34, 32, 32)
$holePath = New-Object System.Drawing.Drawing2D.GraphicsPath
$holePath.AddPolygon([System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(73, 41)),
    (New-Object System.Drawing.PointF(87, 41)),
    (New-Object System.Drawing.PointF(80, 52))
))
$region = New-Object System.Drawing.Region($path)
$region.Exclude($holePath)
$ctx.Graphics.FillRegion($headBrush, $region)
$headBrush.Dispose()
Save-Icon $ctx "plan-service"

# 3. plan-completed (Emerald Checkmark)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 34, 197, 94), 7.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(40, 64)),
    (New-Object System.Drawing.PointF(56, 80)),
    (New-Object System.Drawing.PointF(88, 48))
))
$pen.Dispose()
Save-Icon $ctx "plan-completed"

# 4. plan-critical (Red Warning Triangle with !)
$ctx = Create-BaseCircle
$triBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 239, 68, 68))
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddPolygon([System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(64, 34)),
    (New-Object System.Drawing.PointF(94, 86)),
    (New-Object System.Drawing.PointF(34, 86))
))
$ctx.Graphics.FillPath($triBrush, $path)
$triBrush.Dispose()
# Exclamation mark inside triangle (dark/white cutout)
$exPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 20, 21, 28), 4.5)
$exPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$exPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$ctx.Graphics.DrawLine($exPen, 64, 52, 64, 70)
$exPen.Dispose()
$dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 20, 21, 28))
$ctx.Graphics.FillEllipse($dotBrush, 61.5, 77.0, 5.0, 5.0)
$dotBrush.Dispose()
Save-Icon $ctx "plan-critical"

# 5. plan-queue (Queue / Stacked Cards)
$ctx = Create-BaseCircle
$qBrush = New-Object System.Drawing.SolidBrush($primaryColor)
function Draw-RoundedCard($g, $brush, $x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc($x, $y, $r*2, $r*2, 180, 90)
    $p.AddArc($x+$w-$r*2, $y, $r*2, $r*2, 270, 90)
    $p.AddArc($x+$w-$r*2, $y+$h-$r*2, $r*2, $r*2, 0, 90)
    $p.AddArc($x, $y+$h-$r*2, $r*2, $r*2, 90, 90)
    $p.CloseFigure()
    $g.FillPath($brush, $p)
}
Draw-RoundedCard $ctx.Graphics $qBrush 37 42 54 11 3
Draw-RoundedCard $ctx.Graphics $qBrush 37 58 54 11 3
Draw-RoundedCard $ctx.Graphics $qBrush 37 74 54 11 3
$qBrush.Dispose()
Save-Icon $ctx "plan-queue"

# 6. quickCap (Camera / Viewfinder)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 6, 182, 212), 4.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
# Camera body
$ctx.Graphics.DrawRectangle($pen, 36, 46, 56, 40)
# Top notch
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(48, 46)),
    (New-Object System.Drawing.PointF(52, 40)),
    (New-Object System.Drawing.PointF(62, 40)),
    (New-Object System.Drawing.PointF(66, 46))
))
# Lens circle
$ctx.Graphics.DrawEllipse($pen, 53, 55, 22, 22)
$pen.Dispose()
Save-Icon $ctx "quickCap"

# 7. colorMaster (Color Dropper / Pipette)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 168, 85, 247), 5.0)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
# Dropper bulb and tube
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(40, 88)),
    (New-Object System.Drawing.PointF(49, 79)),
    (New-Object System.Drawing.PointF(74, 54)),
    (New-Object System.Drawing.PointF(83, 45)),
    (New-Object System.Drawing.PointF(83, 39)),
    (New-Object System.Drawing.PointF(89, 45)),
    (New-Object System.Drawing.PointF(79, 55)),
    (New-Object System.Drawing.PointF(55, 79)),
    (New-Object System.Drawing.PointF(46, 88)),
    (New-Object System.Drawing.PointF(40, 88))
))
$pen.Dispose()
Save-Icon $ctx "colorMaster"

# 8. screenRuler (Ruler)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 99, 102, 241), 4.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
# Ruler body
$ctx.Graphics.DrawRectangle($pen, 36, 52, 56, 24)
# Ticks
$ctx.Graphics.DrawLine($pen, 46, 52, 46, 61)
$ctx.Graphics.DrawLine($pen, 55, 52, 55, 65)
$ctx.Graphics.DrawLine($pen, 64, 52, 64, 61)
$ctx.Graphics.DrawLine($pen, 73, 52, 73, 65)
$ctx.Graphics.DrawLine($pen, 82, 52, 82, 61)
$pen.Dispose()
Save-Icon $ctx "screenRuler"

# 9. syncComplete (Sync Arrows)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 59, 130, 246), 5.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
# Upper arc
$ctx.Graphics.DrawArc($pen, 40, 40, 48, 48, 220, 100)
# Arrow 1
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(64, 34)),
    (New-Object System.Drawing.PointF(72, 41)),
    (New-Object System.Drawing.PointF(64, 48))
))
# Lower arc
$ctx.Graphics.DrawArc($pen, 40, 40, 48, 48, 40, 100)
# Arrow 2
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(64, 80)),
    (New-Object System.Drawing.PointF(56, 87)),
    (New-Object System.Drawing.PointF(64, 94))
))
$pen.Dispose()
Save-Icon $ctx "syncComplete"

# 10. update (Download / System update)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 14, 165, 233), 5.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
# Arrow shaft & head
$ctx.Graphics.DrawLine($pen, 64, 38, 64, 72)
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(52, 62)),
    (New-Object System.Drawing.PointF(64, 74)),
    (New-Object System.Drawing.PointF(76, 62))
))
# Tray
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(42, 78)),
    (New-Object System.Drawing.PointF(42, 88)),
    (New-Object System.Drawing.PointF(86, 88)),
    (New-Object System.Drawing.PointF(86, 78))
))
$pen.Dispose()
Save-Icon $ctx "update"

# 11. clipboard (Clipboard)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 20, 184, 166), 4.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
# Board
$ctx.Graphics.DrawRectangle($pen, 40, 44, 48, 50)
# Clip
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(54, 44)),
    (New-Object System.Drawing.PointF(54, 38)),
    (New-Object System.Drawing.PointF(74, 38)),
    (New-Object System.Drawing.PointF(74, 44))
))
# Paper lines
$ctx.Graphics.DrawLine($pen, 48, 56, 76, 56)
$ctx.Graphics.DrawLine($pen, 48, 66, 76, 66)
$ctx.Graphics.DrawLine($pen, 48, 76, 68, 76)
$pen.Dispose()
Save-Icon $ctx "clipboard"

# 12. error (Crash / Error - modern minimal shield with X)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 244, 63, 94), 5.5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
# Modern circle with X
$ctx.Graphics.DrawEllipse($pen, 36, 36, 56, 56)
$ctx.Graphics.DrawLine($pen, 52, 52, 76, 76)
$ctx.Graphics.DrawLine($pen, 76, 52, 52, 76)
$pen.Dispose()
Save-Icon $ctx "error"

# 13. test (Science Flask)
$ctx = Create-BaseCircle
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 245, 158, 11), 5.0)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
# Flask outline
$ctx.Graphics.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(58, 38)),
    (New-Object System.Drawing.PointF(58, 52)),
    (New-Object System.Drawing.PointF(42, 84)),
    (New-Object System.Drawing.PointF(86, 84)),
    (New-Object System.Drawing.PointF(70, 52)),
    (New-Object System.Drawing.PointF(70, 38))
))
# Liquid surface
$ctx.Graphics.DrawLine($pen, 49, 70, 79, 70)
$pen.Dispose()
Save-Icon $ctx "test"

Write-Host "All notification icons generated successfully!"
