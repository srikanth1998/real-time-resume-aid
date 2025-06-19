$code = @' 
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
ECHO is off.
            // Get client area dimensions 
            RECT rect; 
            GetClientRect(hwnd, &rect); 
ECHO is off.
            // Fill background with semi-transparent color 
            HBRUSH brush = CreateSolidBrush(RGB(30, 30, 150)); 
            FillRect(hdc, &rect, brush); 
            DeleteObject(brush); 
ECHO is off.
            // Draw border to make overlay clearly visible 
            HPEN pen = CreatePen(PS_SOLID, 2, RGB(255, 100, 100)); 
            SelectObject(hdc, pen); 
            Rectangle(hdc, 0, 0, rect.right, rect.bottom); 
            DeleteObject(pen); 
ECHO is off.
            // Draw text indicator 
            SetTextColor(hdc, RGB(255, 255, 255)); 
            SetBkMode(hdc, TRANSPARENT); 
            std::wstring text = L"PRIVACY MASK\nDrag to move\nPress ESC to exit"; 
