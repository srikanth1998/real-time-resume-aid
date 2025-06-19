#include "OverlayWindow.h"
#include <windowsx.h>
#include <winhttp.h>
#include <sstream>
#include <algorithm>
#include <regex>

#pragma comment(lib, "winhttp.lib")

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
    , m_waitingForAnswer(false)
    , m_hScrollArea(NULL)
    , m_hQuestionText(NULL)
    , m_hAnswerText(NULL)
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
    
    // Create window with extended style for layering - make it larger for Q&A display
    m_hWnd = CreateWindowEx(
        WS_EX_LAYERED | WS_EX_TOPMOST,
        OVERLAY_CLASS_NAME,
        L"Privacy Overlay",
        WS_POPUP,
        CW_USEDEFAULT, CW_USEDEFAULT, 500, 400, // Increased size
        NULL,
        NULL,
        hInstance,
        this
    );
    
    if (!m_hWnd) {
        return false;
    }
    
    // Create text display controls
    m_hQuestionText = CreateWindowEx(
        WS_EX_CLIENTEDGE,
        L"EDIT",
        L"Listening for questions...",
        WS_CHILD | WS_VISIBLE | ES_MULTILINE | ES_READONLY | WS_VSCROLL,
        10, 10, 470, 150,
        m_hWnd,
        NULL,
        hInstance,
        NULL
    );
    
    m_hAnswerText = CreateWindowEx(
        WS_EX_CLIENTEDGE,
        L"EDIT",
        L"AI answers will appear here...",
        WS_CHILD | WS_VISIBLE | ES_MULTILINE | ES_READONLY | WS_VSCROLL,
        10, 180, 470, 200,
        m_hWnd,
        NULL,
        hInstance,
        NULL
    );
    
    // Set font for better readability
    HFONT hFont = CreateFont(14, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
        DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        DEFAULT_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
    
    SendMessage(m_hQuestionText, WM_SETFONT, (WPARAM)hFont, TRUE);
    SendMessage(m_hAnswerText, WM_SETFONT, (WPARAM)hFont, TRUE);
    
    return true;
}

// Add question to display
void OverlayWindow::AddQuestion(const std::string& question) {
    m_currentQuestion = question;
    m_waitingForAnswer = true;
    
    // Convert to wide string and display
    int len = MultiByteToWideChar(CP_UTF8, 0, question.c_str(), -1, NULL, 0);
    std::wstring wQuestion(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, question.c_str(), -1, &wQuestion[0], len);
    
    // Add timestamp
    std::wstring displayText = L"QUESTION: " + wQuestion + L"\r\n";
    SetWindowText(m_hQuestionText, displayText.c_str());
    
    // Clear previous answer
    SetWindowText(m_hAnswerText, L"Generating answer...");
    
    // Process the question with GPT
    ProcessQuestion(question);
}

// Add answer to display
void OverlayWindow::AddAnswer(const std::string& answer) {
    if (!m_waitingForAnswer) return;
    
    // Convert to wide string and display
    int len = MultiByteToWideChar(CP_UTF8, 0, answer.c_str(), -1, NULL, 0);
    std::wstring wAnswer(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, answer.c_str(), -1, &wAnswer[0], len);
    
    std::wstring displayText = L"ANSWER: " + wAnswer;
    SetWindowText(m_hAnswerText, displayText.c_str());
    
    // Store the Q&A pair
    QuestionAnswerPair qa;
    qa.question = m_currentQuestion;
    qa.answer = answer;
    qa.timestamp = GetTickCount();
    m_questionAnswers.push_back(qa);
    
    m_waitingForAnswer = false;
}

// Check if text is a question
bool OverlayWindow::IsQuestion(const std::string& text) {
    if (text.empty()) return false;
    
    // Convert to lowercase for checking
    std::string lowerText = text;
    std::transform(lowerText.begin(), lowerText.end(), lowerText.begin(), ::tolower);
    
    // Question indicators
    if (text.back() == '?') return true;
    
    // Common question starters
    std::vector<std::string> questionStarters = {
        "what", "how", "why", "when", "where", "who", "which", "whose",
        "can you", "could you", "would you", "do you", "did you", "have you",
        "tell me", "explain", "describe", "walk me through"
    };
    
    for (const auto& starter : questionStarters) {
        if (lowerText.find(starter) == 0) {
            return true;
        }
    }
    
    return false;
}

// Process question with GPT
void OverlayWindow::ProcessQuestion(const std::string& question) {
    // Run in separate thread to avoid blocking UI
    std::thread([this, question]() {
        try {
            // Prepare JSON payload
            std::string jsonPayload = "{\"sessionId\":\"" + 
                (g_authResult.sessionId.empty() ? "default" : g_authResult.sessionId) + 
                "\",\"question\":\"" + question + "\",\"streaming\":false}";
            
            // Send HTTP request to Supabase function
            HINTERNET hSession = WinHttpOpen(L"PrivacyOverlay/1.0", 
                WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, nullptr, nullptr, 0);
            
            if (!hSession) return;
            
            HINTERNET hConnect = WinHttpConnect(hSession, 
                L"jafylkqbmvdptrqwwyed.supabase.co", INTERNET_DEFAULT_HTTPS_PORT, 0);
            
            if (!hConnect) {
                WinHttpCloseHandle(hSession);
                return;
            }
            
            HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"POST", 
                L"/functions/v1/generate-interview-answer", nullptr, nullptr, nullptr, 
                WINHTTP_FLAG_SECURE);
            
            if (!hRequest) {
                WinHttpCloseHandle(hConnect);
                WinHttpCloseHandle(hSession);
                return;
            }
            
            // Set headers
            std::wstring headers = L"Content-Type: application/json\r\n"
                                  L"Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY\r\n"
                                  L"apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY\r\n";
            
            WinHttpAddRequestHeaders(hRequest, headers.c_str(), headers.length(), 
                WINHTTP_ADDREQ_FLAG_ADD);
            
            // Send request
            BOOL result = WinHttpSendRequest(hRequest, nullptr, 0, 
                (LPVOID)jsonPayload.c_str(), jsonPayload.length(), jsonPayload.length(), 0);
            
            std::string response;
            if (result && WinHttpReceiveResponse(hRequest, nullptr)) {
                DWORD size = 0;
                DWORD downloaded = 0;
                LPSTR buffer;
                
                do {
                    size = 0;
                    if (!WinHttpQueryDataAvailable(hRequest, &size)) break;
                    
                    buffer = new char[size + 1];
                    if (!buffer) break;
                    
                    ZeroMemory(buffer, size + 1);
                    
                    if (WinHttpReadData(hRequest, (LPVOID)buffer, size, &downloaded)) {
                        response.append(buffer, downloaded);
                    }
                    
                    delete[] buffer;
                } while (size > 0);
                
                // Parse response to extract answer
                size_t answerStart = response.find("\"answer\":\"");
                if (answerStart != std::string::npos) {
                    answerStart += 10; // Skip "answer":"
                    size_t answerEnd = response.find("\"", answerStart);
                    if (answerEnd != std::string::npos) {
                        std::string answer = response.substr(answerStart, answerEnd - answerStart);
                        
                        // Post back to UI thread
                        PostMessage(m_hWnd, WM_USER + 1, 0, (LPARAM)new std::string(answer));
                    }
                }
            }
            
            WinHttpCloseHandle(hRequest);
            WinHttpCloseHandle(hConnect);
            WinHttpCloseHandle(hSession);
            
        } catch (...) {
            // Error handling - post error message
            PostMessage(m_hWnd, WM_USER + 1, 0, (LPARAM)new std::string("Error generating answer"));
        }
    }).detach();
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
            case WM_USER + 1: // Custom message for GPT response
            {
                std::string* answer = (std::string*)lParam;
                if (answer) {
                    pThis->AddAnswer(*answer);
                    delete answer;
                }
                return 0;
            }
            
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
