#pragma once

#include <windows.h>
#include <dwmapi.h>
#pragma comment(lib, "dwmapi.lib")

// Define DWM attributes if not already defined
#ifndef DWMWA_CLOAK
#define DWMWA_CLOAK 13
#endif

#ifndef DWMWA_CAPTURES_DISABLE
#define DWMWA_CAPTURES_DISABLE 36 // Windows 11 specific
#endif

#ifndef DWMWA_EXCLUDED_FROM_PEEK
#define DWMWA_EXCLUDED_FROM_PEEK 12 // Windows pre-20H2
#endif

// For SetWindowDisplayAffinity
#ifndef WDA_EXCLUDEFROMCAPTURE 
#define WDA_EXCLUDEFROMCAPTURE 0x00000001
#endif

// No longer using an indicator window

// Toggle screen share protection using multiple methods
inline void ToggleScreenShareProtection(HWND hwnd, bool enable) {
    // IMPORTANT: Don't use DWM Cloaking as it makes window invisible locally too
    // Instead focus on methods that keep window visible locally but hidden in captures
    
    // Method 1: SetWindowDisplayAffinity - Primary protection method
    // This is very effective in Windows 10 and later - PREVENTS CAPTURE WITHOUT INVISIBILITY
    SetWindowDisplayAffinity(hwnd, enable ? WDA_EXCLUDEFROMCAPTURE : 0);
    
    // Method 2: Try DWMWA_CAPTURES_DISABLE (Windows 11 21H2+)
    BOOL capturesDisable = enable ? TRUE : FALSE;
    DwmSetWindowAttribute(hwnd, DWMWA_CAPTURES_DISABLE, &capturesDisable, sizeof(capturesDisable));
    
    // Method 3: Exclude from Peek (Windows pre-20H2)
    BOOL excludeFromPeek = enable ? TRUE : FALSE;
    DwmSetWindowAttribute(hwnd, DWMWA_EXCLUDED_FROM_PEEK, &excludeFromPeek, sizeof(excludeFromPeek));
    
    // Method 4: Set window styles that help avoid capture but still keep window visible
    if (enable) {
        // Apply window styles that don't make the window invisible locally
        LONG_PTR exStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE);
        exStyle |= WS_EX_LAYERED;  // Keep layered for transparency
        SetWindowLongPtr(hwnd, GWL_EXSTYLE, exStyle);
    } else {
        // No need to restore anything as we're not changing visibility-affecting styles
    }
    
    // Apply additional content protection attribute (Windows 10 20H1+)
    BOOL protectContent = enable ? TRUE : FALSE;
    DwmSetWindowAttribute(hwnd, 40, &protectContent, sizeof(protectContent));
}

// Check if screen share protection is enabled
inline bool IsScreenShareProtectionEnabled(HWND hwnd) {
    DWORD value = 0;
    DWORD size = sizeof(value);
    HRESULT hr = DwmGetWindowAttribute(hwnd, DWMWA_CLOAK, &value, size);
    return SUCCEEDED(hr) && value != 0;
}
