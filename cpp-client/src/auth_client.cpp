#include "../include/auth_client.h"
#include <iostream>
#include <sstream>
#include <thread>
#include <chrono>

AuthClient::AuthClient() 
    : m_hSession(NULL), m_hConnect(NULL), m_isAuthenticated(false), 
      m_durationHours(0), m_authType(AuthType::ACCOUNT_LOGIN) {
}

AuthClient::~AuthClient() {
    if (m_hConnect) WinHttpCloseHandle(m_hConnect);
    if (m_hSession) WinHttpCloseHandle(m_hSession);
}

bool AuthClient::Initialize(const std::string& supabaseUrl, const std::string& anonKey) {
    m_supabaseUrl = supabaseUrl;
    m_anonKey = anonKey;
    
    // Extract hostname from URL
    size_t pos = supabaseUrl.find("://");
    if (pos != std::string::npos) {
        std::string hostname = supabaseUrl.substr(pos + 3);
        m_hostname = StringToWString(hostname);
    } else {
        m_hostname = StringToWString(supabaseUrl);
    }
    
    // Initialize WinHTTP session
    m_hSession = WinHttpOpen(
        L"InterviewAce C++ Client/1.0",
        WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
        WINHTTP_NO_PROXY_NAME,
        WINHTTP_NO_PROXY_BYPASS,
        0);
    
    if (!m_hSession) {
        std::cerr << "Failed to initialize WinHTTP session" << std::endl;
        return false;
    }
    
    // Connect to Supabase
    m_hConnect = WinHttpConnect(
        m_hSession,
        m_hostname.c_str(),
        INTERNET_DEFAULT_HTTPS_PORT,
        0);
    
    if (!m_hConnect) {
        std::cerr << "Failed to connect to Supabase" << std::endl;
        WinHttpCloseHandle(m_hSession);
        m_hSession = NULL;
        return false;
    }
    
    std::cout << "Authentication client initialized successfully" << std::endl;
    return true;
}

bool AuthClient::SignInWithPassword(const std::string& email, const std::string& password, AuthCallback callback) {
    std::thread([this, email, password, callback]() {
        try {
            json payload = {
                {"email", email},
                {"password", password}
            };
            
            std::string response = SendHttpRequest(
                L"/auth/v1/token?grant_type=password",
                "POST",
                payload.dump()
            );
            
            json responseJson = json::parse(response);
            
            if (responseJson.contains("access_token") && responseJson.contains("user")) {
                m_isAuthenticated = true;
                m_userEmail = email;
                m_authType = AuthType::ACCOUNT_LOGIN;
                m_durationHours = 1; // Default duration for account users
                std::cout << "Account authentication successful for " << email << std::endl;
                if (callback) callback(true, "Authentication successful", email);
            } else {
                std::string error = responseJson.contains("error_description") ? 
                    responseJson["error_description"] : "Invalid credentials";
                std::cerr << "Authentication failed: " << error << std::endl;
                if (callback) callback(false, error, "");
            }
        } catch (const std::exception& e) {
            std::cerr << "Exception during authentication: " << e.what() << std::endl;
            if (callback) callback(false, "Network error", "");
        }
    }).detach();
    
    return true;
}

bool AuthClient::VerifySessionCode(const std::string& sessionCode, SessionCallback callback) {
    std::thread([this, sessionCode, callback]() {
        try {
            json payload = {
                {"session_code", sessionCode}
            };
            
            std::string response = SendHttpRequest(
                L"/functions/v1/verify-session-code",
                "POST",
                payload.dump()
            );
            
            json responseJson = json::parse(response);
            
            if (responseJson.contains("success") && responseJson["success"]) {
                m_isAuthenticated = true;
                m_authType = AuthType::SESSION_CODE;
                m_sessionId = responseJson.contains("session_id") ? responseJson["session_id"] : sessionCode;
                m_durationHours = responseJson.contains("duration_hours") ? responseJson["duration_hours"] : 1;
                m_userEmail = responseJson.contains("user_email") ? responseJson["user_email"] : "session-user";
                
                std::cout << "Session authentication successful. Session: " << m_sessionId 
                         << ", Duration: " << m_durationHours << " hours" << std::endl;
                
                if (callback) callback(true, "Session authenticated successfully", m_sessionId, m_durationHours);
            } else {
                std::string error = responseJson.contains("error") ? 
                    responseJson["error"] : "Invalid session code";
                std::cerr << "Session authentication failed: " << error << std::endl;
                if (callback) callback(false, error, "", 0);
            }
        } catch (const std::exception& e) {
            std::cerr << "Exception verifying session code: " << e.what() << std::endl;
            if (callback) callback(false, "Network error", "", 0);
        }
    }).detach();
    
    return true;
}

void AuthClient::SignOut() {
    m_isAuthenticated = false;
    m_userEmail.clear();
    m_sessionId.clear();
    m_durationHours = 0;
    m_authType = AuthType::ACCOUNT_LOGIN;
    std::cout << "User signed out" << std::endl;
}

std::string AuthClient::CreateInterviewSession() {
    if (!m_isAuthenticated) {
        std::cerr << "Cannot create session: User not authenticated" << std::endl;
        return "";
    }
    
    // For account users, create a new session
    if (m_authType == AuthType::ACCOUNT_LOGIN) {
        auto now = std::chrono::system_clock::now();
        auto timestamp = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();
        
        std::string sessionId = "interview-" + std::to_string(timestamp) + "-" + m_userEmail.substr(0, m_userEmail.find('@'));
        m_sessionId = sessionId;
        
        std::cout << "Created interview session: " << sessionId << " for user: " << m_userEmail << std::endl;
        return sessionId;
    } else {
        // For session code users, return existing session ID
        std::cout << "Using existing session: " << m_sessionId << " with " << m_durationHours << " hours duration" << std::endl;
        return m_sessionId;
    }
}

std::string AuthClient::SendHttpRequest(
    const std::wstring& path, 
    const std::string& method, 
    const std::string& data, 
    const std::string& contentType) {
    
    HINTERNET hRequest = WinHttpOpenRequest(
        m_hConnect,
        StringToWString(method).c_str(),
        path.c_str(),
        NULL,
        WINHTTP_NO_REFERER,
        WINHTTP_DEFAULT_ACCEPT_TYPES,
        WINHTTP_FLAG_SECURE);
    
    if (!hRequest) {
        throw std::runtime_error("Failed to open HTTP request");
    }
    
    // Set headers
    std::wstring authHeader = L"Authorization: Bearer " + StringToWString(m_anonKey);
    std::wstring contentTypeHeader = L"Content-Type: " + StringToWString(contentType);
    
    WinHttpAddRequestHeaders(hRequest, authHeader.c_str(), -1, WINHTTP_ADDREQ_FLAG_ADD);
    WinHttpAddRequestHeaders(hRequest, contentTypeHeader.c_str(), -1, WINHTTP_ADDREQ_FLAG_ADD);
    
    // Send request
    if (!WinHttpSendRequest(
        hRequest,
        WINHTTP_NO_ADDITIONAL_HEADERS,
        0,
        (LPVOID)data.c_str(),
        data.size(),
        data.size(),
        0)) {
        WinHttpCloseHandle(hRequest);
        throw std::runtime_error("Failed to send HTTP request");
    }
    
    // Wait for response
    if (!WinHttpReceiveResponse(hRequest, NULL)) {
        WinHttpCloseHandle(hRequest);
        throw std::runtime_error("Failed to receive HTTP response");
    }
    
    // Read response data
    std::string responseData;
    DWORD bytesAvailable = 0;
    DWORD bytesRead = 0;
    char buffer[4096];
    
    while (WinHttpQueryDataAvailable(hRequest, &bytesAvailable) && bytesAvailable > 0) {
        if (bytesAvailable > sizeof(buffer)) bytesAvailable = sizeof(buffer);
        
        if (!WinHttpReadData(hRequest, buffer, bytesAvailable, &bytesRead)) {
            break;
        }
        
        responseData.append(buffer, bytesRead);
    }
    
    WinHttpCloseHandle(hRequest);
    return responseData;
}

std::wstring AuthClient::StringToWString(const std::string& str) {
    if (str.empty()) return std::wstring();
    
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
    std::wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstrTo[0], size_needed);
    return wstrTo;
}

std::string AuthClient::WStringToString(const std::wstring& wstr) {
    if (wstr.empty()) return std::string();
    
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);
    return strTo;
}
