// Define UNICODE for Windows API
#ifndef UNICODE
#define UNICODE
#endif

#ifndef _UNICODE
#define _UNICODE
#endif

#include <windows.h>
#include <dwmapi.h>
#include <windowsx.h> // For GET_X_LPARAM and GET_Y_LPARAM
#include <string>
#include <iostream>
#include <mmdeviceapi.h>
#include <endpointvolume.h>
#include <audiopolicy.h>
#include <comdef.h>
#include <sapi.h>        // Speech API
#include <sphelper.h>   // Speech helper functions
#include "AudioProtection.h"
#include <vector>
#include "resource.h"
#include "ScreenProtection.h" // Include enhanced protection methods
#include <queue>
#include <mutex>
#include "SpeechRecognition.h" // Include speech recognition functions
#include "GlobalVariables.h" // Include shared global variables
#include "Logger.h" // Include logging system

#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "ole32.lib") 
#pragma comment(lib, "sapi.lib") // Speech API library

// Global variables
const wchar_t CLASS_NAME[] = L"PrivacyOverlayClass";
const wchar_t INDICATOR_CLASS_NAME[] = L"PrivacyIndicatorClass";
const wchar_t WINDOW_TITLE[] = L"Privacy Overlay Tool";
HWND g_hwnd = NULL;
HWND g_indicatorWindow = NULL; // Indicator window that stays visible
HBRUSH g_brushBackground = NULL;
bool g_isDragging = false;
POINT g_dragOffset = {0, 0};
RECT g_overlayRect = {100, 100, 500, 300}; // Initial size and position
bool g_resizing = false;
POINT g_resizeStartPoint = {0, 0};
RECT g_initialRect = {0};
enum ResizeDirection { NONE, BOTTOM_RIGHT };
ResizeDirection g_resizeDirection = NONE;

// Shared global variables (defined here, declared in GlobalVariables.h)
bool g_isScreenShareProtected = false; // Track if window is protected from screen capture
bool g_isAudioProtectionEnabled = false; // Track if audio is protected
bool g_isSpeechRecognitionActive = false; // Track if speech recognition is active
bool g_isUsingSystemAudio = true; // Default to system audio instead of microphone
// Declared in SpeechRecognition.cpp, making it extern here
extern bool g_useWhisperAPI; // Using Whisper API instead of Windows Speech API
HANDLE g_speechRecognitionThread = NULL; // Handle to speech recognition thread
std::wstring g_recognizedText = L""; // Currently recognized text
std::queue<std::wstring> g_recognizedTextQueue; // Queue of recognized texts
std::mutex g_recognizedTextMutex; // Mutex for thread safety
const size_t MAX_RECOGNIZED_TEXTS = 5; // Maximum number of recognized text lines to display

// System tray icon data (placeholder for now)
NOTIFYICONDATAW g_trayIconData = {};

// Logging variables
bool g_showLogs = false; // Track if logs should be shown in the UI

// Button structure
struct Button {
    RECT rect;        // Button position and size
    std::wstring text; // Button text
    int id;           // Button identifier
    bool isHovered;   // Is mouse currently over button
    bool isPressed;   // Is button currently pressed
    bool isToggled;   // Is toggle switch on
};

// Button constants
#define BTN_WHISPER_TOGGLE 101
#define BTN_SHOW_LOGS 102
#define BTN_DEBUG_TOGGLE 103

// Global buttons
std::vector<Button> g_buttons;

// Define constants
#define WM_SPEECH_RECOGNITION (WM_USER + 1)

// Forward declarations
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
LRESULT CALLBACK IndicatorWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
void ShowContextMenu(HWND hwnd, POINT pt);
void ToggleScreenShareProtection(HWND hwnd, bool enable);
void UpdateWindowTransparency(HWND hwnd, BYTE alpha);
void UpdateProtectionUI(HWND hwnd, bool enable = true);
void CreateIndicatorWindow(HINSTANCE hInstance);
void InitializeButtons();

// Helper function to check if point is inside a rect
bool IsPointInRect(POINT pt, RECT rect) {
    return (pt.x >= rect.left && pt.x <= rect.right && 
            pt.y >= rect.top && pt.y <= rect.bottom);
}

// Function to update window transparency
void UpdateWindowTransparency(HWND hwnd, BYTE alpha) {
    // Use SetLayeredWindowAttributes to adjust the transparency
    SetLayeredWindowAttributes(hwnd, 0, alpha, LWA_ALPHA);
}

// Helper function to handle toggle switch clicks
void HandleButtonClick(HWND hwnd, int buttonId) {
    // Find the button with matching ID
    for (auto& btn : g_buttons) {
        if (btn.id == buttonId) {
            // Toggle the state
            btn.isToggled = !btn.isToggled;
            
            // Update the actual feature state based on button ID
            switch (buttonId) {
                case BTN_WHISPER_TOGGLE:
                    // Toggle between Whisper API and Windows Speech API
                    g_useWhisperAPI = btn.isToggled;
                    // Display a small status toast instead of MessageBox
                    // We'll just invalidate and let the UI show the current state
                    break;
                    
                case BTN_SHOW_LOGS:
                    // Toggle log display
                    g_showLogs = btn.isToggled;
                    break;
                    
                case BTN_DEBUG_TOGGLE:
                    // Toggle debug logging (placeholder for now)
                    // Debug logging state would go here when implemented
                    break;
            }
            
            // Redraw the UI
            InvalidateRect(hwnd, NULL, TRUE);
            break;
        }
    }
}

// Speech recognition functions
void ProcessSpeechRecognitionEvent(HWND hwnd); // Legacy function, redirects to ProcessRecognitionEvent
void AddRecognizedText(const std::wstring& text);
bool ToggleSpeechRecognition(HWND hwnd);

// Function to create and initialize toggle switches
void InitializeButtons() {
    g_buttons.clear(); // Clear any existing buttons
    
    // Toggle switch dimensions - larger and more visible
    int toggleWidth = 80;
    int toggleHeight = 30;
    int btnMargin = 15;
    int topMargin = 50; // Position lower to be visible
    
    // Fixed position - positioned on the left side of the overlay
    int left = 20; // Left margin
    
    // Whisper API toggle switch
    Button whisperBtn;
    whisperBtn.rect = { left, topMargin, left + toggleWidth, topMargin + toggleHeight };
    whisperBtn.text = L"Use Whisper API";
    whisperBtn.id = BTN_WHISPER_TOGGLE;
    whisperBtn.isHovered = false;
    whisperBtn.isPressed = false;
    whisperBtn.isToggled = g_useWhisperAPI;
    g_buttons.push_back(whisperBtn);
    
    // Show/Hide logs toggle switch
    Button logsBtn;
    logsBtn.rect = { left, topMargin + toggleHeight + btnMargin, left + toggleWidth, topMargin + (toggleHeight * 2) + btnMargin };
    logsBtn.text = L"Show Logs";
    logsBtn.id = BTN_SHOW_LOGS;
    logsBtn.isHovered = false;
    logsBtn.isPressed = false;
    logsBtn.isToggled = g_showLogs;
    g_buttons.push_back(logsBtn);
    
    // Debug toggle switch
    Button debugBtn;
    debugBtn.rect = { left, topMargin + (toggleHeight * 2) + (btnMargin * 2), left + toggleWidth, topMargin + (toggleHeight * 3) + (btnMargin * 2) };
    debugBtn.text = L"Debug Logging";
    debugBtn.id = BTN_DEBUG_TOGGLE;
    debugBtn.isHovered = false;
    debugBtn.isPressed = false;
    debugBtn.isToggled = false; // Assume debug is off by default
    g_buttons.push_back(debugBtn);
}

// Window procedure function
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_CREATE: {
            // Create the semi-transparent background brush
            g_brushBackground = CreateSolidBrush(RGB(30, 30, 30));
            
            // Initialize buttons
            InitializeButtons();
            return 0;
        }

        case WM_DESTROY: {
            DeleteObject(g_brushBackground);
            PostQuitMessage(0);
            return 0;
        }

        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            
            // Get client area dimensions
            RECT rect;
            GetClientRect(hwnd, &rect);
            
            // Fill background with semi-transparent color
            FillRect(hdc, &rect, g_brushBackground);
            
            // Draw border to make overlay clearly visible
            HPEN pen = CreatePen(PS_SOLID, 2, RGB(255, 100, 100));
            SelectObject(hdc, pen);
            Rectangle(hdc, 0, 0, rect.right, rect.bottom);
            
            // Draw text with better formatting
            SetTextColor(hdc, RGB(255, 255, 255));
            SetBkMode(hdc, TRANSPARENT);
            
            // Use a better font for the text
            HFONT hFont = CreateFont(24, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE,
                                    DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS,
                                    CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Arial");
            HFONT hOldFont = (HFONT)SelectObject(hdc, hFont);
            
            // Title text
            std::wstring titleText = L"PRIVACY OVERLAY";
            RECT titleRect = rect;
            titleRect.top = 30;
            titleRect.bottom = 70;
            DrawText(hdc, titleText.c_str(), -1, &titleRect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
            
            // Status text
            SelectObject(hdc, CreateFont(18, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                    DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS,
                                    CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Arial"));
            
            // Combined protection status text
            std::wstring statusText;
            if (g_isScreenShareProtected && g_isAudioProtectionEnabled) {
                statusText = L"FULL PROTECTION ACTIVE";
            } else if (g_isScreenShareProtected) {
                statusText = L"Screen Protected - Mic Unprotected";
            } else if (g_isAudioProtectionEnabled) {
                statusText = L"Mic Protected - Screen Unprotected";
            } else {
                statusText = L"No Protection Active";
            }
            
            RECT statusRect = rect;
            statusRect.top = 70;
            statusRect.bottom = 100;
            DrawText(hdc, statusText.c_str(), -1, &statusRect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
            
            // Instruction text
            SelectObject(hdc, CreateFont(16, 0, 0, 0, FW_NORMAL, FALSE, TRUE, FALSE,
                                    DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS,
                                    CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Arial"));
            std::wstring instructionText = L"Drag to move - Right-click for menu";
            RECT instructionRect = rect;
            instructionRect.top = rect.bottom - 50;
            instructionRect.bottom = rect.bottom - 20;
            DrawText(hdc, instructionText.c_str(), -1, &instructionRect, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
            
            // Custom message based on protection status
            SelectObject(hdc, CreateFont(20, 0, 0, 0, FW_MEDIUM, FALSE, FALSE, FALSE,
                                    DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS,
                                    CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Arial"));
            std::wstring customText;
            
            if (g_isScreenShareProtected && g_isAudioProtectionEnabled) {
                customText = L"Your screen content and microphone\nare fully protected";
            } else if (g_isScreenShareProtected) {
                customText = L"Your screen content is protected\nMicrophone is NOT protected";
            } else if (g_isAudioProtectionEnabled) {
                customText = L"Your microphone is muted\nScreen content is NOT protected";
            } else {
                customText = L"No protection active\nPress M to mute microphone";
            }
            
            RECT customRect = rect;
            customRect.top = 130;
            customRect.bottom = rect.bottom - 80;
            DrawText(hdc, customText.c_str(), -1, &customRect, DT_CENTER | DT_WORDBREAK);
            
            // Show speech recognition status and captured text
            SelectObject(hdc, CreateFont(18, 0, 0, 0, FW_NORMAL, TRUE, FALSE, FALSE,
                                    DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS,
                                    CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Arial"));
            
            std::wstring speechStatus = g_isSpeechRecognitionActive ? 
                L"Speech Recognition Active (Press R to toggle)" : 
                L"Speech Recognition Off (Press R to toggle)";
            
            RECT speechRect = rect;
            speechRect.top = rect.bottom - 80;
            speechRect.bottom = rect.bottom - 60;
            DrawText(hdc, speechStatus.c_str(), -1, &speechRect, DT_CENTER | DT_SINGLELINE);
            
            // Display recognized speech text
            if (g_isSpeechRecognitionActive) {
                SelectObject(hdc, CreateFont(16, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                    DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS,
                                    CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Arial"));
                
                RECT capturedTextRect = rect;
                capturedTextRect.top = 200;
                capturedTextRect.bottom = rect.bottom - 90;
                capturedTextRect.left += 20;
                capturedTextRect.right -= 20;
                
                // Display the captured text from the queue
                std::lock_guard<std::mutex> lock(g_recognizedTextMutex);
                
                // Display the audio source type and API type
                std::wstring sourceType = g_isUsingSystemAudio ? 
                    L"Source: System Audio (Meeting/Laptop Audio)" : 
                    L"Source: Microphone";
                
                std::wstring apiType = g_useWhisperAPI ? 
                    L"API: Whisper (Cloud)" : 
                    L"API: Windows Speech (Local)";
                    
                if (!g_recognizedTextQueue.empty()) {
                    std::wstring allText = L"Captured Audio (" + sourceType + L")\n" + apiType + L":\n";
                    
                    // Create a temporary queue to preserve order
                    std::queue<std::wstring> tempQueue = g_recognizedTextQueue;
                    while (!tempQueue.empty()) {
                        allText += tempQueue.front() + L"\n";
                        tempQueue.pop();
                    }
                    
                    DrawText(hdc, allText.c_str(), -1, &capturedTextRect, DT_LEFT | DT_WORDBREAK);
                } else {
                    DrawText(hdc, (L"Captured Audio (" + sourceType + L")\n" + apiType + L":\nListening...").c_str(), 
                             -1, &capturedTextRect, DT_LEFT | DT_WORDBREAK);
                }
            }
            
            // Clean up font
            SelectObject(hdc, hOldFont);
            
            // Draw toggle switches
            for (const auto& btn : g_buttons) {
                // Draw toggle switch track
                int trackHeight = (btn.rect.bottom - btn.rect.top) - 6; // Track height is smaller than button
                int trackTop = btn.rect.top + 3;
                RECT trackRect = {
                    btn.rect.left,
                    trackTop,
                    btn.rect.right,
                    trackTop + trackHeight
                };
                
                // Choose colors based on state - higher contrast colors
                COLORREF trackColor = btn.isToggled ? RGB(50, 200, 50) : RGB(200, 50, 50);
                if (btn.isHovered) {
                    trackColor = btn.isToggled ? RGB(80, 220, 80) : RGB(220, 80, 80);
                }
                
                // Draw rounded track
                HBRUSH trackBrush = CreateSolidBrush(trackColor);
                HPEN trackPen = CreatePen(PS_SOLID, 1, trackColor);
                HPEN oldPen = (HPEN)SelectObject(hdc, trackPen);
                
                // Create rounded rectangle effect for track
                int radius = trackHeight / 2;
                RoundRect(hdc, trackRect.left, trackRect.top, trackRect.right, trackRect.bottom, radius, radius);
                
                // Draw the sliding knob/thumb
                int knobSize = trackHeight + 2;
                int knobY = trackTop - 1;
                int knobX = btn.isToggled ? 
                    (btn.rect.right - knobSize - 2) : 
                    (btn.rect.left + 2);
                
                RECT knobRect = { knobX, knobY, knobX + knobSize, knobY + knobSize };
                
                // Use light color for knob
                HBRUSH knobBrush = CreateSolidBrush(RGB(240, 240, 240));
                HPEN knobPen = CreatePen(PS_SOLID, 1, RGB(200, 200, 200));
                SelectObject(hdc, knobPen);
                
                // Create circle effect for knob
                Ellipse(hdc, knobRect.left, knobRect.top, knobRect.right, knobRect.bottom);
                
                // Add a subtle shadow/highlight effect to knob
                if (btn.isPressed) {
                    // Pressed effect
                    HPEN shadowPen = CreatePen(PS_SOLID, 1, RGB(180, 180, 180));
                    SelectObject(hdc, shadowPen);
                    Ellipse(hdc, knobRect.left + 1, knobRect.top + 1, knobRect.right - 1, knobRect.bottom - 1);
                    DeleteObject(shadowPen);
                }
                
                // Clean up drawing objects
                DeleteObject(knobBrush);
                DeleteObject(knobPen);
                SelectObject(hdc, oldPen);
                DeleteObject(trackBrush);
                DeleteObject(trackPen);
                
                // Draw label text to the right of toggle
                HFONT labelFont = CreateFont(18, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                   DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS,
                                   CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Arial");
                HFONT oldFont = (HFONT)SelectObject(hdc, labelFont);
                
                // Position text to the right of toggle switch
                RECT textRect = {
                    btn.rect.right + 10,  // Position text to right of toggle with gap
                    btn.rect.top,
                    btn.rect.right + 200, // Allow plenty of space for text
                    btn.rect.bottom
                };
                
                // Use black text for high visibility
                SetTextColor(hdc, RGB(0, 0, 0)); // Black text for maximum contrast
                
                // Create a semi-transparent background for text to improve readability
                HBRUSH textBgBrush = CreateSolidBrush(RGB(255, 255, 255)); // White background
                FillRect(hdc, &textRect, textBgBrush);
                DeleteObject(textBgBrush);
                
                // Draw text with opaque background
                SetBkMode(hdc, OPAQUE);
                SetBkColor(hdc, RGB(255, 255, 255)); // White background for text
                DrawText(hdc, btn.text.c_str(), -1, &textRect, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
                
                SelectObject(hdc, oldFont);
                DeleteObject(labelFont);
            }
            
            // Temporarily disabled log display
            /*
            if (g_showLogs) {
                // Create a rect for logs at the bottom of the window
                RECT logRect = rect;
                logRect.top = rect.bottom - 120; // Use bottom 120px for logs
                logRect.left += 20;
                logRect.right -= 20;
                
                // Use a smaller font for logs
                HFONT logFont = CreateFont(16, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                 DEFAULT_CHARSET, OUT_OUTLINE_PRECIS, CLIP_DEFAULT_PRECIS,
                                 CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_SWISS, L"Consolas");
                
                // Save current font and set log font
                HFONT prevFont = (HFONT)SelectObject(hdc, logFont);
                
                // Draw a semi-transparent background for logs
                HBRUSH logBrush = CreateSolidBrush(RGB(0, 0, 0));
                FillRect(hdc, &logRect, logBrush);
                DeleteObject(logBrush);
                
                // Get the recent logs
                std::vector<std::wstring> logs = Logger::GetRecentLogs(5); // Show last 5 logs
                
                if (!logs.empty()) {
                    std::wstring logText = L"Log Messages:\n";
                    for (const auto& log : logs) {
                        logText += log + L"\n";
                    }
                    DrawText(hdc, logText.c_str(), -1, &logRect, DT_LEFT | DT_WORDBREAK);
                } else {
                    DrawText(hdc, L"Log Messages:\nNo logs available.", -1, &logRect, DT_LEFT | DT_WORDBREAK);
                }
                
                // Restore previous font
                SelectObject(hdc, prevFont);
                DeleteObject(logFont);
            }
            */
            
            // Draw resize indicator in the bottom-right corner
            RECT resizeRect = {rect.right - 20, rect.bottom - 20, rect.right, rect.bottom};
            HBRUSH resizeBrush = CreateSolidBrush(RGB(255, 100, 100));
            FillRect(hdc, &resizeRect, resizeBrush);
            DeleteObject(resizeBrush);
            
            // Cleanup
            DeleteObject(pen);
            EndPaint(hwnd, &ps);
            
            return 0;
        }

        case WM_MOUSEMOVE: {
            int mouseX = GET_X_LPARAM(lParam);
            int mouseY = GET_Y_LPARAM(lParam);
            POINT pt = {mouseX, mouseY};
            
            // Check for button hover state changes
            bool needsRedraw = false;
            for (auto& btn : g_buttons) {
                bool wasHovered = btn.isHovered;
                btn.isHovered = IsPointInRect(pt, btn.rect);
                if (wasHovered != btn.isHovered) {
                    needsRedraw = true;
                }
            }
            
            if (needsRedraw) {
                InvalidateRect(hwnd, NULL, TRUE);
            }
            
            // Handle window dragging
            if (g_isDragging) {
                // Move window when dragging
                POINT screenPt;
                screenPt.x = mouseX;
                screenPt.y = mouseY;
                ClientToScreen(hwnd, &screenPt);
                
                // Calculate new position accounting for the drag offset
                int newX = screenPt.x - g_dragOffset.x;
                int newY = screenPt.y - g_dragOffset.y;
                
                SetWindowPos(hwnd, NULL, newX, newY, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
                
                // Update stored rect
                GetWindowRect(hwnd, &g_overlayRect);
            }
            else if (g_resizing) {
                // Resize window when dragging the resize handle
                POINT screenPt;
                screenPt.x = mouseX;
                screenPt.y = mouseY;
                ClientToScreen(hwnd, &screenPt);
                
                if (g_resizeDirection == BOTTOM_RIGHT) {
                    // Calculate new width and height
                    int newWidth = g_initialRect.right - g_initialRect.left + (screenPt.x - g_resizeStartPoint.x);
                    int newHeight = g_initialRect.bottom - g_initialRect.top + (screenPt.y - g_resizeStartPoint.y);
                    
                    // Ensure minimum size
                    newWidth = max(newWidth, 200);
                    newHeight = max(newHeight, 150);
                    
                    // Resize the window
                    SetWindowPos(hwnd, NULL, 0, 0, newWidth, newHeight, SWP_NOMOVE | SWP_NOZORDER);
                    
                    // Update stored rect
                    GetWindowRect(hwnd, &g_overlayRect);
                    InvalidateRect(hwnd, NULL, TRUE);
                }
            }
            
            // Update cursor based on position (resize corner or not)
            RECT clientRect;
            GetClientRect(hwnd, &clientRect);
            RECT resizeRect = {clientRect.right - 20, clientRect.bottom - 20, clientRect.right, clientRect.bottom};
            if (PtInRect(&resizeRect, pt)) {
                SetCursor(LoadCursor(NULL, IDC_SIZENWSE));
            } else {
                SetCursor(LoadCursor(NULL, IDC_ARROW));
            }
            
            return 0;
        }

        case WM_LBUTTONDOWN: {
            int mouseX = GET_X_LPARAM(lParam);
            int mouseY = GET_Y_LPARAM(lParam);
            POINT pt = {mouseX, mouseY};

            // Check if any button was clicked
            bool buttonPressed = false;
            for (auto& btn : g_buttons) {
                if (IsPointInRect(pt, btn.rect)) {
                    btn.isPressed = true;
                    buttonPressed = true;
                    InvalidateRect(hwnd, NULL, TRUE);
                    SetCapture(hwnd);
                    return 0;
                }
            }
            
            // Check for resize corner
            RECT clientRect;
            GetClientRect(hwnd, &clientRect);
            RECT resizeRect = {clientRect.right - 20, clientRect.bottom - 20, clientRect.right, clientRect.bottom};
            if (PtInRect(&resizeRect, pt)) {
                g_resizing = true;
                g_resizeDirection = BOTTOM_RIGHT;
                GetWindowRect(hwnd, &g_initialRect);
                g_resizeStartPoint = pt;
                ClientToScreen(hwnd, &g_resizeStartPoint);
                SetCapture(hwnd);
                return 0;
            }
            
            // Start window dragging
            g_isDragging = true;
            SetCapture(hwnd);
            
            // Calculate drag offset
            POINT screenPt = pt;
            ClientToScreen(hwnd, &screenPt);
            
            RECT windowRect;
            GetWindowRect(hwnd, &windowRect);
            
            g_dragOffset.x = screenPt.x - windowRect.left;
            g_dragOffset.y = screenPt.y - windowRect.top;
            
            return 0;
        }

        case WM_LBUTTONUP: {
            // Get mouse position
            int mouseX = GET_X_LPARAM(lParam);
            int mouseY = GET_Y_LPARAM(lParam);
            POINT pt = {mouseX, mouseY};
            
            // Check for button click (if button was previously pressed)
            for (auto& btn : g_buttons) {
                if (btn.isPressed) {
                    // Reset pressed state
                    btn.isPressed = false;
                    InvalidateRect(hwnd, NULL, TRUE);
                    
                    // If mouse is still over the button, trigger click action
                    if (IsPointInRect(pt, btn.rect)) {
                        HandleButtonClick(hwnd, btn.id);
                    }
                }
            }
            
            // End dragging/resizing if active
            if (g_isDragging || g_resizing) {
                g_isDragging = false;
                g_resizing = false;
            }
            
            ReleaseCapture();
            return 0;
        }

        case WM_RBUTTONUP: {
            // Show context menu on right-click
            POINT pt = {LOWORD(lParam), HIWORD(lParam)};
            ClientToScreen(hwnd, &pt);
            ShowContextMenu(hwnd, pt);
            return 0;
        }
        
        case WM_TIMER: {
            // Refresh protection periodically to ensure it stays active
            if (wParam == 1 && g_isScreenShareProtected) {
                // Reapply the protection
                ToggleScreenShareProtection(hwnd, true);
                
                // Update indicator window
                if (g_indicatorWindow && IsWindow(g_indicatorWindow)) {
                    InvalidateRect(g_indicatorWindow, NULL, TRUE);
                }
            }
            return 0;
        }

        case WM_KEYDOWN: {
            // Handle keyboard shortcuts
            switch (wParam) {
                case 'M': // Toggle microphone protection with M key
                case 'm':
                    g_isAudioProtectionEnabled = !g_isAudioProtectionEnabled;
                    ToggleMicrophoneMute(g_isAudioProtectionEnabled);
                    InvalidateRect(hwnd, NULL, TRUE); // Update UI
                    break;
                    
                case 'R': // Toggle speech recognition
                case 'r':
                    ToggleSpeechRecognition(hwnd);
                    break;
            }
            return 0;
        }
        
        case WM_SPEECH_RECOGNITION: {
            // Handle speech recognition event
            // Note: We don't have direct access to the context here,
            // so we'll get it in the ProcessSpeechRecognitionEvent function
            ProcessSpeechRecognitionEvent(hwnd);
            return 0;
        }
        
        case WM_COMMAND: {
            // Handle menu commands
            switch (LOWORD(wParam)) {
                case 1: // Set transparency - 25%
                    UpdateWindowTransparency(hwnd, 64);
                    break;
                case 2: // Set transparency - 50%
                    UpdateWindowTransparency(hwnd, 128);
                    break;
                case 3: // Set transparency - 75%
                    UpdateWindowTransparency(hwnd, 192);
                    break;
                case 4: // Set transparency - 90%
                    UpdateWindowTransparency(hwnd, 230);
                    break;
                case 5: // Set color - Red
                    DeleteObject(g_brushBackground);
                    g_brushBackground = CreateSolidBrush(RGB(128, 30, 30));
                    InvalidateRect(hwnd, NULL, TRUE);
                    break;
                case 6: // Set color - Blue
                    DeleteObject(g_brushBackground);
                    g_brushBackground = CreateSolidBrush(RGB(30, 30, 128));
                    InvalidateRect(hwnd, NULL, TRUE);
                    break;
                case 7: // Set color - Green
                    DeleteObject(g_brushBackground);
                    g_brushBackground = CreateSolidBrush(RGB(30, 128, 30));
                    InvalidateRect(hwnd, NULL, TRUE);
                    break;
                case 8: // Set color - Black
                    DeleteObject(g_brushBackground);
                    g_brushBackground = CreateSolidBrush(RGB(30, 30, 30));
                    InvalidateRect(hwnd, NULL, TRUE);
                    break;
                case 9: // Exit
                    DestroyWindow(hwnd);
                    break;
                case 20: // Switch Account
                    // Reset authentication state
                    g_isAuthenticated = false;
                    g_showMainOverlay = false;
                    
                    // Hide main window
                    ShowWindow(hwnd, SW_HIDE);
                    
                    // Show authentication dialog again
                    if (g_authDialog) {
                        delete g_authDialog;
                    }
                    g_authDialog = new AuthenticationDialog();
                    g_authDialog->ShowDialog(hwnd, [hwnd](const AuthResult& result) {
                        if (result.success) {
                            g_showMainOverlay = true;
                            g_authResult = result;
                            
                            // Update window title
                            std::wstring title = WINDOW_TITLE;
                            if (result.mode == AuthMode::SESSION_CODE) {
                                title += L" - Session: ";
                                std::wstring sessionId(result.sessionId.begin(), result.sessionId.end());
                                title += sessionId;
                            } else {
                                title += L" - User: ";
                                std::wstring userEmail(result.userEmail.begin(), result.userEmail.end());
                                title += userEmail;
                            }
                            SetWindowText(hwnd, title.c_str());
                            
                            // Show main window
                            ShowWindow(hwnd, SW_SHOW);
                            InvalidateRect(hwnd, NULL, TRUE);
                        } else {
                            PostQuitMessage(0);
                        }
                    });
                    break;
            }
            return 0;
        }
    }
    
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

// Function to show context menu
void ShowContextMenu(HWND hwnd, POINT pt) {
    HMENU hMenu = CreatePopupMenu();
    
    // Add menu items
    AppendMenu(hMenu, MF_STRING, 1, L"Transparency - 25%");
    AppendMenu(hMenu, MF_STRING, 2, L"Transparency - 50%");
    AppendMenu(hMenu, MF_STRING, 3, L"Transparency - 75%");
    AppendMenu(hMenu, MF_STRING, 4, L"Transparency - 90%");
    AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenu(hMenu, MF_STRING, 5, L"Color - Red");
    AppendMenu(hMenu, MF_STRING, 6, L"Color - Blue");
    AppendMenu(hMenu, MF_STRING, 7, L"Color - Green");
    AppendMenu(hMenu, MF_STRING, 8, L"Color - Black");
    AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
    // Add screen share protection toggle
    if (g_isScreenShareProtected) {
        AppendMenu(hMenu, MF_STRING, 10, L"Disable Screen Share Protection");
    } else {
        AppendMenu(hMenu, MF_STRING, 10, L"Enable Screen Share Protection");
    }
    
    // Add microphone protection toggle
    if (g_isAudioProtectionEnabled) {
        AppendMenu(hMenu, MF_STRING, 11, L"Disable Microphone Protection");
    } else {
        AppendMenu(hMenu, MF_STRING, 11, L"Enable Microphone Protection");
    }
    
    // Add full protection options
    AppendMenu(hMenu, MF_STRING, 12, L"Enable Full Protection");
    AppendMenu(hMenu, MF_STRING, 13, L"Disable All Protection");
    
    // Add speech recognition toggle
    AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
    if (g_isSpeechRecognitionActive) {
        AppendMenu(hMenu, MF_STRING, 14, L"Disable Speech Recognition");
    } else {
        AppendMenu(hMenu, MF_STRING, 14, L"Enable Speech Recognition");
    }
    
    // Add Whisper API toggle
    AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
    if (g_useWhisperAPI) {
        AppendMenu(hMenu, MF_STRING, 15, L"Switch to Windows Speech API");
    } else {
        AppendMenu(hMenu, MF_STRING, 15, L"Switch to Whisper API");
    }
    
    // Temporarily disabled logging options
    /*
    AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenu(hMenu, MF_STRING, 16, L"Show/Hide Logs");
    
    // Toggle debug logging level
    if (Logger::IsDebugEnabled()) {
        AppendMenu(hMenu, MF_STRING, 17, L"Disable Debug Logging");
    } else {
        AppendMenu(hMenu, MF_STRING, 17, L"Enable Debug Logging");
    }
    */
    
    AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenu(hMenu, MF_STRING, 9, L"Exit");
    
    // Show the menu
    TrackPopupMenu(hMenu, TPM_TOPALIGN | TPM_LEFTALIGN, pt.x, pt.y, 0, hwnd, NULL);
    DestroyMenu(hMenu);
}

// Indicator window procedure - This window will remain visible during screen sharing
LRESULT CALLBACK IndicatorWindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            
            RECT rect;
            GetClientRect(hwnd, &rect);
            
            // Create a brush with the appropriate color (green for protected, red for not)
            HBRUSH brush = CreateSolidBrush(g_isScreenShareProtected ? RGB(0, 255, 0) : RGB(255, 0, 0));
            
            // Fill with a circle
            SelectObject(hdc, brush);
            Ellipse(hdc, 0, 0, rect.right, rect.bottom);
            
            // Clean up
            DeleteObject(brush);
            EndPaint(hwnd, &ps);
            return 0;
        }
        
        case WM_LBUTTONDOWN: {
            // Allow dragging the indicator
            ReleaseCapture();
            SendMessage(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            return 0;
        }
        
        case WM_RBUTTONUP: {
            // Right click on indicator also shows the context menu
            POINT pt;
            pt.x = LOWORD(lParam);
            pt.y = HIWORD(lParam);
            ClientToScreen(hwnd, &pt);
            ShowContextMenu(g_hwnd, pt); // Use main window for context menu
            return 0;
        }
    }
    
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

// Create indicator window
void CreateIndicatorWindow(HINSTANCE hInstance) {
    // Register indicator window class
    WNDCLASS wcIndicator = {};
    wcIndicator.lpfnWndProc = IndicatorWindowProc;
    wcIndicator.hInstance = hInstance;
    wcIndicator.lpszClassName = INDICATOR_CLASS_NAME;
    wcIndicator.hCursor = LoadCursor(NULL, IDC_ARROW);
    RegisterClass(&wcIndicator);
    
    // Create a small 20x20 indicator window
    g_indicatorWindow = CreateWindowEx(
        WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        INDICATOR_CLASS_NAME,
        L"Protection Status",
        WS_POPUP | WS_VISIBLE,
        10, 10, 20, 20,  // Position at top-left corner, small size
        NULL, NULL, hInstance, NULL
    );
    
    if (g_indicatorWindow) {
        // Make it somewhat transparent
        SetLayeredWindowAttributes(g_indicatorWindow, 0, 220, LWA_ALPHA); // 86% opaque
    }
}

// Update the protection UI elements
void UpdateProtectionUI(HWND hwnd, bool enable) {
    // Update protection status in system tray icon (when implementation is complete)
    if (g_trayIconData.cbSize > 0) {
        // Update tooltip
        std::wstring tooltip = L"Privacy Overlay";
        if (g_isScreenShareProtected && g_isAudioProtectionEnabled) {
            tooltip += L"\nFull Protection Active";
        }
        else if (g_isScreenShareProtected) {
            tooltip += L"\nScreen Protected";
        }
        else if (g_isAudioProtectionEnabled) {
            tooltip += L"\nMicrophone Protected";
        }
        else {
            tooltip += L"\nNo Protection Active";
        }
        
        // Safely copy tooltip text (with size parameter)
        wcsncpy_s(g_trayIconData.szTip, sizeof(g_trayIconData.szTip)/sizeof(wchar_t), tooltip.c_str(), _TRUNCATE);
        Shell_NotifyIcon(NIM_MODIFY, &g_trayIconData);
    }
    
    // Update window title to indicate protection status
    std::wstring title = WINDOW_TITLE;
    
    // Show combined protection status in the window title
    if (g_isScreenShareProtected && g_isAudioProtectionEnabled) {
        title += L" (Full Protection Active)";
    } else if (g_isScreenShareProtected) {
        title += L" (Screen Protected)";
    } else if (g_isAudioProtectionEnabled) {
        title += L" (Microphone Protected)";
    }
    
    SetWindowText(hwnd, title.c_str());
    
    // Update text in the window
    InvalidateRect(hwnd, NULL, TRUE);
    
    // Update the indicator window if it exists
    if (g_indicatorWindow && IsWindow(g_indicatorWindow)) {
        InvalidateRect(g_indicatorWindow, NULL, TRUE);
    }
}

// Main function
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // Temporarily disable logger initialization for debugging
    // Logger::Initialize(L"PrivacyOverlay.log", LogLevel::Debug);
    // Logger::LogInfo(L"Application started");
    
    // Initialize COM for potential GDI+ and other COM-based operations
    HRESULT hrCom = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    // Register the window class
    WNDCLASS wc = {};
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.hIcon = LoadIcon(hInstance, MAKEINTRESOURCE(IDI_APPICON));
    RegisterClass(&wc);
    
    // Initialize background brush with a very prominent color
    g_brushBackground = CreateSolidBrush(RGB(255, 50, 50)); // Bright red color for visibility
    
    // Get full screen size for monitor
    int screenWidth = GetSystemMetrics(SM_CXSCREEN);
    int screenHeight = GetSystemMetrics(SM_CYSCREEN);
    
    // Make overlay a reasonable size - not full screen
    int overlayWidth = 500;
    int overlayHeight = 400;
    
    // Center the overlay on screen
    g_overlayRect.left = (screenWidth - overlayWidth) / 2;
    g_overlayRect.top = (screenHeight - overlayHeight) / 2;
    g_overlayRect.right = g_overlayRect.left + overlayWidth;
    g_overlayRect.bottom = g_overlayRect.top + overlayHeight;
    
    // Create the window with layered style for transparency
    g_hwnd = CreateWindowEx(
        WS_EX_LAYERED | WS_EX_TOPMOST,  // Always on top with layered style, but visible in taskbar
        CLASS_NAME,
        WINDOW_TITLE,
        WS_POPUP | WS_VISIBLE,  // Popup window with no border
        g_overlayRect.left, g_overlayRect.top,  // Centered position
        overlayWidth, overlayHeight,  // Medium sized window
        NULL, // No parent window
        NULL, // No menu
        hInstance,
        NULL
    );
    
    if (!g_hwnd) {
        MessageBox(NULL, L"Failed to create window.", L"Error", MB_OK | MB_ICONERROR);
        return -1;
    }
    
    // Set initial transparency (75%)
    UpdateWindowTransparency(g_hwnd, 192);
    
    // Enable screen share protection by default
    g_isScreenShareProtected = true;
    UpdateProtectionUI(g_hwnd, g_isScreenShareProtected);
    
    // Make the window invisible during screen sharing but visible locally
    ToggleScreenShareProtection(g_hwnd, g_isScreenShareProtected);
    
    // Create a timer to periodically refresh the protection - this ensures capture protection stays active
    SetTimer(g_hwnd, 1, 1000, NULL);
    
    // Show the main window only (no green dot indicator)
    ShowWindow(g_hwnd, nCmdShow);
    
    // Run the message loop
    MSG msg = {};
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    // Clean up speech recognition thread if active
    if (g_isSpeechRecognitionActive && g_speechRecognitionThread) {
        // Signal thread to terminate
        PostThreadMessage(GetThreadId(g_speechRecognitionThread), WM_QUIT, 0, 0);
        
        // Wait for thread to terminate
        WaitForSingleObject(g_speechRecognitionThread, INFINITE);
        CloseHandle(g_speechRecognitionThread);
    }
    
    // Temporarily disable logger shutdown for debugging
    // Logger::LogInfo(L"Application shutting down");
    // Logger::Shutdown();
    
    // Uninitialize COM
    CoUninitialize();
    
    return 0;
}
