
#include "Authentication.h"
#include <winhttp.h>
#include <commctrl.h>
#include <json/json.h>
#include <sstream>

#pragma comment(lib, "winhttp.lib")
#pragma comment(lib, "comctl32.lib")

// Global authentication state
AuthResult g_authResult;
bool g_isAuthenticated = false;

// Control IDs
#define ID_MODE_SESSION 1001
#define ID_MODE_EMAIL 1002
#define ID_SESSION_EDIT 1003
#define ID_EMAIL_EDIT 1004
#define ID_PASSWORD_EDIT 1005
#define ID_LOGIN_BUTTON 1006
#define ID_CANCEL_BUTTON 1007
#define ID_STATUS_TEXT 1008

AuthenticationDialog::AuthenticationDialog() 
    : m_hWnd(nullptr), m_hParent(nullptr), m_currentMode(AuthMode::SESSION_CODE), m_callback(nullptr) {
}

AuthenticationDialog::~AuthenticationDialog() {
    if (m_hWnd && IsWindow(m_hWnd)) {
        DestroyWindow(m_hWnd);
    }
}

bool AuthenticationDialog::ShowDialog(HWND parent, AuthCallback callback) {
    m_hParent = parent;
    m_callback = callback;
    
    // Register window class
    WNDCLASSEX wcex = {};
    wcex.cbSize = sizeof(WNDCLASSEX);
    wcex.style = CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc = DialogProc;
    wcex.hInstance = GetModuleHandle(nullptr);
    wcex.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wcex.lpszClassName = L"AuthDialogClass";
    
    RegisterClassEx(&wcex);
    
    // Create dialog window
    m_hWnd = CreateWindowEx(
        WS_EX_DLGMODALFRAME | WS_EX_TOPMOST,
        L"AuthDialogClass",
        L"Interview Authentication",
        WS_POPUP | WS_CAPTION | WS_SYSMENU,
        CW_USEDEFAULT, CW_USEDEFAULT, 450, 350,
        parent, nullptr, GetModuleHandle(nullptr), this
    );
    
    if (!m_hWnd) {
        return false;
    }
    
    ShowWindow(m_hWnd, SW_SHOW);
    UpdateWindow(m_hWnd);
    
    return true;
}

void AuthenticationDialog::CreateControls() {
    // Title
    CreateWindow(L"STATIC", L"Connect to Interview Session",
        WS_VISIBLE | WS_CHILD | SS_CENTER,
        20, 20, 390, 30, m_hWnd, nullptr, GetModuleHandle(nullptr), nullptr);
    
    // Mode selection buttons
    m_hModeButton1 = CreateWindow(L"BUTTON", L"Enter Session Code",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON | WS_TABSTOP,
        50, 70, 150, 35, m_hWnd, (HMENU)ID_MODE_SESSION, GetModuleHandle(nullptr), nullptr);
    
    m_hModeButton2 = CreateWindow(L"BUTTON", L"Login with Email",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON | WS_TABSTOP,
        220, 70, 150, 35, m_hWnd, (HMENU)ID_MODE_EMAIL, GetModuleHandle(nullptr), nullptr);
    
    // Session code input (initially visible)
    CreateWindow(L"STATIC", L"Session Code:",
        WS_VISIBLE | WS_CHILD,
        50, 130, 100, 20, m_hWnd, nullptr, GetModuleHandle(nullptr), nullptr);
    
    m_hSessionCodeEdit = CreateWindow(L"EDIT", L"",
        WS_VISIBLE | WS_CHILD | WS_BORDER | ES_UPPERCASE | WS_TABSTOP,
        50, 150, 320, 25, m_hWnd, (HMENU)ID_SESSION_EDIT, GetModuleHandle(nullptr), nullptr);
    
    // Email input (initially hidden)
    CreateWindow(L"STATIC", L"Email:",
        WS_CHILD,
        50, 130, 100, 20, m_hWnd, (HMENU)(ID_EMAIL_EDIT + 100), GetModuleHandle(nullptr), nullptr);
    
    m_hEmailEdit = CreateWindow(L"EDIT", L"",
        WS_CHILD | WS_BORDER | ES_LOWERCASE | WS_TABSTOP,
        50, 150, 320, 25, m_hWnd, (HMENU)ID_EMAIL_EDIT, GetModuleHandle(nullptr), nullptr);
    
    // Password input (initially hidden)
    CreateWindow(L"STATIC", L"Password:",
        WS_CHILD,
        50, 180, 100, 20, m_hWnd, (HMENU)(ID_PASSWORD_EDIT + 100), GetModuleHandle(nullptr), nullptr);
    
    m_hPasswordEdit = CreateWindow(L"EDIT", L"",
        WS_CHILD | WS_BORDER | ES_PASSWORD | WS_TABSTOP,
        50, 200, 320, 25, m_hWnd, (HMENU)ID_PASSWORD_EDIT, GetModuleHandle(nullptr), nullptr);
    
    // Login button
    m_hLoginButton = CreateWindow(L"BUTTON", L"Connect to Session",
        WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON | WS_TABSTOP,
        50, 250, 150, 35, m_hWnd, (HMENU)ID_LOGIN_BUTTON, GetModuleHandle(nullptr), nullptr);
    
    // Cancel button
    m_hCancelButton = CreateWindow(L"BUTTON", L"Cancel",
        WS_VISIBLE | WS_CHILD | BS_PUSHBUTTON | WS_TABSTOP,
        220, 250, 100, 35, m_hWnd, (HMENU)ID_CANCEL_BUTTON, GetModuleHandle(nullptr), nullptr);
    
    // Status text
    m_hStatusText = CreateWindow(L"STATIC", L"Select authentication method above",
        WS_VISIBLE | WS_CHILD | SS_CENTER,
        50, 300, 320, 20, m_hWnd, (HMENU)ID_STATUS_TEXT, GetModuleHandle(nullptr), nullptr);
    
    // Set initial mode
    SwitchMode(AuthMode::SESSION_CODE);
}

void AuthenticationDialog::SwitchMode(AuthMode mode) {
    m_currentMode = mode;
    
    if (mode == AuthMode::SESSION_CODE) {
        // Show session code controls
        ShowWindow(m_hSessionCodeEdit, SW_SHOW);
        ShowWindow(GetDlgItem(m_hWnd, ID_SESSION_EDIT + 100), SW_SHOW);
        
        // Hide email/password controls
        ShowWindow(m_hEmailEdit, SW_HIDE);
        ShowWindow(m_hPasswordEdit, SW_HIDE);
        ShowWindow(GetDlgItem(m_hWnd, ID_EMAIL_EDIT + 100), SW_HIDE);
        ShowWindow(GetDlgItem(m_hWnd, ID_PASSWORD_EDIT + 100), SW_HIDE);
        
        SetWindowText(m_hLoginButton, L"Connect to Session");
        SetWindowText(m_hStatusText, L"Enter the session code provided after payment");
        
        SetFocus(m_hSessionCodeEdit);
    } else {
        // Hide session code controls
        ShowWindow(m_hSessionCodeEdit, SW_HIDE);
        ShowWindow(GetDlgItem(m_hWnd, ID_SESSION_EDIT + 100), SW_HIDE);
        
        // Show email/password controls
        ShowWindow(m_hEmailEdit, SW_SHOW);
        ShowWindow(m_hPasswordEdit, SW_SHOW);
        ShowWindow(GetDlgItem(m_hWnd, ID_EMAIL_EDIT + 100), SW_SHOW);
        ShowWindow(GetDlgItem(m_hWnd, ID_PASSWORD_EDIT + 100), SW_SHOW);
        
        SetWindowText(m_hLoginButton, L"Login to Account");
        SetWindowText(m_hStatusText, L"Enter your account credentials");
        
        SetFocus(m_hEmailEdit);
    }
}

void AuthenticationDialog::HandleAuthentication() {
    AuthResult result = {};
    result.mode = m_currentMode;
    
    if (m_currentMode == AuthMode::SESSION_CODE) {
        // Get session code
        wchar_t codeBuffer[256];
        GetWindowText(m_hSessionCodeEdit, codeBuffer, sizeof(codeBuffer) / sizeof(wchar_t));
        
        // Convert to string
        char sessionCode[256];
        WideCharToMultiByte(CP_UTF8, 0, codeBuffer, -1, sessionCode, sizeof(sessionCode), nullptr, nullptr);
        
        if (strlen(sessionCode) == 0) {
            SetWindowText(m_hStatusText, L"Please enter a session code");
            return;
        }
        
        SetWindowText(m_hStatusText, L"Connecting to session...");
        
        if (ValidateSessionCode(sessionCode)) {
            result.success = true;
            result.sessionId = sessionCode;
            SetWindowText(m_hStatusText, L"Connected successfully!");
        } else {
            result.success = false;
            result.errorMessage = "Invalid session code or session expired";
            SetWindowText(m_hStatusText, L"Invalid session code. Please try again.");
            return;
        }
    } else {
        // Get email and password
        wchar_t emailBuffer[256], passwordBuffer[256];
        GetWindowText(m_hEmailEdit, emailBuffer, sizeof(emailBuffer) / sizeof(wchar_t));
        GetWindowText(m_hPasswordEdit, passwordBuffer, sizeof(passwordBuffer) / sizeof(wchar_t));
        
        char email[256], password[256];
        WideCharToMultiByte(CP_UTF8, 0, emailBuffer, -1, email, sizeof(email), nullptr, nullptr);
        WideCharToMultiByte(CP_UTF8, 0, passwordBuffer, -1, password, sizeof(password), nullptr, nullptr);
        
        if (strlen(email) == 0 || strlen(password) == 0) {
            SetWindowText(m_hStatusText, L"Please enter both email and password");
            return;
        }
        
        SetWindowText(m_hStatusText, L"Logging in...");
        
        if (ValidateEmailPassword(email, password)) {
            result.success = true;
            result.userEmail = email;
            SetWindowText(m_hStatusText, L"Login successful!");
        } else {
            result.success = false;
            result.errorMessage = "Invalid email or password";
            SetWindowText(m_hStatusText, L"Invalid credentials. Please try again.");
            return;
        }
    }
    
    if (result.success) {
        g_authResult = result;
        g_isAuthenticated = true;
        
        // Call callback after a short delay to show success message
        Sleep(1000);
        
        if (m_callback) {
            m_callback(result);
        }
        
        CloseDialog();
    }
}

bool AuthenticationDialog::ValidateSessionCode(const std::string& code) {
    // Prepare JSON data
    std::string jsonData = "{\"sessionCode\":\"" + code + "\"}";
    
    // Send request to validate session code
    std::string response = SendAuthRequest("/api/validate-session", jsonData);
    
    // Parse response (simplified - would use proper JSON parsing in production)
    return response.find("\"success\":true") != std::string::npos;
}

bool AuthenticationDialog::ValidateEmailPassword(const std::string& email, const std::string& password) {
    // Prepare JSON data
    std::string jsonData = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    
    // Send request to authenticate user
    std::string response = SendAuthRequest("/api/auth/login", jsonData);
    
    // Parse response (simplified - would use proper JSON parsing in production)
    return response.find("\"success\":true") != std::string::npos;
}

std::string AuthenticationDialog::SendAuthRequest(const std::string& endpoint, const std::string& jsonData) {
    // This is a simplified HTTP client - in production you'd want more robust error handling
    HINTERNET hSession = WinHttpOpen(L"PrivacyOverlay/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, nullptr, nullptr, 0);
    if (!hSession) return "";
    
    HINTERNET hConnect = WinHttpConnect(hSession, L"your-api-domain.com", INTERNET_DEFAULT_HTTPS_PORT, 0);
    if (!hConnect) {
        WinHttpCloseHandle(hSession);
        return "";
    }
    
    std::wstring wEndpoint(endpoint.begin(), endpoint.end());
    HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"POST", wEndpoint.c_str(), nullptr, nullptr, nullptr, WINHTTP_FLAG_SECURE);
    if (!hRequest) {
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return "";
    }
    
    // Set headers
    std::wstring headers = L"Content-Type: application/json\r\n";
    WinHttpAddRequestHeaders(hRequest, headers.c_str(), headers.length(), WINHTTP_ADDREQ_FLAG_ADD);
    
    // Send request
    BOOL result = WinHttpSendRequest(hRequest, nullptr, 0, (LPVOID)jsonData.c_str(), jsonData.length(), jsonData.length(), 0);
    
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
    }
    
    WinHttpCloseHandle(hRequest);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);
    
    return response;
}

LRESULT CALLBACK AuthenticationDialog::DialogProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    AuthenticationDialog* dialog = nullptr;
    
    if (uMsg == WM_CREATE) {
        CREATESTRUCT* cs = (CREATESTRUCT*)lParam;
        dialog = (AuthenticationDialog*)cs->lpCreateParams;
        SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)dialog);
        dialog->CreateControls();
    } else {
        dialog = (AuthenticationDialog*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
    }
    
    if (!dialog) return DefWindowProc(hwnd, uMsg, wParam, lParam);
    
    switch (uMsg) {
        case WM_COMMAND:
            switch (LOWORD(wParam)) {
                case ID_MODE_SESSION:
                    dialog->SwitchMode(AuthMode::SESSION_CODE);
                    break;
                    
                case ID_MODE_EMAIL:
                    dialog->SwitchMode(AuthMode::EMAIL_PASSWORD);
                    break;
                    
                case ID_LOGIN_BUTTON:
                    dialog->HandleAuthentication();
                    break;
                    
                case ID_CANCEL_BUTTON:
                    dialog->CloseDialog();
                    break;
            }
            break;
            
        case WM_CLOSE:
            dialog->CloseDialog();
            break;
            
        case WM_DESTROY:
            PostQuitMessage(0);
            break;
    }
    
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

void AuthenticationDialog::CloseDialog() {
    if (m_hWnd && IsWindow(m_hWnd)) {
        DestroyWindow(m_hWnd);
        m_hWnd = nullptr;
    }
}
