@echo off
echo Creating a simple icon for the Privacy Overlay application...

:: Create PowerShell script to generate an icon
echo $iconFile = "%CD%\privacy_icon.ico" > create_icon.ps1
echo $asm = [System.Reflection.Assembly]::LoadWithPartialName("System.Drawing") >> create_icon.ps1
echo $bmp = New-Object System.Drawing.Bitmap 64, 64 >> create_icon.ps1
echo $g = [System.Drawing.Graphics]::FromImage($bmp) >> create_icon.ps1
echo $g.Clear("DodgerBlue") >> create_icon.ps1
echo $p = New-Object System.Drawing.Pen "White", 2 >> create_icon.ps1
echo $g.DrawRectangle($p, 10, 10, 44, 44) >> create_icon.ps1
echo $b = New-Object System.Drawing.SolidBrush "Red" >> create_icon.ps1
echo $f = New-Object System.Drawing.Font "Arial", 24, "Bold" >> create_icon.ps1
echo $g.DrawString("P", $f, $b, 20, 15) >> create_icon.ps1
echo $bmp.Save("temp.png", [System.Drawing.Imaging.ImageFormat]::Png) >> create_icon.ps1
echo # Convert PNG to ICO using .NET >> create_icon.ps1
echo $ico = New-Object System.Drawing.Icon("temp.png") >> create_icon.ps1
echo $fs = [System.IO.File]::Create($iconFile) >> create_icon.ps1
echo $ico.Save($fs) >> create_icon.ps1
echo $fs.Close() >> create_icon.ps1
echo $ico.Dispose() >> create_icon.ps1
echo $g.Dispose() >> create_icon.ps1
echo $bmp.Dispose() >> create_icon.ps1
echo if (Test-Path "temp.png") { Remove-Item "temp.png" } >> create_icon.ps1

:: Run PowerShell script
powershell -ExecutionPolicy Bypass -File create_icon.ps1

:: Clean up
del create_icon.ps1

echo Icon created successfully!
echo.
echo If PowerShell was unable to create the icon, please use any image editor to
echo create a 32x32 or 64x64 pixel icon file named "privacy_icon.ico" in this folder.
echo.
pause
