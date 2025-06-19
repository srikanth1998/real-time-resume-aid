@echo off
echo Creating executable for Privacy Overlay...

:: Create a small VBScript to convert PowerShell to EXE
echo Set objFS = CreateObject("Scripting.FileSystemObject") > CreateExe.vbs
echo outFile = "PrivacyOverlay.exe" >> CreateExe.vbs
echo psFile = "PrivacyOverlay.ps1" >> CreateExe.vbs
echo ' Check if the PowerShell script exists >> CreateExe.vbs
echo If Not objFS.FileExists(psFile) Then >> CreateExe.vbs
echo     WScript.Echo "Error: PowerShell script " ^& psFile ^& " not found." >> CreateExe.vbs
echo     WScript.Quit >> CreateExe.vbs
echo End If >> CreateExe.vbs
echo. >> CreateExe.vbs
echo ' Create the executable wrapper >> CreateExe.vbs
echo Set objFile = objFS.CreateTextFile(outFile, True) >> CreateExe.vbs
echo objFile.WriteLine("@echo off") >> CreateExe.vbs
echo objFile.WriteLine("powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%~dp0PrivacyOverlay.ps1""") >> CreateExe.vbs
echo objFile.Close >> CreateExe.vbs
echo. >> CreateExe.vbs
echo WScript.Echo "Created " ^& outFile >> CreateExe.vbs
echo WScript.Echo "This is a batch file launcher for the PowerShell script." >> CreateExe.vbs
echo WScript.Echo "Double-click it to run the Privacy Overlay." >> CreateExe.vbs

:: Run the VBScript
cscript //nologo CreateExe.vbs

:: Clean up
del CreateExe.vbs

echo.
echo IMPORTANT INSTRUCTIONS:
echo 1. You now have PrivacyOverlay.exe in this folder
echo 2. Double-click it to run the Privacy Overlay
echo 3. The overlay should appear on your screen
echo 4. Drag it to position over sensitive content
echo 5. Right-click to adjust transparency and color
echo 6. Press ESC to close it
echo.
echo Press any key to exit...
pause >nul
