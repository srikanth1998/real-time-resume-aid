
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

// Authentication result structure
struct AuthResult {
    bool success;
    std::string email;
    std::string sessionId;
    std::string errorMessage;
};

class AuthClient {
public:
    AuthClient();
    ~AuthClient();

    // Initialize the authentication client
    bool Initialize(const std::string& supabaseUrl, const std::string& anonKey);
    
    // Send OTP to email
    bool SendOTP(const std::string& email, OTPCallback callback = nullptr);
    
    // Verify OTP and authenticate user
    bool VerifyOTP(const std::string& email, const std::string& otp, AuthCallback callback = nullptr);
    
    // Check if user is currently authenticated
    bool IsAuthenticated() const { return m_isAuthenticated; }
    
    // Get current user email
    std::string GetUserEmail() const { return m_userEmail; }
    
    // Sign out user
    void SignOut();
    
    // Create interview session for authenticated user
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
