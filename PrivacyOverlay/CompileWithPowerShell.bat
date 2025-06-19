@echo off
echo Attempting to compile SimpleOverlay.cpp using PowerShell and .NET...

:: Create PowerShell script for compilation
echo $code = @' > compile.ps1
echo #include ^<windows.h^> >> compile.ps1
echo #include ^<string^> >> compile.ps1
echo. >> compile.ps1
echo // Global variables >> compile.ps1
echo const wchar_t CLASS_NAME[] = L"SimpleOverlayClass"; >> compile.ps1
echo const wchar_t WINDOW_TITLE[] = L"Simple Privacy Overlay"; >> compile.ps1
echo HWND g_hwnd = NULL; >> compile.ps1
echo bool g_isDragging = false; >> compile.ps1
echo POINT g_dragOffset = {0, 0}; >> compile.ps1
echo. >> compile.ps1
echo // Window procedure function >> compile.ps1
echo LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) { >> compile.ps1
echo     switch (uMsg) { >> compile.ps1
echo         case WM_PAINT: { >> compile.ps1
echo             PAINTSTRUCT ps; >> compile.ps1
echo             HDC hdc = BeginPaint(hwnd, ^&ps); >> compile.ps1
echo             >> compile.ps1
echo             // Get client area dimensions >> compile.ps1
echo             RECT rect; >> compile.ps1
echo             GetClientRect(hwnd, ^&rect); >> compile.ps1
echo             >> compile.ps1
echo             // Fill background with semi-transparent color >> compile.ps1
echo             HBRUSH brush = CreateSolidBrush(RGB(30, 30, 150)); >> compile.ps1
echo             FillRect(hdc, ^&rect, brush); >> compile.ps1
echo             DeleteObject(brush); >> compile.ps1
echo             >> compile.ps1
echo             // Draw border to make overlay clearly visible >> compile.ps1
echo             HPEN pen = CreatePen(PS_SOLID, 2, RGB(255, 100, 100)); >> compile.ps1
echo             SelectObject(hdc, pen); >> compile.ps1
echo             Rectangle(hdc, 0, 0, rect.right, rect.bottom); >> compile.ps1
echo             DeleteObject(pen); >> compile.ps1
echo             >> compile.ps1
echo             // Draw text indicator >> compile.ps1
echo             SetTextColor(hdc, RGB(255, 255, 255)); >> compile.ps1
echo             SetBkMode(hdc, TRANSPARENT); >> compile.ps1
echo             std::wstring text = L"PRIVACY MASK\nDrag to move\nPress ESC to exit"; >> compile.ps1
echo             DrawText(hdc, text.c_str(), -1, ^&rect, DT_CENTER | DT_VCENTER); >> compile.ps1
echo             >> compile.ps1
echo             EndPaint(hwnd, ^&ps); >> compile.ps1
echo             return 0; >> compile.ps1
echo         } >> compile.ps1
echo. >> compile.ps1
echo         case WM_LBUTTONDOWN: { >> compile.ps1
echo             // Start dragging >> compile.ps1
echo             g_isDragging = true; >> compile.ps1
echo             SetCapture(hwnd); >> compile.ps1
echo             >> compile.ps1
echo             // Calculate the offset for smooth dragging >> compile.ps1
echo             POINT pt = {LOWORD(lParam), HIWORD(lParam)}; >> compile.ps1
echo             ClientToScreen(hwnd, ^&pt); >> compile.ps1
echo             >> compile.ps1
echo             RECT windowRect; >> compile.ps1
echo             GetWindowRect(hwnd, ^&windowRect); >> compile.ps1
echo             >> compile.ps1
echo             g_dragOffset.x = pt.x - windowRect.left; >> compile.ps1
echo             g_dragOffset.y = pt.y - windowRect.top; >> compile.ps1
echo             >> compile.ps1
echo             return 0; >> compile.ps1
echo         } >> compile.ps1
echo. >> compile.ps1
echo         case WM_MOUSEMOVE: { >> compile.ps1
echo             if (g_isDragging) { >> compile.ps1
echo                 // Move window when dragging >> compile.ps1
echo                 POINT pt = {LOWORD(lParam), HIWORD(lParam)}; >> compile.ps1
echo                 ClientToScreen(hwnd, ^&pt); >> compile.ps1
echo                 >> compile.ps1
echo                 // Calculate new position accounting for the drag offset >> compile.ps1
echo                 int newX = pt.x - g_dragOffset.x; >> compile.ps1
echo                 int newY = pt.y - g_dragOffset.y; >> compile.ps1
echo                 >> compile.ps1
echo                 SetWindowPos(hwnd, NULL, newX, newY, 0, 0, SWP_NOSIZE | SWP_NOZORDER); >> compile.ps1
echo             } >> compile.ps1
echo             return 0; >> compile.ps1
echo         } >> compile.ps1
echo. >> compile.ps1
echo         case WM_LBUTTONUP: { >> compile.ps1
echo             // End dragging >> compile.ps1
echo             g_isDragging = false; >> compile.ps1
echo             ReleaseCapture(); >> compile.ps1
echo             return 0; >> compile.ps1
echo         } >> compile.ps1
echo. >> compile.ps1
echo         case WM_KEYDOWN: { >> compile.ps1
echo             // Close on ESC key >> compile.ps1
echo             if (wParam == VK_ESCAPE) { >> compile.ps1
echo                 DestroyWindow(hwnd); >> compile.ps1
echo             } >> compile.ps1
echo             return 0; >> compile.ps1
echo         } >> compile.ps1
echo. >> compile.ps1
echo         case WM_DESTROY: { >> compile.ps1
echo             PostQuitMessage(0); >> compile.ps1
echo             return 0; >> compile.ps1
echo         } >> compile.ps1
echo     } >> compile.ps1
echo     >> compile.ps1
echo     return DefWindowProc(hwnd, uMsg, wParam, lParam); >> compile.ps1
echo } >> compile.ps1
echo. >> compile.ps1
echo // Main function >> compile.ps1
echo int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) { >> compile.ps1
echo     // Register the window class >> compile.ps1
echo     WNDCLASS wc = {}; >> compile.ps1
echo     wc.lpfnWndProc = WindowProc; >> compile.ps1
echo     wc.hInstance = hInstance; >> compile.ps1
echo     wc.lpszClassName = CLASS_NAME; >> compile.ps1
echo     wc.hCursor = LoadCursor(NULL, IDC_ARROW); >> compile.ps1
echo     RegisterClass(^&wc); >> compile.ps1
echo     >> compile.ps1
echo     // Create the window with layered style for transparency >> compile.ps1
echo     g_hwnd = CreateWindowEx( >> compile.ps1
echo         WS_EX_LAYERED | WS_EX_TOPMOST,  // Always on top with layered style >> compile.ps1
echo         CLASS_NAME, >> compile.ps1
echo         WINDOW_TITLE, >> compile.ps1
echo         WS_POPUP | WS_VISIBLE,  // Popup window with no border >> compile.ps1
echo         100, 100, 400, 200, >> compile.ps1
echo         NULL, NULL, hInstance, NULL >> compile.ps1
echo     ); >> compile.ps1
echo     >> compile.ps1
echo     if (g_hwnd == NULL) { >> compile.ps1
echo         MessageBox(NULL, L"Failed to create window", L"Error", MB_OK | MB_ICONERROR); >> compile.ps1
echo         return 0; >> compile.ps1
echo     } >> compile.ps1
echo     >> compile.ps1
echo     // Set window transparency (75%% opaque) >> compile.ps1
echo     SetLayeredWindowAttributes(g_hwnd, 0, 192, LWA_ALPHA); >> compile.ps1
echo     >> compile.ps1
echo     // Show the window >> compile.ps1
echo     ShowWindow(g_hwnd, nCmdShow); >> compile.ps1
echo     >> compile.ps1
echo     // Run the message loop >> compile.ps1
echo     MSG msg = {}; >> compile.ps1
echo     while (GetMessage(^&msg, NULL, 0, 0)) { >> compile.ps1
echo         TranslateMessage(^&msg); >> compile.ps1
echo         DispatchMessage(^&msg); >> compile.ps1
echo     } >> compile.ps1
echo     >> compile.ps1
echo     return 0; >> compile.ps1
echo } >> compile.ps1
echo '@ >> compile.ps1
echo. >> compile.ps1
echo # Output path for the C++ file >> compile.ps1
echo $outputFile = "SimpleOverlay_build.cpp" >> compile.ps1
echo Set-Content -Path $outputFile -Value $code >> compile.ps1
echo. >> compile.ps1
echo Write-Host "Generated C++ file for SimpleOverlay..." >> compile.ps1
echo. >> compile.ps1
echo # Try to find Visual C++ compiler using vswhere >> compile.ps1
echo try { >> compile.ps1
echo     $vsPath = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath 2^>$null >> compile.ps1
echo     if ($vsPath) { >> compile.ps1
echo         Write-Host "Visual Studio found at: $vsPath" >> compile.ps1
echo         $vcvarsPath = "$vsPath\VC\Auxiliary\Build\vcvars64.bat" >> compile.ps1
echo         if (Test-Path $vcvarsPath) { >> compile.ps1
echo             Write-Host "Found Visual C++ environment script: $vcvarsPath" >> compile.ps1
echo             Write-Host "Creating batch file to compile with Visual C++..." >> compile.ps1
echo             $batchContent = @" >> compile.ps1
echo @echo off >> compile.ps1
echo call "$vcvarsPath" >> compile.ps1
echo cl /EHsc /std:c++17 /Fe:PrivacyOverlay.exe SimpleOverlay_build.cpp /link user32.lib gdi32.lib dwmapi.lib /SUBSYSTEM:WINDOWS >> compile.ps1
echo "@ >> compile.ps1
echo             Set-Content -Path "compile_with_cl.bat" -Value $batchContent >> compile.ps1
echo             Write-Host "Execute compile_with_cl.bat to build the executable" >> compile.ps1
echo         } else { >> compile.ps1
echo             Write-Host "Visual C++ environment script not found." >> compile.ps1
echo         } >> compile.ps1
echo     } else { >> compile.ps1
echo         Write-Host "Visual Studio installation not found using vswhere." >> compile.ps1
echo     } >> compile.ps1
echo } catch { >> compile.ps1
echo     Write-Host "Error detecting Visual Studio: $_" >> compile.ps1
echo } >> compile.ps1

:: Run the PowerShell script
powershell -ExecutionPolicy Bypass -File compile.ps1

:: Clean up
del compile.ps1

:: Try to compile if a compiler batch file was created
if exist compile_with_cl.bat (
    echo.
    echo Attempting to compile with Visual C++...
    call compile_with_cl.bat
    if exist PrivacyOverlay.exe (
        echo.
        echo SUCCESS! PrivacyOverlay.exe has been created!
        echo You can run it by double-clicking the file.
    ) else (
        echo.
        echo Compilation failed. You may need to manually compile using Visual Studio.
    )
) else (
    echo.
    echo No suitable compiler was found.
    echo.
    echo To get a pre-compiled executable, you'll need to install a C++ compiler:
    echo 1. Install Visual Studio Community with "Desktop development with C++" workload
    echo 2. Or install MinGW-w64 and add it to your PATH
    echo.
    echo Once you have a compiler installed, run compile_simple.bat again.
)

echo.
echo Press any key to exit...
pause >nul
