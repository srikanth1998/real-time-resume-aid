@echo off
echo Building AudioWhisperApp...

:: Create build directory if it doesn't exist
if not exist build mkdir build

:: Navigate to build directory
cd build

:: Run CMake
cmake ..

:: Build the project
cmake --build . --config Release

echo.
echo Build complete!
echo The executable is located in build\bin\Release\AudioWhisperApp.exe
echo.

pause
