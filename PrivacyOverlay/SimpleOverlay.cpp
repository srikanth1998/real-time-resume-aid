#include <windows.h>
#include <string>

// Global variables
const wchar_t CLASS_NAME[] = L"SimpleOverlayClass";
const wchar_t WINDOW_TITLE[] = L"Simple Privacy Overlay";
HWND g_hwnd = NULL;
bool g_isDragging = false;
POINT g_dragOffset = {0, 0};

// Window procedure function
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            
            // Get client area dimensions
            RECT rect;
            GetClientRect(hwnd, &rect);
            
            // Fill background with semi-transparent color
            HBRUSH brush = CreateSolidBrush(RGB(30, 30, 150));
            FillRect(hdc, &rect, brush);
            DeleteObject(brush);
            
            // Draw border to make overlay clearly visible
            HPEN pen = CreatePen(PS_SOLID, 2, RGB(255, 100, 100));
            SelectObject(hdc, pen);
            Rectangle(hdc, 0, 0, rect.right, rect.bottom);
            DeleteObject(pen);
            
            // Draw text indicator
            SetTextColor(hdc, RGB(255, 255, 255));
            SetBkMode(hdc, TRANSPARENT);
            std::wstring text = L"PRIVACY MASK\nDrag to move\nPress ESC to exit";
            DrawText(hdc, text.c_str(), -1, &rect, DT_CENTER | DT_VCENTER);
            
            EndPaint(hwnd, &ps);
            return 0;
        }

        case WM_LBUTTONDOWN: {
            // Start dragging
            g_isDragging = true;
            SetCapture(hwnd);
            
            // Calculate the offset for smooth dragging
            POINT pt = {LOWORD(lParam), HIWORD(lParam)};
            ClientToScreen(hwnd, &pt);
            
            RECT windowRect;
            GetWindowRect(hwnd, &windowRect);
            
            g_dragOffset.x = pt.x - windowRect.left;
            g_dragOffset.y = pt.y - windowRect.top;
            
            return 0;
        }

        case WM_MOUSEMOVE: {
            if (g_isDragging) {
                // Move window when dragging
                POINT pt = {LOWORD(lParam), HIWORD(lParam)};
                ClientToScreen(hwnd, &pt);
                
                // Calculate new position accounting for the drag offset
                int newX = pt.x - g_dragOffset.x;
                int newY = pt.y - g_dragOffset.y;
                
                SetWindowPos(hwnd, NULL, newX, newY, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
            }
            return 0;
        }

        case WM_LBUTTONUP: {
            // End dragging
            g_isDragging = false;
            ReleaseCapture();
            return 0;
        }

        case WM_KEYDOWN: {
            // Close on ESC key
            if (wParam == VK_ESCAPE) {
                DestroyWindow(hwnd);
            }
            return 0;
        }

        case WM_DESTROY: {
            PostQuitMessage(0);
            return 0;
        }
    }
    
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

// Main function
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // Register the window class
    WNDCLASS wc = {};
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    RegisterClass(&wc);
    
    // Create the window with layered style for transparency
    g_hwnd = CreateWindowEx(
        WS_EX_LAYERED | WS_EX_TOPMOST,  // Always on top with layered style
        CLASS_NAME,
        WINDOW_TITLE,
        WS_POPUP | WS_VISIBLE,  // Popup window with no border
        100, 100, 400, 200,
        NULL, NULL, hInstance, NULL
    );
    
    if (g_hwnd == NULL) {
        MessageBox(NULL, L"Failed to create window", L"Error", MB_OK | MB_ICONERROR);
        return 0;
    }
    
    // Set window transparency (75% opaque)
    SetLayeredWindowAttributes(g_hwnd, 0, 192, LWA_ALPHA);
    
    // Show the window
    ShowWindow(g_hwnd, nCmdShow);
    
    // Run the message loop
    MSG msg = {};
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    return 0;
}
