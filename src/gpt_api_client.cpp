#include "../include/gpt_api_client.h"
#include <iostream>
#include <sstream>
#include <thread>
#include <mutex>
#include <filesystem>

// Utility function to extract hostname and path from URL
std::pair<std::wstring, std::wstring> SplitUrl(const std::string& url) {
    // Find the host part (after "https://" and before the next "/")
    size_t hostStart = url.find("://") + 3;
    size_t hostEnd = url.find("/", hostStart);
    
    std::string host = url.substr(hostStart, (hostEnd != std::string::npos) ? hostEnd - hostStart : std::string::npos);
    std::string path = (hostEnd != std::string::npos) ? url.substr(hostEnd) : "/";
    
    // Convert to wstring for WinHTTP
    std::wstring wHost(host.begin(), host.end());
    std::wstring wPath(path.begin(), path.end());
    
    return { wHost, wPath };
}

// Convert string to wide string for WinHTTP
std::wstring ToWString(const std::string& str) {
    return std::wstring(str.begin(), str.end());
}

// Constructor
GPTApiClient::GPTApiClient() : m_apiBaseUrl("https://api.openai.com") {
}

// Destructor
GPTApiClient::~GPTApiClient() {
    // Clean up WinHTTP handles
    if (m_hConnect) WinHttpCloseHandle(m_hConnect);
    if (m_hSession) WinHttpCloseHandle(m_hSession);
}

// Initialize WinHTTP session and connection
bool GPTApiClient::Initialize(const std::string& apiBaseUrl) {
    // Store the API base URL
    m_apiBaseUrl = apiBaseUrl;
    
    // Initialize WinHTTP session
    m_hSession = WinHttpOpen(
        L"AudioWhisper GPT Client/1.0",
        WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
        WINHTTP_NO_PROXY_NAME,
        WINHTTP_NO_PROXY_BYPASS,
        0);
    
    if (!m_hSession) {
        std::cerr << "Failed to initialize WinHTTP session for GPT API" << std::endl;
        return false;
    }
    
    // Parse base URL for hostname
    auto [wHost, _] = SplitUrl(m_apiBaseUrl);
    
    // Connect to the API server
    m_hConnect = WinHttpConnect(
        m_hSession,
        wHost.c_str(),
        INTERNET_DEFAULT_HTTPS_PORT,
        0);
    
    if (!m_hConnect) {
        std::cerr << "Failed to connect to GPT API server" << std::endl;
        WinHttpCloseHandle(m_hSession);
        m_hSession = NULL;
        return false;
    }
    
    m_initialized = true;
    std::cout << "GPT API client initialized with endpoint: " << m_apiBaseUrl << std::endl;
    return true;
}

// Send text to GPT API for processing
bool GPTApiClient::SendTextToGPT(const std::string& text, const std::string& apiKey, GPTResponseCallback callback) {
    if (!m_initialized) {
        std::cerr << "GPT API client not initialized" << std::endl;
        return false;
    }
    
    // Create a new thread to handle the API request asynchronously
    std::thread([this, text, apiKey, callback]() {
        // API endpoint for GPT
        std::wstring wPath = ToWString("/v1/chat/completions");
        
        // Create an HTTP request
        HINTERNET hRequest = WinHttpOpenRequest(
            m_hConnect,
            L"POST",
            wPath.c_str(),
            NULL,
            WINHTTP_NO_REFERER,
            WINHTTP_DEFAULT_ACCEPT_TYPES,
            WINHTTP_FLAG_SECURE);
        
        if (!hRequest) {
            std::cerr << "Failed to open GPT API request" << std::endl;
            if (callback) callback("Error: Failed to open API request");
            return;
        }
        
        // Create the JSON payload
        nlohmann::json payload = {
            {"model", "gpt-3.5-turbo"},
            {"messages", {
                {{"role", "system"}, {"content", "You are a helpful assistant."}},
                {{"role", "user"}, {"content", text}}
            }},
            {"max_tokens", 150},
            {"temperature", 0.7}
        };
        
        std::string jsonPayload = payload.dump();
        
        // Set headers
        std::wstring authHeader = L"Authorization: Bearer " + ToWString(apiKey);
        std::wstring contentType = L"Content-Type: application/json";
        
        LPCWSTR headers[] = {
            authHeader.c_str(),
            contentType.c_str()
        };
        
        if (!WinHttpAddRequestHeaders(
            hRequest,
            headers[0],
            -1,
            WINHTTP_ADDREQ_FLAG_ADD)) {
            std::cerr << "Failed to add Authorization header" << std::endl;
        }
        
        if (!WinHttpAddRequestHeaders(
            hRequest,
            headers[1],
            -1,
            WINHTTP_ADDREQ_FLAG_ADD)) {
            std::cerr << "Failed to add Content-Type header" << std::endl;
        }
        
        // Send the request
        if (!WinHttpSendRequest(
            hRequest,
            WINHTTP_NO_ADDITIONAL_HEADERS,
            0,
            (LPVOID)jsonPayload.c_str(),
            jsonPayload.size(),
            jsonPayload.size(),
            0)) {
            std::cerr << "Failed to send GPT API request" << std::endl;
            WinHttpCloseHandle(hRequest);
            if (callback) callback("Error: Failed to send API request");
            return;
        }
        
        // Wait for the response
        if (!WinHttpReceiveResponse(hRequest, NULL)) {
            std::cerr << "Failed to receive GPT API response" << std::endl;
            WinHttpCloseHandle(hRequest);
            if (callback) callback("Error: Failed to receive API response");
            return;
        }
        
        // Read the response data
        std::string responseData;
        DWORD bytesAvailable = 0;
        DWORD bytesRead = 0;
        char buffer[4096];
        
        while (WinHttpQueryDataAvailable(hRequest, &bytesAvailable) && bytesAvailable > 0) {
            if (bytesAvailable > sizeof(buffer)) bytesAvailable = sizeof(buffer);
            
            if (!WinHttpReadData(hRequest, buffer, bytesAvailable, &bytesRead)) {
                std::cerr << "Failed to read GPT API response data" << std::endl;
                break;
            }
            
            responseData.append(buffer, bytesRead);
        }
        
        // Clean up
        WinHttpCloseHandle(hRequest);
        
        // Extract the GPT response and invoke the callback
        std::string gptResponse = ExtractGPTResponseFromJSON(responseData);
        if (callback) callback(gptResponse);
    }).detach();
    
    return true;
}

// Extract GPT response from JSON
std::string GPTApiClient::ExtractGPTResponseFromJSON(const std::string& jsonResponse) {
    try {
        // Parse the JSON response
        nlohmann::json json = nlohmann::json::parse(jsonResponse);
        
        // Extract the response text from the JSON structure
        if (json.contains("choices") && json["choices"].is_array() && json["choices"].size() > 0) {
            if (json["choices"][0].contains("message") && 
                json["choices"][0]["message"].contains("content")) {
                return json["choices"][0]["message"]["content"];
            }
        }
        
        // If unable to extract response, return the entire JSON for debugging
        return "Error parsing GPT response: " + jsonResponse;
    }
    catch (const std::exception& e) {
        return "Exception parsing GPT response: " + std::string(e.what());
    }
}
