#pragma once

#include <windows.h>
#include <winhttp.h>
#include <string>
#include <functional>
#include <vector>
#include <nlohmann/json.hpp>

#pragma comment(lib, "winhttp.lib")

// For convenience
using json = nlohmann::json;

// Callback type for API responses
using WhisperAPICallback = std::function<void(const std::string&)>;

class WhisperAPIClient {
public:
    WhisperAPIClient();
    ~WhisperAPIClient();

    // Initialize the WinHTTP session
    bool Initialize();
    
    // Send audio file to Whisper API (Supabase endpoint)
    bool SendAudioToAPI(
        const std::string& audioFilePath, 
        const std::string& anonKey,
        WhisperAPICallback callback = nullptr
    );
    
    // Initialize a session with the GPT edge function
    bool InitializeGPTSession(
        const std::string& sessionId,
        const std::string& anonKey,
        WhisperAPICallback callback = nullptr
    );
    
    // Send transcription to GPT API for interview answers
    bool SendTranscriptionForAnswer(
        const std::string& question,
        const std::string& sessionId,
        const std::string& anonKey,
        WhisperAPICallback callback = nullptr
    );
    
    // Send audio file
    bool SendAudioFile(
        const std::string& filePath, 
        std::function<void(const std::string&)> resultCallback, 
        std::function<void(const std::string&)> errorCallback,
        float audioDurationSec = 0.0f
    );
    
    // Set API endpoint parameters
    void SetAPIEndpoint(
        const std::string& host, 
        const std::string& speechToTextPath,
        const std::string& gptAnswerPath,
        int port = 443, 
        bool isSecure = true
    );

private:
    // WinHTTP handles
    HINTERNET m_hSession;
    HINTERNET m_hConnect;
    
    // API endpoint parameters
    std::wstring m_apiHost;
    std::wstring m_speechToTextPath;
    std::wstring m_gptAnswerPath;
    int m_apiPort;
    bool m_isSecure;
    
    // Utility functions
    std::string WideToUtf8(const std::wstring& wstr);
    std::wstring Utf8ToWide(const std::string& str);
    std::string Base64Encode(const std::vector<BYTE>& data);
    
    // Parse and clean response to remove hallucinated content
    std::string CleanWhisperResponse(const std::string& jsonResponse, float audioDurationSec);
    
    // HTTP request handling
    std::string SendHttpRequest(
        const std::wstring& hostname, 
        const std::wstring& path, 
        const std::string& method, 
        const std::string& data, 
        const std::string& contentType,
        const std::string& anonKey
    );
};
