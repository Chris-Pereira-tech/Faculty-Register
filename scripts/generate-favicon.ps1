Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\chris\.gemini\antigravity\brain\6ab2170e-3a4c-4d25-9053-bf29faeb3ace\.user_uploaded\media_1792208435857_066719ce.jpg"
$src = [System.Drawing.Image]::FromFile($srcPath)

# 1. Copy original file
Copy-Item $srcPath "public\favicon-original.jpg" -Force

function Create-SquareIcon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Black)

    $scale = [Math]::Min($size / $src.Width, $size / $src.Height)
    $w = [int]($src.Width * $scale)
    $h = [int]($src.Height * $scale)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)

    $g.DrawImage($src, $x, $y, $w, $h)
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Create-SquareIcon 512 "public\favicon-512.png"
Create-SquareIcon 192 "public\favicon-192.png"
Create-SquareIcon 64 "public\favicon.png"
Create-SquareIcon 180 "public\apple-touch-icon.png"

# Also generate a .ico file
$icoBmp = [System.Drawing.Bitmap]::FromFile("public\favicon.png")
$hIcon = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream("public\favicon.ico", [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$icoBmp.Dispose()
$src.Dispose()

Write-Output "Favicons generated successfully"
