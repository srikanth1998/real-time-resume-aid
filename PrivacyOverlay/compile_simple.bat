@echo off
echo ===== SIMPLE PRIVACY OVERLAY COMPILER =====
echo.

:: Try to find MinGW g++
where g++ >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo G++ compiler found, attempting to compile...
    g++ -o SimpleOverlay.exe SimpleOverlay.cpp -lgdi32 -luser32 -mwindows
    if %ERRORLEVEL% EQU 0 (
        echo Compilation successful!
        echo You can now run SimpleOverlay.exe
    ) else (
        echo Compilation failed. Please check the error messages above.
    )
) else (
    echo G++ compiler not found.
    echo.
    echo To compile this application, you need either:
    echo 1. MinGW/G++ compiler:
    echo    Run: g++ -o SimpleOverlay.exe SimpleOverlay.cpp -lgdi32 -luser32 -mwindows
    echo.
    echo 2. Visual Studio:
    echo    - Open Developer Command Prompt
    echo    - Navigate to this directory
    echo    - Run: cl SimpleOverlay.cpp /link user32.lib gdi32.lib /SUBSYSTEM:WINDOWS
)

echo.
echo Press any key to exit...
pause >nul
