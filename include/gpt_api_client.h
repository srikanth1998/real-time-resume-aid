#pragma once

#include <windows.h>
#include <winhttp.h>
#include <string>
#include <functional>
#include <vector>
#include <nlohmann/json.hpp>

// Callback for GPT API responses
using GPTResponseCallback = std::function<void(const std::string&)>;

class GPTApiClient {
public:
    GPTApiClient();
    ~GPTApiClient();

    // Initialize WinHTTP session and connection
    bool Initialize(const std::string& apiBaseUrl = "https://api.openai.com");

    // Send text to GPT API for processing
    bool SendTextToGPT(const std::string& text, const std::string& apiKey, GPTResponseCallback callback);

private:
    // WinHTTP handles
    HINTERNET m_hSession = NULL;
    HINTERNET m_hConnect = NULL;
    
    // API base URL
    std::string m_apiBaseUrl;
    
    // Flag to check if initialized
    bool m_initialized = false;
    
    // Extract GPT response from JSON
    std::string ExtractGPTResponseFromJSON(const std::string& jsonResponse);
};
