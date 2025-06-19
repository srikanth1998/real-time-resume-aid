#include "ControlPanel.h"
#include <windowsx.h>
#include <shlobj.h>
#include <string>

// Class name for window registration
const wchar_t* CONTROL_CLASS_NAME = L"PrivacyOverlayControlClass";

// Constructor
ControlPanel::ControlPanel()
    : m_hWnd(NULL)
    , m_hInstance(NULL)
    , m_pOverlay(NULL)
    , m_isAudioMonitoring(false)
    , m_hwndAudioLevel(NULL)
    , m_hwndScreenshotPreview(NULL)
    , m_hbmScreenshot(NULL)
{
}

// Destructor
ControlPanel::~ControlPanel()
{
    // Stop audio monitoring
    if (m_isAudioMonitoring) {
        KillTimer(m_hWnd, IDT_AUDIO_MONITOR);
    }
    
    // Clean up screenshot bitmap
    if (m_hbmScreenshot) {
        DeleteObject(m_hbmScreenshot);
    }
}

// Initialize the control panel window
bool ControlPanel::Initialize(HINSTANCE hInstance, OverlayWindow* pOverlay)
{
    m_hInstance = hInstance;
    m_pOverlay = pOverlay;
    
    // Initialize audio monitor
    m_audioMonitor.Initialize();
    
    // Initialize screen capture
    ScreenCapture::Initialize();
    
    // Create window
    if (!CreateControlPanel(hInstance)) {
        MessageBox(NULL, L"Failed to create control panel.", L"Error", MB_OK | MB_ICONERROR);
        return false;
    }
    
    return true;
}

// Create the control panel window
bool ControlPanel::CreateControlPanel(HINSTANCE hInstance)
{
    // Register window class
    WNDCLASSEX wc = {0};
    wc.cbSize = sizeof(WNDCLASSEX);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = hInstance;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.lpszClassName = CONTROL_CLASS_NAME;
    
    if (!RegisterClassEx(&wc)) {
        return false;
    }
    
    // Create window
    m_hWnd = CreateWindowEx(
        0,
        CONTROL_CLASS_NAME,
        L"Privacy Overlay Controls",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, 400, 600,
        NULL,
        NULL,
        hInstance,
        this
    );
    
    if (!m_hWnd) {
        return false;
    }
    
    // Create controls
    CreateControls(m_hWnd);
    
    return true;
}

// Show the control panel
void ControlPanel::Show()
{
    ShowWindow(m_hWnd, SW_SHOW);
    UpdateWindow(m_hWnd);
}

// Message loop
int ControlPanel::MessageLoop()
{
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    return (int)msg.wParam;
}

// Create controls
void ControlPanel::CreateControls(HWND hwnd)
{
    // Initialize common controls
    INITCOMMONCONTROLSEX icex = {0};
    icex.dwSize = sizeof(INITCOMMONCONTROLSEX);
    icex.dwICC = ICC_WIN95_CLASSES;
    InitCommonControlsEx(&icex);
    
    // Get client rect
    RECT rect;
    GetClientRect(hwnd, &rect);
    int width = rect.right - rect.left;
    
    // Create toggle overlay button
    CreateWindow(
        L"BUTTON",
        L"Toggle Overlay",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
        20, 20, 150, 30,
        hwnd,
        (HMENU)IDC_TOGGLE_OVERLAY,
        m_hInstance,
        NULL
    );
    
    // Create toggle protection button
    CreateWindow(
        L"BUTTON",
        L"Toggle Protection",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
        200, 20, 150, 30,
        hwnd,
        (HMENU)IDC_TOGGLE_PROTECTION,
        m_hInstance,
        NULL
    );
    
    // Create toggle audio button
    CreateWindow(
        L"BUTTON",
        L"Start Audio Monitoring",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
        20, 70, 150, 30,
        hwnd,
        (HMENU)IDC_TOGGLE_AUDIO,
        m_hInstance,
        NULL
    );
    
    // Create capture screen button
    CreateWindow(
        L"BUTTON",
        L"Capture Screen",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
        200, 70, 150, 30,
        hwnd,
        (HMENU)IDC_CAPTURE_SCREEN,
        m_hInstance,
        NULL
    );
    
    // Create opacity label
    CreateWindow(
        L"STATIC",
        L"Opacity:",
        WS_VISIBLE | WS_CHILD,
        20, 120, 100, 20,
        hwnd,
        NULL,
        m_hInstance,
        NULL
    );
    
    // Create opacity slider
    HWND hTrack = CreateWindow(
        TRACKBAR_CLASS,
        L"",
        WS_VISIBLE | WS_CHILD | TBS_HORZ | TBS_AUTOTICKS,
        20, 140, width - 40, 30,
        hwnd,
        (HMENU)IDC_OPACITY_SLIDER,
        m_hInstance,
        NULL
    );
    
    // Set slider range and position
    SendMessage(hTrack, TBM_SETRANGE, TRUE, MAKELPARAM(0, 255));
    SendMessage(hTrack, TBM_SETPOS, TRUE, 192); // Default 75% opacity
    
    // Create color label
    CreateWindow(
        L"STATIC",
        L"Color:",
        WS_VISIBLE | WS_CHILD,
        20, 190, 100, 20,
        hwnd,
        NULL,
        m_hInstance,
        NULL
    );
    
    // Create color buttons
    int colorButtonSize = 40;
    int colorSpacing = 10;
    int colorY = 210;
    
    // Blue button
    HWND hBlue = CreateWindow(
        L"BUTTON",
        L"",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
        20, colorY, colorButtonSize, colorButtonSize,
        hwnd,
        (HMENU)IDC_COLOR_BLUE,
        m_hInstance,
        NULL
    );
    
    // Red button
    HWND hRed = CreateWindow(
        L"BUTTON",
        L"",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
        20 + colorButtonSize + colorSpacing, colorY, colorButtonSize, colorButtonSize,
        hwnd,
        (HMENU)IDC_COLOR_RED,
        m_hInstance,
        NULL
    );
    
    // Green button
    HWND hGreen = CreateWindow(
        L"BUTTON",
        L"",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
        20 + (colorButtonSize + colorSpacing) * 2, colorY, colorButtonSize, colorButtonSize,
        hwnd,
        (HMENU)IDC_COLOR_GREEN,
        m_hInstance,
        NULL
    );
    
    // Black button
    HWND hBlack = CreateWindow(
        L"BUTTON",
        L"",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON,
        20 + (colorButtonSize + colorSpacing) * 3, colorY, colorButtonSize, colorButtonSize,
        hwnd,
        (HMENU)IDC_COLOR_BLACK,
        m_hInstance,
        NULL
    );
    
    // Audio monitoring section
    CreateWindow(
        L"STATIC",
        L"Audio Level:",
        WS_VISIBLE | WS_CHILD,
        20, 270, 100, 20,
        hwnd,
        NULL,
        m_hInstance,
        NULL
    );
    
    // Audio level progress bar
    m_hwndAudioLevel = CreateWindow(
        PROGRESS_CLASS,
        L"",
        WS_VISIBLE | WS_CHILD | PBS_SMOOTH,
        20, 290, width - 40, 20,
        hwnd,
        (HMENU)IDC_AUDIO_LEVEL,
        m_hInstance,
        NULL
    );
    
    // Set progress bar range
    SendMessage(m_hwndAudioLevel, PBM_SETRANGE, 0, MAKELPARAM(0, 100));
    
    // Screenshot preview section
    CreateWindow(
        L"STATIC",
        L"Screenshot Preview:",
        WS_VISIBLE | WS_CHILD,
        20, 330, 150, 20,
        hwnd,
        NULL,
        m_hInstance,
        NULL
    );
    
    // Create screenshot preview control
    m_hwndScreenshotPreview = CreateWindow(
        L"STATIC",
        L"",
        WS_VISIBLE | WS_CHILD | SS_BITMAP | SS_CENTERIMAGE,
        20, 350, width - 40, 200,
        hwnd,
        (HMENU)IDC_SCREENSHOT_PREVIEW,
        m_hInstance,
        NULL
    );
}

// Update audio level
void ControlPanel::UpdateAudioLevel()
{
    if (m_isAudioMonitoring && m_hwndAudioLevel) {
        // Get audio level
        float level = m_audioMonitor.GetAudioLevel();
        
        // Update progress bar
        int value = (int)(level * 100);
        SendMessage(m_hwndAudioLevel, PBM_SETPOS, value, 0);
    }
}

// Capture screen
void ControlPanel::CaptureScreen()
{
    // Create pictures directory if it doesn't exist
    WCHAR path[MAX_PATH];
    if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_MYPICTURES, NULL, 0, path))) {
        std::wstring picturesDir = path;
        std::wstring screenshotDir = picturesDir + L"\\PrivacyOverlayScreenshots";
        CreateDirectoryW(screenshotDir.c_str(), NULL);
        
        // Create filename with timestamp
        SYSTEMTIME st;
        GetLocalTime(&st);
        
        WCHAR fileName[MAX_PATH];
        swprintf_s(fileName, MAX_PATH, L"%s\\Screenshot_%04d%02d%02d_%02d%02d%02d.png",
            screenshotDir.c_str(), st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond);
        
        // Capture screen
        if (ScreenCapture::CaptureScreen(fileName)) {
            // Save screenshot path
            m_lastScreenshotPath = fileName;
            
            // Load and display the screenshot
            if (m_hbmScreenshot) {
                DeleteObject(m_hbmScreenshot);
                m_hbmScreenshot = NULL;
            }
            
            m_hbmScreenshot = (HBITMAP)LoadImage(NULL, fileName, IMAGE_BITMAP, 0, 0, LR_LOADFROMFILE);
            if (m_hbmScreenshot) {
                SendMessage(m_hwndScreenshotPreview, STM_SETIMAGE, IMAGE_BITMAP, (LPARAM)m_hbmScreenshot);
            }
            
            // Show success message
            MessageBox(m_hWnd, L"Screenshot saved successfully!", L"Success", MB_OK | MB_ICONINFORMATION);
        } else {
            MessageBox(m_hWnd, L"Failed to capture screenshot.", L"Error", MB_OK | MB_ICONERROR);
        }
    }
}

// Window procedure
LRESULT CALLBACK ControlPanel::WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    // Get the window instance
    ControlPanel* pThis = NULL;
    
    if (uMsg == WM_NCCREATE) {
        // Store the instance pointer in user data
        CREATESTRUCT* pCreate = (CREATESTRUCT*)lParam;
        pThis = (ControlPanel*)pCreate->lpCreateParams;
        SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)pThis);
    } else {
        // Retrieve the instance pointer from user data
        pThis = (ControlPanel*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
    }
    
    // Process messages
    if (pThis) {
        switch (uMsg) {
            case WM_COMMAND:
            {
                int wmId = LOWORD(wParam);
                
                switch (wmId) {
                    case IDC_TOGGLE_OVERLAY:
                        // Toggle overlay visibility
                        if (pThis->m_pOverlay) {
                            pThis->m_pOverlay->ToggleVisibility();
                        }
                        break;
                    
                    case IDC_TOGGLE_PROTECTION:
                        // Toggle screen share protection
                        if (pThis->m_pOverlay) {
                            pThis->m_pOverlay->ToggleScreenShareProtection();
                        }
                        break;
                    
                    case IDC_TOGGLE_AUDIO:
                        // Toggle audio monitoring
                        if (pThis->m_isAudioMonitoring) {
                            // Stop monitoring
                            KillTimer(hwnd, IDT_AUDIO_MONITOR);
                            pThis->m_isAudioMonitoring = false;
                            SetWindowText(GetDlgItem(hwnd, IDC_TOGGLE_AUDIO), L"Start Audio Monitoring");
                            SendMessage(pThis->m_hwndAudioLevel, PBM_SETPOS, 0, 0);
                        } else {
                            // Start monitoring
                            SetTimer(hwnd, IDT_AUDIO_MONITOR, 50, NULL); // Update every 50ms
                            pThis->m_isAudioMonitoring = true;
                            SetWindowText(GetDlgItem(hwnd, IDC_TOGGLE_AUDIO), L"Stop Audio Monitoring");
                        }
                        break;
                    
                    case IDC_CAPTURE_SCREEN:
                        // Capture screen
                        pThis->CaptureScreen();
                        break;
                    
                    case IDC_COLOR_BLUE:
                        // Set blue color
                        if (pThis->m_pOverlay) {
                            pThis->m_pOverlay->SetColor(RGB(0, 0, 255));
                        }
                        break;
                    
                    case IDC_COLOR_RED:
                        // Set red color
                        if (pThis->m_pOverlay) {
                            pThis->m_pOverlay->SetColor(RGB(255, 0, 0));
                        }
                        break;
                    
                    case IDC_COLOR_GREEN:
                        // Set green color
                        if (pThis->m_pOverlay) {
                            pThis->m_pOverlay->SetColor(RGB(0, 255, 0));
                        }
                        break;
                    
                    case IDC_COLOR_BLACK:
                        // Set black color
                        if (pThis->m_pOverlay) {
                            pThis->m_pOverlay->SetColor(RGB(0, 0, 0));
                        }
                        break;
                }
                
                return 0;
            }
            
            case WM_HSCROLL:
            {
                // Handle trackbar changes
                HWND hTrackbar = (HWND)lParam;
                
                if (GetDlgCtrlID(hTrackbar) == IDC_OPACITY_SLIDER) {
                    // Get opacity value
                    int opacity = (int)SendMessage(hTrackbar, TBM_GETPOS, 0, 0);
                    
                    // Set overlay opacity
                    if (pThis->m_pOverlay) {
                        pThis->m_pOverlay->SetOpacity(opacity);
                    }
                }
                
                return 0;
            }
            
            case WM_TIMER:
            {
                if (wParam == IDT_AUDIO_MONITOR) {
                    // Update audio level
                    pThis->UpdateAudioLevel();
                }
                
                return 0;
            }
            
            case WM_CLOSE:
            {
                DestroyWindow(hwnd);
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
