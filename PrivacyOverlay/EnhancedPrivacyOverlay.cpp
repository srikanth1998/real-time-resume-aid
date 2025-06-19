#include <windows.h>
#include <commctrl.h>
#include "OverlayWindow.h"
#include "ControlPanel.h"

#pragma comment(lib, "comctl32.lib")

// Initialize GDI+ for screenshot functionality
struct GdiplusInitializer {
    ULONG_PTR token;
    
    GdiplusInitializer() {
        Gdiplus::GdiplusStartupInput input;
        Gdiplus::GdiplusStartup(&token, &input, NULL);
    }
    
    ~GdiplusInitializer() {
        Gdiplus::GdiplusShutdown(token);
    }
};

// Entry point
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
    // Initialize COM for audio monitoring
    CoInitialize(NULL);
    
    // Initialize common controls
    INITCOMMONCONTROLSEX icex = {0};
    icex.dwSize = sizeof(INITCOMMONCONTROLSEX);
    icex.dwICC = ICC_WIN95_CLASSES;
    InitCommonControlsEx(&icex);
    
    // Initialize GDI+ for screenshots
    GdiplusInitializer gdiplusInit;
    
    // Create overlay window
    OverlayWindow overlay;
    if (!overlay.Initialize(hInstance)) {
        MessageBox(NULL, L"Failed to initialize overlay window.", L"Error", MB_OK | MB_ICONERROR);
        CoUninitialize();
        return 1;
    }
    
    // Create control panel
    ControlPanel controlPanel;
    if (!controlPanel.Initialize(hInstance, &overlay)) {
        MessageBox(NULL, L"Failed to initialize control panel.", L"Error", MB_OK | MB_ICONERROR);
        CoUninitialize();
        return 1;
    }
    
    // Show windows
    overlay.Show();
    controlPanel.Show();
    
    // Message loop
    int result = controlPanel.MessageLoop();
    
    // Clean up COM
    CoUninitialize();
    
    return result;
}
