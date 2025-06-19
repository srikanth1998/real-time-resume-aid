#include "OverlayWindow.h"
#include <windowsx.h>

// Class name for window registration
const wchar_t* OVERLAY_CLASS_NAME = L"PrivacyOverlayWindowClass";

// Constructor
OverlayWindow::OverlayWindow()
    : m_hWnd(NULL)
    , m_hInstance(NULL)
    , m_color(RGB(0, 0, 255)) // Default blue
    , m_opacity(192)          // Default 75% opacity
    , m_isProtectionEnabled(true)
    , m_isDragging(false)
{
    // Initialize last mouse position
    m_lastMousePos.x = 0;
    m_lastMousePos.y = 0;
}

// Destructor
OverlayWindow::~OverlayWindow()
{
    // Save settings before closing
    OverlaySettings settings = m_settings.GetSettings();
    
    // Get window position and size
    if (m_hWnd) {
        RECT rect;
        GetWindowRect(m_hWnd, &rect);
        settings.x = rect.left;
        settings.y = rect.top;
        settings.width = rect.right - rect.left;
        settings.height = rect.bottom - rect.top;
    }
    
    // Update other settings
    settings.color = m_color;
    settings.opacity = m_opacity;
    settings.isProtectionEnabled = m_isProtectionEnabled;
    
    // Save settings
    m_settings.SetSettings(settings);
    m_settings.SaveSettings();
}

// Initialize the overlay window
bool OverlayWindow::Initialize(HINSTANCE hInstance)
{
    m_hInstance = hInstance;
    
    // Load settings
    m_settings.LoadSettings();
    OverlaySettings settings = m_settings.GetSettings();
    
    // Apply settings
    m_color = settings.color;
    m_opacity = settings.opacity;
    m_isProtectionEnabled = settings.isProtectionEnabled;
    
    // Create window
    if (!CreateOverlayWindow(hInstance)) {
        MessageBox(NULL, L"Failed to create overlay window.", L"Error", MB_OK | MB_ICONERROR);
        return false;
    }
    
    // Set window position and size
    SetWindowPos(
        m_hWnd,
        HWND_TOPMOST,
        settings.x,
        settings.y,
        settings.width,
        settings.height,
        SWP_SHOWWINDOW
    );
    
    // Apply screen sharing protection if enabled
    if (m_isProtectionEnabled) {
        ToggleScreenShareProtection();
    }
    
    // Update window appearance
    UpdateWindowAppearance();
    
    return true;
}

// Create the overlay window
bool OverlayWindow::CreateOverlayWindow(HINSTANCE hInstance)
{
    // Register window class
    WNDCLASSEX wc = {0};
    wc.cbSize = sizeof(WNDCLASSEX);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = hInstance;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.lpszClassName = OVERLAY_CLASS_NAME;
    
    if (!RegisterClassEx(&wc)) {
        return false;
    }
    
    // Create window with extended style for layering
    m_hWnd = CreateWindowEx(
        WS_EX_LAYERED | WS_EX_TOPMOST,
        OVERLAY_CLASS_NAME,
        L"Privacy Overlay",
        WS_POPUP,
        CW_USEDEFAULT, CW_USEDEFAULT, 400, 300,
        NULL,
        NULL,
        hInstance,
        this
    );
    
    if (!m_hWnd) {
        return false;
    }
    
    return true;
}

// Show the overlay
void OverlayWindow::Show()
{
    ShowWindow(m_hWnd, SW_SHOW);
    UpdateWindow(m_hWnd);
}

// Hide the overlay
void OverlayWindow::Hide()
{
    ShowWindow(m_hWnd, SW_HIDE);
}

// Toggle visibility
void OverlayWindow::ToggleVisibility()
{
    if (IsVisible()) {
        Hide();
    } else {
        Show();
    }
}

// Toggle screen share protection
void OverlayWindow::ToggleScreenShareProtection()
{
    m_isProtectionEnabled = !m_isProtectionEnabled;
    // Call the global function from ScreenProtection.h instead of recursively calling this method
    ::ToggleScreenShareProtection(m_hWnd, m_isProtectionEnabled);
}

// Set color
void OverlayWindow::SetColor(COLORREF color)
{
    m_color = color;
    UpdateWindowAppearance();
}

// Set opacity
void OverlayWindow::SetOpacity(int opacity)
{
    m_opacity = opacity;
    UpdateWindowAppearance();
}

// Set position
void OverlayWindow::SetPosition(int x, int y)
{
    SetWindowPos(m_hWnd, HWND_TOPMOST, x, y, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
}

// Set size
void OverlayWindow::SetSize(int width, int height)
{
    SetWindowPos(m_hWnd, HWND_TOPMOST, 0, 0, width, height, SWP_NOMOVE | SWP_NOZORDER);
    UpdateWindowAppearance();
}

// Update window appearance
void OverlayWindow::UpdateWindowAppearance()
{
    // Set window transparency and color
    SetLayeredWindowAttributes(m_hWnd, 0, m_opacity, LWA_ALPHA);
    
    // Force window redraw
    InvalidateRect(m_hWnd, NULL, TRUE);
}

// Create context menu
HMENU OverlayWindow::CreateContextMenu()
{
    HMENU hMenu = CreatePopupMenu();
    
    // Add menu items
    AppendMenu(hMenu, MF_STRING, 1, L"Toggle Protection");
    AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
    
    // Opacity submenu
    HMENU hOpacityMenu = CreatePopupMenu();
    AppendMenu(hOpacityMenu, MF_STRING, 10, L"25%");
    AppendMenu(hOpacityMenu, MF_STRING, 11, L"50%");
    AppendMenu(hOpacityMenu, MF_STRING, 12, L"75%");
    AppendMenu(hOpacityMenu, MF_STRING, 13, L"100%");
    AppendMenu(hMenu, MF_POPUP, (UINT_PTR)hOpacityMenu, L"Opacity");
    
    // Color submenu
    HMENU hColorMenu = CreatePopupMenu();
    AppendMenu(hColorMenu, MF_STRING, 20, L"Blue");
    AppendMenu(hColorMenu, MF_STRING, 21, L"Red");
    AppendMenu(hColorMenu, MF_STRING, 22, L"Green");
    AppendMenu(hColorMenu, MF_STRING, 23, L"Black");
    AppendMenu(hMenu, MF_POPUP, (UINT_PTR)hColorMenu, L"Color");
    
    // Additional options
    AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenu(hMenu, MF_STRING, 30, L"Close");
    
    return hMenu;
}

// Window procedure
LRESULT CALLBACK OverlayWindow::WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    // Get the window instance
    OverlayWindow* pThis = NULL;
    
    if (uMsg == WM_NCCREATE) {
        // Store the instance pointer in user data
        CREATESTRUCT* pCreate = (CREATESTRUCT*)lParam;
        pThis = (OverlayWindow*)pCreate->lpCreateParams;
        SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)pThis);
    } else {
        // Retrieve the instance pointer from user data
        pThis = (OverlayWindow*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
    }
    
    // Process messages
    if (pThis) {
        switch (uMsg) {
            case WM_PAINT:
            {
                // Paint the window
                PAINTSTRUCT ps;
                HDC hdc = BeginPaint(hwnd, &ps);
                
                // Get window dimensions
                RECT rect;
                GetClientRect(hwnd, &rect);
                
                // Fill with color
                HBRUSH brush = CreateSolidBrush(pThis->m_color);
                FillRect(hdc, &rect, brush);
                DeleteObject(brush);
                
                // Draw border
                FrameRect(hdc, &rect, (HBRUSH)GetStockObject(WHITE_BRUSH));
                
                // Draw protection indicator
                if (pThis->m_isProtectionEnabled) {
                    HBRUSH greenBrush = CreateSolidBrush(RGB(0, 255, 0));
                    RECT indicatorRect = { rect.right - 20, rect.top + 10, rect.right - 5, rect.top + 25 };
                    FillRect(hdc, &indicatorRect, greenBrush);
                    DeleteObject(greenBrush);
                }
                
                EndPaint(hwnd, &ps);
                return 0;
            }
            
            case WM_LBUTTONDOWN:
            {
                // Start dragging
                pThis->m_isDragging = true;
                pThis->m_lastMousePos.x = GET_X_LPARAM(lParam);
                pThis->m_lastMousePos.y = GET_Y_LPARAM(lParam);
                SetCapture(hwnd);
                return 0;
            }
            
            case WM_MOUSEMOVE:
            {
                // Handle dragging
                if (pThis->m_isDragging) {
                    int x = GET_X_LPARAM(lParam);
                    int y = GET_Y_LPARAM(lParam);
                    
                    // Calculate movement delta
                    int deltaX = x - pThis->m_lastMousePos.x;
                    int deltaY = y - pThis->m_lastMousePos.y;
                    
                    // Get current window position
                    RECT rect;
                    GetWindowRect(hwnd, &rect);
                    
                    // Move the window
                    SetWindowPos(
                        hwnd,
                        NULL,
                        rect.left + deltaX,
                        rect.top + deltaY,
                        0, 0,
                        SWP_NOSIZE | SWP_NOZORDER
                    );
                }
                return 0;
            }
            
            case WM_LBUTTONUP:
            {
                // Stop dragging
                pThis->m_isDragging = false;
                ReleaseCapture();
                return 0;
            }
            
            case WM_RBUTTONUP:
            {
                // Show context menu
                POINT pt = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };
                ClientToScreen(hwnd, &pt);
                
                HMENU hMenu = pThis->CreateContextMenu();
                TrackPopupMenu(hMenu, TPM_LEFTALIGN | TPM_TOPALIGN, pt.x, pt.y, 0, hwnd, NULL);
                DestroyMenu(hMenu);
                
                return 0;
            }
            
            case WM_COMMAND:
            {
                // Handle menu commands
                int wmId = LOWORD(wParam);
                
                switch (wmId) {
                    case 1: // Toggle Protection
                        pThis->ToggleScreenShareProtection();
                        break;
                    
                    case 10: // 25% Opacity
                        pThis->SetOpacity(64);
                        break;
                        
                    case 11: // 50% Opacity
                        pThis->SetOpacity(128);
                        break;
                        
                    case 12: // 75% Opacity
                        pThis->SetOpacity(192);
                        break;
                        
                    case 13: // 100% Opacity
                        pThis->SetOpacity(255);
                        break;
                        
                    case 20: // Blue color
                        pThis->SetColor(RGB(0, 0, 255));
                        break;
                        
                    case 21: // Red color
                        pThis->SetColor(RGB(255, 0, 0));
                        break;
                        
                    case 22: // Green color
                        pThis->SetColor(RGB(0, 255, 0));
                        break;
                        
                    case 23: // Black color
                        pThis->SetColor(RGB(0, 0, 0));
                        break;
                        
                    case 30: // Close
                        DestroyWindow(hwnd);
                        break;
                }
                
                return 0;
            }
            
            case WM_KEYDOWN:
            {
                // Handle keyboard shortcuts
                if (wParam == VK_ESCAPE) {
                    DestroyWindow(hwnd);
                }
                return 0;
            }
            
            case WM_DESTROY:
            {
                PostQuitMessage(0);
                return 0;
            }
        }
    }
    
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}
