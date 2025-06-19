
#pragma once

#include <windows.h>
#include <string>
#include <functional>

// Authentication modes
enum class AuthMode {
    SESSION_CODE,
    EMAIL_PASSWORD,
    AUTHENTICATED
};

// Authentication result structure
struct AuthResult {
    bool success;
    std::string sessionId;
    std::string userEmail;
    std::string errorMessage;
    AuthMode mode;
};

// Authentication callback function type
typedef std::function<void(const AuthResult&)> AuthCallback;

class AuthenticationDialog {
public:
    AuthenticationDialog();
    ~AuthenticationDialog();

    // Show authentication dialog
    bool ShowDialog(HWND parent, AuthCallback callback);
    
    // Close dialog
    void CloseDialog();
    
    // Get window handle
    HWND GetHWND() const { return m_hWnd; }

private:
    // Window procedure
    static LRESULT CALLBACK DialogProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);
    
    // Create dialog controls
    void CreateControls();
    
    // Handle authentication attempt
    void HandleAuthentication();
    
    // Switch between authentication modes
    void SwitchMode(AuthMode mode);
    
    // Validate session code
    bool ValidateSessionCode(const std::string& code);
    
    // Validate email/password
    bool ValidateEmailPassword(const std::string& email, const std::string& password);
    
    // Send HTTP request to authentication API
    std::string SendAuthRequest(const std::string& endpoint, const std::string& jsonData);

private:
    HWND m_hWnd;
    HWND m_hParent;
    AuthMode m_currentMode;
    AuthCallback m_callback;
    
    // Controls
    HWND m_hModeButton1;      // Session Code button
    HWND m_hModeButton2;      // Email/Password button
    HWND m_hSessionCodeEdit;  // Session code input
    HWND m_hEmailEdit;        // Email input
    HWND m_hPasswordEdit;     // Password input
    HWND m_hLoginButton;      // Login/Connect button
    HWND m_hStatusText;       // Status/error message
    HWND m_hCancelButton;     // Cancel button
};

// Global authentication state
extern AuthResult g_authResult;
extern bool g_isAuthenticated;
