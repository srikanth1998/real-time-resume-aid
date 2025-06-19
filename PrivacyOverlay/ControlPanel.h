#pragma once

#include <windows.h>
#include <commctrl.h>
#include <string>
#include "OverlayWindow.h"
#include "AudioMonitor.h"
#include "ScreenCapture.h"

#pragma comment(lib, "comctl32.lib")

// Control IDs
#define IDC_TOGGLE_OVERLAY      1001
#define IDC_TOGGLE_PROTECTION   1002
#define IDC_TOGGLE_AUDIO        1003
#define IDC_CAPTURE_SCREEN      1004
#define IDC_OPACITY_SLIDER      1005
#define IDC_COLOR_BLUE          1006
#define IDC_COLOR_RED           1007
#define IDC_COLOR_GREEN         1008
#define IDC_COLOR_BLACK         1009
#define IDC_AUDIO_LEVEL         1010
#define IDC_SCREENSHOT_PREVIEW  1011

// Timer IDs
#define IDT_AUDIO_MONITOR       2001

// Control panel class
class ControlPanel {
public:
    ControlPanel();
    ~ControlPanel();

    // Initialize the control panel window
    bool Initialize(HINSTANCE hInstance, OverlayWindow* pOverlay);
    
    // Show the control panel
    void Show();
    
    // Message loop
    int MessageLoop();
    
    // Window procedure
    static LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);

private:
    // Create the control panel window
    bool CreateControlPanel(HINSTANCE hInstance);
    
    // Create controls
    void CreateControls(HWND hwnd);
    
    // Update audio level
    void UpdateAudioLevel();
    
    // Capture screen
    void CaptureScreen();
    
    // Member variables
    HWND m_hWnd;
    HINSTANCE m_hInstance;
    OverlayWindow* m_pOverlay;
    AudioMonitor m_audioMonitor;
    bool m_isAudioMonitoring;
    HWND m_hwndAudioLevel;
    HWND m_hwndScreenshotPreview;
    HBITMAP m_hbmScreenshot;
    std::wstring m_lastScreenshotPath;
};
