
#pragma once

#include <windows.h>
#include <winhttp.h>
#include <string>
#include <functional>
#include <nlohmann/json.hpp>

#pragma comment(lib, "winhttp.lib")

using json = nlohmann::json;

// Authentication callback types
using AuthCallback = std::function<void(bool success, const std::string& message, const std::string& email)>;
using OTPCallback = std::function<void(bool success, const std::string& message)>;
using SessionCallback = std::function<void(bool success, const std::string& message, const std::string& sessionId, int durationHours)>;

// Authentication types
enum class AuthType {
    ACCOUNT_LOGIN,
    SESSION_CODE
};

// Authentication result structure
struct AuthResult {
    bool success;
    std::string email;
    std::string sessionId;
    int durationHours;
    AuthType authType;
    std::string errorMessage;
};

class AuthClient {
public:
    AuthClient();
    ~AuthClient();

    // Initialize the authentication client
    bool Initialize(const std::string& supabaseUrl, const std::string& anonKey);
    
    // Account-based authentication (existing users)
    bool SendOTP(const std::string& email, OTPCallback callback = nullptr);
    bool VerifyOTP(const std::string& email, const std::string& otp, AuthCallback callback = nullptr);
    
    // Session-based authentication (6-digit code from web app)
    bool VerifySessionCode(const std::string& sessionCode, SessionCallback callback = nullptr);
    
    // Check if user is currently authenticated
    bool IsAuthenticated() const { return m_isAuthenticated; }
    
    // Get current user info
    std::string GetUserEmail() const { return m_userEmail; }
    std::string GetSessionId() const { return m_sessionId; }
    int GetDurationHours() const { return m_durationHours; }
    AuthType GetAuthType() const { return m_authType; }
    
    // Sign out user
    void SignOut();
    
    // Create interview session for account users
    std::string CreateInterviewSession();

private:
    // WinHTTP handles
    HINTERNET m_hSession;
    HINTERNET m_hConnect;
    
    // API configuration
    std::string m_supabaseUrl;
    std::string m_anonKey;
    std::wstring m_hostname;
    
    // Authentication state
    bool m_isAuthenticated;
    std::string m_userEmail;
    std::string m_sessionId;
    int m_durationHours;
    AuthType m_authType;
    
    // Utility functions
    std::string SendHttpRequest(
        const std::wstring& path, 
        const std::string& method, 
        const std::string& data, 
        const std::string& contentType = "application/json"
    );
    
    std::wstring StringToWString(const std::string& str);
    std::string WStringToString(const std::wstring& wstr);
};
