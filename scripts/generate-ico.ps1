Add-Type -AssemblyName System.Drawing

function New-PointF([float]$x, [float]$y) {
    return [System.Drawing.PointF]::new($x, $y)
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$bitmaps = @()

foreach ($size in $sizes) {
    $bmp = [System.Drawing.Bitmap]::new([int]$size, [int]$size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $sx = [float]($size / 87.3)
    $sy = [float]($size / 78.0)
    $g.ScaleTransform($sx, $sy)

    # 1. Yellow Ribbon
    $bYellow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 186, 0))
    $pYellow = [System.Drawing.PointF[]]@(
        (New-PointF 29.9 1.2),
        (New-PointF 57.4 1.2),
        (New-PointF 84.9 47.0),
        (New-PointF 57.4 47.0)
    )
    $g.FillPolygon($bYellow, $pYellow)

    # 2. Red corner
    $bRed = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 234, 67, 53))
    $pRed = [System.Drawing.PointF[]]@(
        (New-PointF 73.55 76.8),
        (New-PointF 78.45 68.45),
        (New-PointF 86.1 55.2),
        (New-PointF 87.3 50.7),
        (New-PointF 59.8 50.7),
        (New-PointF 65.65 60.85),
        (New-PointF 73.55 76.8)
    )
    $g.FillPolygon($bRed, $pRed)

    # 3. Green Ribbon
    $bGreen = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 0, 172, 71))
    $pGreen = [System.Drawing.PointF[]]@(
        (New-PointF 13.75 76.8),
        (New-PointF 18.25 78.0),
        (New-PointF 69.05 78.0),
        (New-PointF 73.55 76.8),
        (New-PointF 59.8 53.0),
        (New-PointF 27.5 53.0)
    )
    $g.FillPolygon($bGreen, $pGreen)

    # 4. Darker Blue fold
    $bDarkBlue = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 0, 102, 218))
    $pDarkBlue = [System.Drawing.PointF[]]@(
        (New-PointF 6.6 66.85),
        (New-PointF 10.45 73.5),
        (New-PointF 13.75 76.8),
        (New-PointF 27.5 53.0),
        (New-PointF 0.0 53.0),
        (New-PointF 1.2 57.5),
        (New-PointF 6.6 66.85)
    )
    $g.FillPolygon($bDarkBlue, $pDarkBlue)

    # 5. Blue Ribbon
    $bBlue = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 38, 132, 252))
    $pBlue = [System.Drawing.PointF[]]@(
        (New-PointF 27.5 53.0),
        (New-PointF 13.75 76.8),
        (New-PointF 10.45 73.5),
        (New-PointF 0.05 51.5),
        (New-PointF 0.05 47.0),
        (New-PointF 24.05 3.0),
        (New-PointF 27.35 -0.3),
        (New-PointF 41.15 23.6),
        (New-PointF 27.5 53.0)
    )
    $g.FillPolygon($bBlue, $pBlue)

    # 6. Center white circle
    $bWhite = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $penCircle = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 226, 231, 238), [float]1.0)
    $cx = [float]43.65
    $cy = [float]43.8
    $r = [float]16.5
    $g.FillEllipse($bWhite, [float]($cx - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2))
    $g.DrawEllipse($penCircle, [float]($cx - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2))

    # 7. Number '9' in center
    $fontFamily = [System.Drawing.FontFamily]::new('Segoe UI')
    $fontSize = [float]($r * 1.35)
    $font = [System.Drawing.Font]::new($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $bText = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 11, 87, 208))
    $sf = [System.Drawing.StringFormat]::new()
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = [System.Drawing.RectangleF]::new([float]($cx - $r), [float]($cy - $r - 1.5), [float]($r * 2), [float]($r * 2 + 3))
    $g.DrawString('9', $font, $bText, $rect, $sf)

    $g.Dispose()
    $bitmaps += $bmp
}

$ms = [System.IO.MemoryStream]::new()
$bw = [System.IO.BinaryWriter]::new($ms)

$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$bitmaps.Count)

$pngBytesList = @()
foreach ($bmp in $bitmaps) {
    $pms = [System.IO.MemoryStream]::new()
    $bmp.Save($pms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytesList += ,$pms.ToArray()
    $pms.Dispose()
}

$offset = 6 + (16 * $bitmaps.Count)

for ($i = 0; $i -lt $bitmaps.Count; $i++) {
    $bmp = $bitmaps[$i]
    $pngData = $pngBytesList[$i]
    $w = if ($bmp.Width -ge 256) { [byte]0 } else { [byte]$bmp.Width }
    $h = if ($bmp.Height -ge 256) { [byte]0 } else { [byte]$bmp.Height }

    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$pngData.Length)
    $bw.Write([uint32]$offset)

    $offset += $pngData.Length
}

for ($i = 0; $i -lt $bitmaps.Count; $i++) {
    $bw.Write($pngBytesList[$i])
}

$bw.Flush()
$icoBytes = $ms.ToArray()
$bw.Dispose()
$ms.Dispose()

[System.IO.File]::WriteAllBytes('backend/public/favicon.ico', $icoBytes)
[System.IO.File]::WriteAllBytes('frontend/public/favicon.ico', $icoBytes)
[System.IO.File]::WriteAllBytes('frontend/dist/favicon.ico', $icoBytes)

Write-Host "Success! Generated multi-resolution ICO: $($icoBytes.Length) bytes with header $([BitConverter]::ToString($icoBytes, 0, 4))"
