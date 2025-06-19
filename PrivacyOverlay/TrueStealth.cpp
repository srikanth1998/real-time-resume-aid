#ifndef UNICODE
#define UNICODE
#endif

#ifndef _UNICODE
#define _UNICODE
#endif

#include <windows.h>
#include <dwmapi.h>
#include <gdiplus.h>
#include <string>

#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "gdiplus.lib")

// Define DWM cloaking attribute if not already defined
#ifndef DWMWA_CLOAK
#define DWMWA_CLOAK 13
#endif

// Global variables
HWND g_overlayWindow = NULL;    // Will be invisible during screen sharing
HWND g_indicatorWindow = NULL;  // Always visible small indicator window
HWND g_controlWindow = NULL;
bool g_isProtectionEnabled = false;
COLORREF g_overlayColor = RGB(0, 0, 255); // Default blue
int g_overlayOpacity = 192; // 0-255 (0=transparent, 255=opaque)
HINSTANCE g_hInstance = NULL;

// Forward declarations
LRESULT CALLBACK OverlayWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
LRESULT CALLBACK IndicatorWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
LRESULT CALLBACK ControlWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
void CreateOverlayWindow();
void CreateIndicatorWindow();
void CreateControlWindow();
void ToggleProtection(bool enable);
void UpdateOverlayAppearance();

// Main entry point
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
    g_hInstance = hInstance;
    
    // Initialize GDI+
    Gdiplus::GdiplusStartupInput gdiplusStartupInput;
    ULONG_PTR gdiplusToken;
    Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL);
    
    // Create windows
    CreateOverlayWindow();
    CreateIndicatorWindow();
    CreateControlWindow();
    
    // Show windows
    ShowWindow(g_overlayWindow, SW_SHOW);
    ShowWindow(g_indicatorWindow, SW_SHOW);
    ShowWindow(g_controlWindow, SW_SHOW);
    UpdateWindow(g_overlayWindow);
    UpdateWindow(g_indicatorWindow);
    UpdateWindow(g_controlWindow);
    
    // Message loop
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0))
    {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    // Cleanup GDI+
    Gdiplus::GdiplusShutdown(gdiplusToken);
    
    return (int)msg.wParam;
}

// Create overlay window
void CreateOverlayWindow()
{
    // Register window class
    WNDCLASSEX wcex = {0};
    wcex.cbSize = sizeof(WNDCLASSEX);
    wcex.style = CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc = OverlayWindowProc;
    wcex.hInstance = g_hInstance;
    wcex.hCursor = LoadCursor(NULL, IDC_ARROW);
    wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wcex.lpszClassName = L"TrueStealthOverlayClass";
    
    RegisterClassEx(&wcex);
    
    // Create window
    g_overlayWindow = CreateWindowEx(
        WS_EX_LAYERED | WS_EX_TOPMOST,
        L"TrueStealthOverlayClass",
        L"Privacy Overlay",
        WS_POPUP,
        100, 100, 400, 300,
        NULL,
        NULL,
        g_hInstance,
        NULL
    );
    
    if (!g_overlayWindow)
    {
        MessageBox(NULL, L"Failed to create overlay window.", L"Error", MB_OK | MB_ICONERROR);
        return;
    }
    
    // Set window transparency
    SetLayeredWindowAttributes(g_overlayWindow, 0, g_overlayOpacity, LWA_ALPHA);
}

// Create indicator window (small dot that shows protection status)
void CreateIndicatorWindow()
{
    // Register window class
    WNDCLASSEX wcex = {0};
    wcex.cbSize = sizeof(WNDCLASSEX);
    wcex.style = CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc = IndicatorWindowProc;
    wcex.hInstance = g_hInstance;
    wcex.hCursor = LoadCursor(NULL, IDC_ARROW);
    wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wcex.lpszClassName = L"TrueStealthIndicatorClass";
    
    RegisterClassEx(&wcex);
    
    // Create window - a small 20x20 indicator dot
    g_indicatorWindow = CreateWindowEx(
        WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        L"TrueStealthIndicatorClass",
        L"Protection Status",
        WS_POPUP,
        10, 10, 20, 20,
        NULL,
        NULL,
        g_hInstance,
        NULL
    );
    
    if (!g_indicatorWindow)
    {
        MessageBox(NULL, L"Failed to create indicator window.", L"Error", MB_OK | MB_ICONERROR);
        return;
    }
    
    // Set window transparency
    SetLayeredWindowAttributes(g_indicatorWindow, 0, 255, LWA_ALPHA);
}

// Create control window
void CreateControlWindow()
{
    // Register window class
    WNDCLASSEX wcex = {0};
    wcex.cbSize = sizeof(WNDCLASSEX);
    wcex.style = CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc = ControlWindowProc;
    wcex.hInstance = g_hInstance;
    wcex.hCursor = LoadCursor(NULL, IDC_ARROW);
    wcex.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
    wcex.lpszClassName = L"TrueStealthControlClass";
    
    RegisterClassEx(&wcex);
    
    // Create window
    g_controlWindow = CreateWindowEx(
        0,
        L"TrueStealthControlClass",
        L"Privacy Overlay Controls",
        WS_OVERLAPPEDWINDOW & ~WS_THICKFRAME & ~WS_MAXIMIZEBOX,
        600, 100, 300, 250,
        NULL,
        NULL,
        g_hInstance,
        NULL
    );
    
    if (!g_controlWindow)
    {
        MessageBox(NULL, L"Failed to create control window.", L"Error", MB_OK | MB_ICONERROR);
        return;
    }
}

// Toggle overlay protection - uses DWM cloaking
void ToggleProtection(bool enable)
{
    g_isProtectionEnabled = enable;
    
    // Apply cloak to make the overlay invisible to screen capture
    DWORD value = enable ? 1 : 0;
    DwmSetWindowAttribute(g_overlayWindow, DWMWA_CLOAK, &value, sizeof(value));
    
    // Update the indicator color based on protection status
    InvalidateRect(g_indicatorWindow, NULL, TRUE);
    
    // Force redraw of control window
    InvalidateRect(g_controlWindow, NULL, TRUE);
}

// Update overlay appearance
void UpdateOverlayAppearance()
{
    // Set window transparency and color
    SetLayeredWindowAttributes(g_overlayWindow, 0, g_overlayOpacity, LWA_ALPHA);
    
    // Force redraw
    InvalidateRect(g_overlayWindow, NULL, TRUE);
}

// Overlay window procedure
LRESULT CALLBACK OverlayWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    switch (uMsg)
    {
        case WM_PAINT:
        {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            
            RECT rect;
            GetClientRect(hwnd, &rect);
            
            // Create a solid brush with the overlay color
            HBRUSH brush = CreateSolidBrush(g_overlayColor);
            
            // Fill the window with the color
            FillRect(hdc, &rect, brush);
            
            // Clean up
            DeleteObject(brush);
            EndPaint(hwnd, &ps);
            return 0;
        }
        
        case WM_LBUTTONDOWN:
        {
            // Allow dragging the window
            ReleaseCapture();
            SendMessage(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            return 0;
        }
        
        case WM_RBUTTONUP:
        {
            // Show context menu on right-click
            POINT pt;
            pt.x = LOWORD(lParam);
            pt.y = HIWORD(lParam);
            ClientToScreen(hwnd, &pt);
            
            HMENU menu = CreatePopupMenu();
            AppendMenu(menu, MF_STRING, 1, L"Toggle Protection");
            AppendMenu(menu, MF_SEPARATOR, 0, NULL);
            AppendMenu(menu, MF_STRING, 2, L"Blue");
            AppendMenu(menu, MF_STRING, 3, L"Red");
            AppendMenu(menu, MF_STRING, 4, L"Green");
            AppendMenu(menu, MF_STRING, 5, L"Black");
            AppendMenu(menu, MF_SEPARATOR, 0, NULL);
            AppendMenu(menu, MF_STRING, 6, L"25% Opacity");
            AppendMenu(menu, MF_STRING, 7, L"50% Opacity");
            AppendMenu(menu, MF_STRING, 8, L"75% Opacity");
            AppendMenu(menu, MF_STRING, 9, L"90% Opacity");
            AppendMenu(menu, MF_SEPARATOR, 0, NULL);
            AppendMenu(menu, MF_STRING, 10, L"Close");
            
            int cmd = TrackPopupMenu(
                menu,
                TPM_RETURNCMD | TPM_RIGHTBUTTON,
                pt.x, pt.y,
                0,
                hwnd,
                NULL
            );
            
            DestroyMenu(menu);
            
            // Handle menu commands
            switch (cmd)
            {
                case 1: // Toggle Protection
                    ToggleProtection(!g_isProtectionEnabled);
                    break;
                case 2: // Blue
                    g_overlayColor = RGB(0, 0, 255);
                    UpdateOverlayAppearance();
                    break;
                case 3: // Red
                    g_overlayColor = RGB(255, 0, 0);
                    UpdateOverlayAppearance();
                    break;
                case 4: // Green
                    g_overlayColor = RGB(0, 255, 0);
                    UpdateOverlayAppearance();
                    break;
                case 5: // Black
                    g_overlayColor = RGB(0, 0, 0);
                    UpdateOverlayAppearance();
                    break;
                case 6: // 25% Opacity
                    g_overlayOpacity = 64;
                    UpdateOverlayAppearance();
                    break;
                case 7: // 50% Opacity
                    g_overlayOpacity = 128;
                    UpdateOverlayAppearance();
                    break;
                case 8: // 75% Opacity
                    g_overlayOpacity = 192;
                    UpdateOverlayAppearance();
                    break;
                case 9: // 90% Opacity
                    g_overlayOpacity = 230;
                    UpdateOverlayAppearance();
                    break;
                case 10: // Close
                    PostQuitMessage(0);
                    break;
            }
            return 0;
        }
        
        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;
    }
    
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

// Indicator window procedure
LRESULT CALLBACK IndicatorWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    switch (uMsg)
    {
        case WM_PAINT:
        {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            
            RECT rect;
            GetClientRect(hwnd, &rect);
            
            // Green if protected, red if not
            COLORREF indicatorColor = g_isProtectionEnabled ? RGB(0, 255, 0) : RGB(255, 0, 0);
            HBRUSH brush = CreateSolidBrush(indicatorColor);
            
            // Fill with a circle
            Ellipse(hdc, 0, 0, rect.right, rect.bottom);
            
            // Clean up
            DeleteObject(brush);
            EndPaint(hwnd, &ps);
            return 0;
        }
        
        case WM_LBUTTONDOWN:
        {
            // Allow dragging
            ReleaseCapture();
            SendMessage(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            return 0;
        }
        
        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;
    }
    
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

// Control window procedure
LRESULT CALLBACK ControlWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    static HWND btnToggleOverlay = NULL;
    static HWND btnToggleProtection = NULL;
    static HWND lblStatus = NULL;
    static HWND lblInstructions = NULL;
    
    switch (uMsg)
    {
        case WM_CREATE:
        {
            // Create buttons
            btnToggleOverlay = CreateWindow(
                L"BUTTON", 
                L"Toggle Overlay",
                WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                10, 10, 270, 30,
                hwnd, 
                (HMENU)101, 
                g_hInstance,
                NULL
            );
            
            btnToggleProtection = CreateWindow(
                L"BUTTON", 
                L"ENABLE Protection",
                WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
                10, 50, 270, 50,
                hwnd, 
                (HMENU)102, 
                g_hInstance,
                NULL
            );
            
            // Add status text
            lblStatus = CreateWindow(
                L"STATIC",
                L"Protection Status: NOT PROTECTED",
                WS_VISIBLE | WS_CHILD | SS_CENTER,
                10, 110, 270, 30,
                hwnd,
                (HMENU)200,
                g_hInstance,
                NULL
            );
            
            // Add instructions text
            lblInstructions = CreateWindow(
                L"STATIC",
                L"When protected, the blue overlay will be invisible\r\n"
                L"during screen sharing. The small green indicator\r\n"
                L"will be visible to remind you protection is enabled.",
                WS_VISIBLE | WS_CHILD | SS_CENTER,
                10, 150, 270, 80,
                hwnd,
                (HMENU)201,
                g_hInstance,
                NULL
            );
            
            return 0;
        }
        
        case WM_COMMAND:
        {
            int wmId = LOWORD(wParam);
            
            switch (wmId)
            {
                case 101: // Toggle Overlay
                    if (IsWindowVisible(g_overlayWindow))
                        ShowWindow(g_overlayWindow, SW_HIDE);
                    else
                        ShowWindow(g_overlayWindow, SW_SHOW);
                    break;
                    
                case 102: // Toggle Protection
                    ToggleProtection(!g_isProtectionEnabled);
                    SetWindowText(btnToggleProtection, g_isProtectionEnabled ? L"DISABLE Protection" : L"ENABLE Protection");
                    SetWindowText(lblStatus, g_isProtectionEnabled ? 
                                 L"Protection Status: PROTECTED" : 
                                 L"Protection Status: NOT PROTECTED");
                    break;
            }
            break;
        }
        
        case WM_CLOSE:
            DestroyWindow(g_overlayWindow);
            DestroyWindow(g_indicatorWindow);
            DestroyWindow(hwnd);
            return 0;
            
        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;
    }
    
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}
