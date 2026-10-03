param(
    [string]$SourcePath = "$PSScriptRoot/../src/assets/icon.png"
)

Add-Type -AssemblyName System.Drawing

$srcFull = [System.IO.Path]::GetFullPath($SourcePath)
if (!(Test-Path $srcFull)) {
    Write-Error "Source icon not found at: $srcFull"
    exit 1
}

Write-Host "Source image: $srcFull"
$srcImg = [System.Drawing.Bitmap]::FromFile($srcFull)

function Generate-Ico {
    param([System.Drawing.Bitmap]$SourceBitmap, [string]$OutputPath)
    
    $sizes = @(16, 24, 32, 48, 64, 128, 256)
    $pngStreams = @()
    
    foreach ($sz in $sizes) {
        $destBmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($destBmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($SourceBitmap, 0, 0, $sz, $sz)
        $g.Dispose()
        
        $ms = New-Object System.IO.MemoryStream
        $destBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $destBmp.Dispose()
        $pngStreams += ,$ms.ToArray()
        $ms.Dispose()
    }
    
    $outDir = [System.IO.Path]::GetDirectoryName($OutputPath)
    if (!(Test-Path $outDir)) {
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    }
    
    $fs = New-Object System.IO.FileStream($OutputPath, [System.IO.FileMode]::Create)
    $bw = New-Object System.IO.BinaryWriter($fs)
    
    # ICONDIR
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type 1 = Icon
    $bw.Write([uint16]$sizes.Count) # Count of frames
    
    $offset = 6 + ($sizes.Count * 16)
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $sz = $sizes[$i]
        $w = if ($sz -eq 256) { [byte]0 } else { [byte]$sz }
        $h = if ($sz -eq 256) { [byte]0 } else { [byte]$sz }
        $bytes = $pngStreams[$i]
        
        $bw.Write($w)
        $bw.Write($h)
        $bw.Write([byte]0) # color count (0 for 32bpp)
        $bw.Write([byte]0) # reserved
        $bw.Write([uint16]1) # planes
        $bw.Write([uint16]32) # bpp
        $bw.Write([uint32]$bytes.Length)
        $bw.Write([uint32]$offset)
        
        $offset += $bytes.Length
    }
    
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $bw.Write($pngStreams[$i])
    }
    
    $bw.Flush()
    $bw.Dispose()
    $fs.Dispose()
    
    $sizesStr = $sizes -join ', '
    Write-Host "Generated multi-resolution ICO: $OutputPath ($($sizes.Count) frames: $sizesStr px)"
}

$icoDest1 = [System.IO.Path]::GetFullPath("$PSScriptRoot/../electron/assets/icon.ico")
$icoDest2 = [System.IO.Path]::GetFullPath("$PSScriptRoot/../build/icon.ico")
Generate-Ico $srcImg $icoDest1
Generate-Ico $srcImg $icoDest2

# 2. Synchronize icon.png
$pngDestinations = @(
    "$PSScriptRoot/../public/icon.png",
    "$PSScriptRoot/../electron/assets/icon.png",
    "$PSScriptRoot/../build/icon.png"
)
foreach ($dst in $pngDestinations) {
    $full = [System.IO.Path]::GetFullPath($dst)
    Copy-Item -Path $srcFull -Destination $full -Force
    Write-Host "Synchronized PNG: $full"
}

# 3. Generate 64x64 Tray Icon PNG
$trayDest = [System.IO.Path]::GetFullPath("$PSScriptRoot/../electron/assets/tray-icon.png")
$trayBmp = New-Object System.Drawing.Bitmap(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gTray = [System.Drawing.Graphics]::FromImage($trayBmp)
$gTray.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gTray.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gTray.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gTray.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$gTray.Clear([System.Drawing.Color]::Transparent)
$gTray.DrawImage($srcImg, 0, 0, 64, 64)
$gTray.Dispose()
$trayBmp.Save($trayDest, [System.Drawing.Imaging.ImageFormat]::Png)
$trayBmp.Dispose()
Write-Host "Generated Tray Icon PNG: $trayDest"

$srcImg.Dispose()
Write-Host "Done!"
