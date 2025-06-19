@echo off
echo Building Enhanced Privacy Overlay...

REM Check if Visual Studio is installed and set up environment
where cl >nul 2>&1
if %errorlevel% neq 0 (
    echo Trying to find Visual Studio installation...
    
    REM Try to find Visual Studio installation
    if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
        echo Found Visual Studio 2022 Community...
        call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
    ) else if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" (
        echo Found Visual Studio 2019 Community...
        call "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat"
    ) else if exist "C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\VC\Auxiliary\Build\vcvars64.bat" (
        echo Found Visual Studio 2017 Community...
        call "C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\VC\Auxiliary\Build\vcvars64.bat"
    ) else (
        echo Visual Studio not found. Please install Visual Studio with C++ desktop development workload.
        exit /b 1
    )
)

REM Create build directory
if not exist build mkdir build

REM Compile the program
echo Compiling...
cl /EHsc /W4 /std:c++17 /O2 /Fe:build\PrivacyOverlay.exe EnhancedPrivacyOverlay.cpp OverlayWindow.cpp ControlPanel.cpp /link user32.lib gdi32.lib comctl32.lib dwmapi.lib ole32.lib gdiplus.lib

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)

echo Build completed successfully!
echo Executable location: build\PrivacyOverlay.exe

REM Open the build directory
explorer build\
