#include "../include/whisper_api_client.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <codecvt>
#include <locale>

// Constructor
WhisperAPIClient::WhisperAPIClient() 
    : m_hSession(NULL), m_hConnect(NULL), m_apiPort(443), m_isSecure(true) {
    // Default API endpoint - Supabase endpoints
    m_apiHost = L"jafylkqbmvdptrqwwyed.supabase.co";
    m_speechToTextPath = L"/functions/v1/speech-to-text";
    m_gptAnswerPath = L"/functions/v1/generate-interview-answer";
}

// Destructor
WhisperAPIClient::~WhisperAPIClient() {
    // Clean up WinHTTP handles
    if (m_hConnect) WinHttpCloseHandle(m_hConnect);
    if (m_hSession) WinHttpCloseHandle(m_hSession);
}

// Initialize WinHTTP session
bool WhisperAPIClient::Initialize() {
    // Initialize WinHTTP
    m_hSession = WinHttpOpen(
        L"Whisper API Client/1.0",
        WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
        WINHTTP_NO_PROXY_NAME,
        WINHTTP_NO_PROXY_BYPASS,
        0
    );

    if (!m_hSession) {
        std::cerr << "Failed to initialize WinHTTP session: " << GetLastError() << std::endl;
        return false;
    }

    std::cout << "WinHTTP session initialized" << std::endl;
    return true;
}

// Set API endpoint parameters
void WhisperAPIClient::SetAPIEndpoint(
    const std::string& host, 
    const std::string& speechToTextPath, 
    const std::string& gptAnswerPath,
    int port, 
    bool isSecure
) {
    m_apiHost = Utf8ToWide(host);
    m_speechToTextPath = Utf8ToWide(speechToTextPath);
    m_gptAnswerPath = Utf8ToWide(gptAnswerPath);
    m_apiPort = port;
    m_isSecure = isSecure;
    
    std::cout << "API host set to: " 
              << WideToUtf8(m_apiHost) << ":" << m_apiPort
              << (m_isSecure ? " (HTTPS)" : " (HTTP)") << std::endl;
    std::cout << "Speech-to-Text endpoint: " << WideToUtf8(m_speechToTextPath) << std::endl;
    std::cout << "GPT Answer endpoint: " << WideToUtf8(m_gptAnswerPath) << std::endl;
}

// Send audio file to Whisper API (Supabase endpoint)
bool WhisperAPIClient::SendAudioToAPI(
    const std::string& audioFilePath, 
    const std::string& anonKey,
    WhisperAPICallback callback
) {
    if (!m_hSession) {
        std::cerr << "WinHTTP session not initialized" << std::endl;
        return false;
    }

    // Read audio file
    std::ifstream file(audioFilePath, std::ios::binary | std::ios::ate);
    if (!file) {
        std::cerr << "Failed to open file: " << audioFilePath << std::endl;
        return false;
    }

    // Get file size
    std::streamsize fileSize = file.tellg();
    file.seekg(0, std::ios::beg);

    // Read file data
    std::vector<BYTE> fileData(fileSize);
    if (!file.read(reinterpret_cast<char*>(fileData.data()), fileSize)) {
        std::cerr << "Failed to read file data" << std::endl;
        return false;
    }

    std::cout << "Read " << fileData.size() << " bytes from " << audioFilePath << std::endl;
    
    // Calculate audio duration from the WAV file
    float audioDurationSec = 0.0f;
    try {
        // Read basic WAV header info to calculate duration
        // Skip first 44 bytes (WAV header)
        if (fileSize > 44) {
            // Extract sample rate from bytes 24-27
            uint32_t sampleRate = 0;
            memcpy(&sampleRate, &fileData[24], 4);
            
            // Extract data size from bytes 40-43
            uint32_t dataSize = 0;
            memcpy(&dataSize, &fileData[40], 4);
            
            // Extract bytes per sample and channels
            uint16_t bitsPerSample = 0;
            memcpy(&bitsPerSample, &fileData[34], 2);
            
            uint16_t numChannels = 0;
            memcpy(&numChannels, &fileData[22], 2);
            
            // Calculate duration
            if (sampleRate > 0 && bitsPerSample > 0 && numChannels > 0) {
                audioDurationSec = static_cast<float>(dataSize) / 
                                  (sampleRate * (bitsPerSample/8) * numChannels);
                std::cout << "Calculated audio duration: " << audioDurationSec << " seconds" << std::endl;
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Warning: Could not calculate audio duration: " << e.what() << std::endl;
        // Continue anyway, we'll just not do timestamp filtering
    }

    // Encode file data to base64
    std::string base64Data = Base64Encode(fileData);
    std::cout << "Encoded audio data to base64 (" << base64Data.length() << " characters)" << std::endl;

    // Create JSON payload with base64 encoded audio and request response_format=verbose_json
    std::string jsonPayload = "{\n";  // Opening bracket
    jsonPayload += "  \"audio\": \"" + base64Data + "\",\n";  // Base64 encoded audio file
    jsonPayload += "  \"response_format\": \"verbose_json\"\n";  // Request verbose JSON with timestamps
    jsonPayload += "}";  // Closing bracket

    // Send HTTP request
    try {
        std::string response = SendHttpRequest(
            m_apiHost, 
            m_speechToTextPath, 
            "POST", 
            jsonPayload, 
            "application/json",
            anonKey
        );

        if (response.empty()) {
            std::cerr << "Empty response received from Whisper API. The request may have timed out." << std::endl;
            std::cerr << "This often happens with large audio files or when the Supabase instance is busy." << std::endl;
            std::cerr << "Try again or reduce the audio duration." << std::endl;
            
            if (callback) {
                callback("[Error: API request failed or timed out. Please try again.]");
            }
            return false;
        }

        // Clean the response to remove hallucinated content
        std::string cleanedResponse = CleanWhisperResponse(response, audioDurationSec);
        
        if (callback) {
            callback(cleanedResponse);
        }

        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error sending audio to API: " << e.what() << std::endl;
        
        if (callback) {
            callback("[Error: " + std::string(e.what()) + "]");
        }
        return false;
    }
}

// Initialize a session with the GPT edge function
bool WhisperAPIClient::InitializeGPTSession(
    const std::string& sessionId,
    const std::string& anonKey,
    WhisperAPICallback callback
) {
    // Ensure session ID is not empty
    std::string formattedSessionId = sessionId;
    if (formattedSessionId.empty()) {
        formattedSessionId = "interview-" + std::to_string(std::time(nullptr));
        std::cerr << "WARNING: Empty session ID detected, using generated ID: " << formattedSessionId << std::endl;
    }
    
    // Debug output
    std::cout << "DEBUG: Session ID for initialization: '" << formattedSessionId << "'" << std::endl;
    
    // Construct JSON request body that exactly matches what the edge function expects
    std::string requestData = "{\"sessionId\": \"" + formattedSessionId + "\", "
                          + "\"question\": \"initialize\", "
                          + "\"model\": \"gpt-3.5-turbo\", "
                          + "\"system\": \"You are an interview coach helping candidates prepare for technical interviews. Provide concise, accurate answers.\"}";
    
    std::cout << "Session initialization payload: " << requestData << std::endl; 

    // Content type for JSON
    std::string contentType = "application/json";

    std::cout << "Initializing GPT session: " << formattedSessionId << std::endl;

    // Send HTTP request
    std::string response = SendHttpRequest(
        m_apiHost,
        m_gptAnswerPath,
        "POST",
        requestData,
        contentType,
        anonKey
    );

    // Handle response
    if (response.empty()) {
        std::cerr << "Failed to initialize GPT session" << std::endl;
        return false;
    }

    std::cout << "GPT session initialization response received" << std::endl;
    
    // Call the callback if provided
    if (callback) {
        callback(response);
    }

    return true;
}

// Send transcription to GPT API for interview answers
bool WhisperAPIClient::SendTranscriptionForAnswer(
    const std::string& question,
    const std::string& sessionId,
    const std::string& anonKey,
    WhisperAPICallback callback
) {
    // Escape any double quotes in the question text
    std::string escapedQuestion = question;
    size_t pos = 0;
    while((pos = escapedQuestion.find('"', pos)) != std::string::npos) {
        escapedQuestion.replace(pos, 1, "\\\"");
        pos += 2; // Move past the replacement
    }
    
    // Ensure session ID is not empty
    std::string formattedSessionId = sessionId;
    if (formattedSessionId.empty()) {
        formattedSessionId = "interview-" + std::to_string(std::time(nullptr));
        std::cerr << "WARNING: Empty session ID detected, using generated ID: " << formattedSessionId << std::endl;
    }
    
    // Add validation and debugging
    if (escapedQuestion.empty()) {
        std::cerr << "ERROR: Empty question text!" << std::endl;
    }
    
    // Debug output
    std::cout << "DEBUG: Session ID: '" << formattedSessionId << "'" << std::endl;
    std::cout << "DEBUG: Question: '" << escapedQuestion << "'" << std::endl;
    std::cout << "DEBUG: Question length: " << escapedQuestion.length() << std::endl;
    
    // Construct JSON payload exactly as specified in the edge function requirements
    std::string requestData = "{\"sessionId\": \"" + formattedSessionId + "\", "
                          + "\"question\": \"" + escapedQuestion + "\", "
                          + "\"streaming\": false}";
                          
    std::cout << "Sending payload to edge function: " << requestData << std::endl;

    // Content type for JSON
    std::string contentType = "application/json";

    std::cout << "Sending question to GPT API: " << question << std::endl;

    // Send HTTP request
    std::string response = SendHttpRequest(
        m_apiHost,
        m_gptAnswerPath,
        "POST",
        requestData,
        contentType,
        anonKey
    );

    // Handle response
    if (response.empty()) {
        std::cerr << "Failed to get response from GPT Answer API" << std::endl;
        return false;
    }

    std::cout << "Received response from GPT Answer API" << std::endl;
    
    // Call the callback if provided
    if (callback) {
        callback(response);
    }

    return true;
}

// Utility function: Send HTTP request with WinHTTP
std::string WhisperAPIClient::SendHttpRequest(
    const std::wstring& host,
    const std::wstring& path,
    const std::string& method,
    const std::string& data,
    const std::string& contentType,
    const std::string& anonKey
) {
    // Make sure we're initialized
    if (!m_hSession) {
        if (!Initialize()) {
            return "";
        }
    }
    
    // Connect to server
    m_hConnect = WinHttpConnect(m_hSession, host.c_str(), m_apiPort, 0);
    if (!m_hConnect) {
        std::cerr << "Failed to connect to server: " << GetLastError() << std::endl;
        return "";
    }
    
    // Create request handle
    DWORD flags = m_isSecure ? WINHTTP_FLAG_SECURE : 0;
    HINTERNET hRequest = WinHttpOpenRequest(
        m_hConnect,
        Utf8ToWide(method).c_str(),
        path.c_str(),
        NULL,
        WINHTTP_NO_REFERER,
        WINHTTP_DEFAULT_ACCEPT_TYPES,
        flags
    );

    if (!hRequest) {
        std::cerr << "Failed to open request: " << GetLastError() << std::endl;
        WinHttpCloseHandle(m_hConnect);
        m_hConnect = NULL;
        return "";
    }
    
    std::string response = "";
    
    // Set up timeouts (30 seconds)
    DWORD timeout = 30000;  // 30 seconds in milliseconds
    WinHttpSetOption(hRequest, WINHTTP_OPTION_CONNECT_TIMEOUT, &timeout, sizeof(timeout));
    WinHttpSetOption(hRequest, WINHTTP_OPTION_SEND_TIMEOUT, &timeout, sizeof(timeout));
    WinHttpSetOption(hRequest, WINHTTP_OPTION_RECEIVE_TIMEOUT, &timeout, sizeof(timeout));
    
    // Add headers
    std::wstringstream headerStream;
    headerStream << L"Content-Type: " << Utf8ToWide(contentType) << L"\r\n";
    
    // Add Authorization header if anon key is provided
    if (!anonKey.empty()) {
        headerStream << L"apikey: " << Utf8ToWide(anonKey) << L"\r\n";
        headerStream << L"Authorization: Bearer " << Utf8ToWide(anonKey) << L"\r\n";
    }
    
    // Debug output for request details
    std::cout << "\n=== HTTP REQUEST DETAILS ===" << std::endl;
    std::cout << "Method: " << method << std::endl;
    std::cout << "Host: " << WideToUtf8(host) << std::endl;
    std::cout << "Path: " << WideToUtf8(path) << std::endl;
    std::cout << "Headers: Content-Type: " << contentType << ", Auth: [REDACTED]" << std::endl;
    std::cout << "Payload length: " << data.length() << " bytes" << std::endl;
    std::cout << "==========================" << std::endl;
    
    std::wstring headers = headerStream.str();
    
    BOOL result = WinHttpAddRequestHeaders(
        hRequest,
        headers.c_str(),
        headers.length(),
        WINHTTP_ADDREQ_FLAG_ADD
    );
    
    if (!result) {
        std::cerr << "Failed to add headers: " << GetLastError() << std::endl;
        WinHttpCloseHandle(hRequest);
        return response;
    }
    
    // Send request
    const char* sendData = data.c_str();
    DWORD dataLength = data.length();
    
    result = WinHttpSendRequest(
        hRequest,
        WINHTTP_NO_ADDITIONAL_HEADERS,
        0,
        (LPVOID)sendData,
        dataLength,
        dataLength,
        0
    );
    
    if (!result) {
        std::cerr << "Failed to send request: " << GetLastError() << std::endl;
        WinHttpCloseHandle(hRequest);
        return response;
    }
    
    // Receive response
    result = WinHttpReceiveResponse(hRequest, NULL);
    if (!result) {
        std::cerr << "Failed to receive response: " << GetLastError() << std::endl;
        WinHttpCloseHandle(hRequest);
        return response;
    }
    
    // Get HTTP status code
    DWORD statusCode = 0;
    DWORD statusCodeSize = sizeof(DWORD);
    WinHttpQueryHeaders(
        hRequest,
        WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
        WINHTTP_HEADER_NAME_BY_INDEX,
        &statusCode,
        &statusCodeSize,
        WINHTTP_NO_HEADER_INDEX
    );
    
    // Read data
    DWORD bytesAvailable = 0;
    DWORD bytesRead = 0;
    char buffer[4096];
    std::stringstream responseStream;
    
    while (WinHttpQueryDataAvailable(hRequest, &bytesAvailable) && bytesAvailable > 0) {
        ZeroMemory(buffer, sizeof(buffer));
        
        if (!WinHttpReadData(hRequest, buffer, min(sizeof(buffer) - 1, bytesAvailable), &bytesRead)) {
            std::cerr << "Failed to read data: " << GetLastError() << std::endl;
            break;
        }
        
        responseStream.write(buffer, bytesRead);
    }
    
    // Convert response to string
    response = responseStream.str();
    
    // Debug response data
    std::cout << "\n=== HTTP RESPONSE DETAILS ===" << std::endl;
    std::cout << "Status code: " << statusCode << std::endl;
    std::cout << "Response body length: " << response.length() << " bytes" << std::endl;
    std::cout << "Response body (first 400 chars): " << std::endl;
    if (response.length() > 0) {
        size_t displayLength = response.length() > 400 ? 400 : response.length();
        std::cout << response.substr(0, displayLength) << std::endl;
        if (response.length() > 400) {
            std::cout << "... (truncated)" << std::endl;
        }
    } else {
        std::cout << "[Empty response]" << std::endl;
    }
    std::cout << "==========================" << std::endl;
    
    // Clean up
    WinHttpCloseHandle(hRequest);
    
    return response;
}

// Utility function: Convert string to wide string
std::wstring WhisperAPIClient::Utf8ToWide(const std::string& str) {
    if (str.empty()) {
        return std::wstring();
    }
    
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), (int)str.size(), NULL, 0);
    std::wstring wstr(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), (int)str.size(), &wstr[0], size_needed);
    return wstr;
}

// Utility function: Convert wide string to string
std::string WhisperAPIClient::WideToUtf8(const std::wstring& wstr) {
    if (wstr.empty()) {
        return std::string();
    }
    
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string str(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.size(), &str[0], size_needed, NULL, NULL);
    return str;
}

// Base64 encoding table
static const std::string base64_chars = 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

// Base64 encode binary data
std::string WhisperAPIClient::Base64Encode(const std::vector<BYTE>& data) {
    if (data.empty()) return "";

    // Get required buffer size
    DWORD bufferSize = 0;
    if (!CryptBinaryToStringA(
        data.data(), 
        data.size(), 
        CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF, 
        NULL, 
        &bufferSize
    )) {
        throw std::runtime_error("Failed to get base64 buffer size");
    }

    // Allocate buffer
    std::vector<char> buffer(bufferSize);

    // Encode to base64
    if (!CryptBinaryToStringA(
        data.data(), 
        data.size(), 
        CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF, 
        buffer.data(), 
        &bufferSize
    )) {
        throw std::runtime_error("Failed to encode to base64");
    }

    // Return as string (buffer is null-terminated)
    return std::string(buffer.data(), bufferSize - 1);
}

// Clean Whisper API response by filtering out segments beyond the audio duration
std::string WhisperAPIClient::CleanWhisperResponse(const std::string& jsonResponse, float audioDurationSec) {
    // If we don't have audio duration or it's zero, return the original response
    if (audioDurationSec <= 0.0f) {
        return jsonResponse;
    }
    
    try {
        // Parse the JSON response
        json responseJson = json::parse(jsonResponse);
        
        // Check if we have a verbose JSON response with segments
        if (!responseJson.contains("segments")) {
            // If it's just a simple response (like {"text":"..."}) return it as is
            return jsonResponse;
        }
        
        // Allow a small epsilon for rounding errors (50ms)
        const float epsilon = 0.05f;  
        
        // Collect valid segments (those that end before or at audio duration + epsilon)
        std::string cleanedText;
        const auto& segments = responseJson["segments"];
        
        std::cout << "\n=== Filtering transcription segments ===" << std::endl;
        std::cout << "Audio duration: " << audioDurationSec << " seconds" << std::endl;
        std::cout << "Found " << segments.size() << " segments in response" << std::endl;
        
        int validSegments = 0;
        for (const auto& segment : segments) {
            if (segment.contains("end") && segment.contains("text")) {
                float segmentEnd = segment["end"];
                std::string segmentText = segment["text"];
                
                if (segmentEnd <= audioDurationSec + epsilon) {
                    cleanedText += segmentText;
                    validSegments++;
                } else {
                    std::cout << "Dropping segment ending at " << segmentEnd 
                              << "s (beyond audio duration)" << std::endl;
                }
            }
        }
        
        std::cout << "Kept " << validSegments << " valid segments out of " 
                  << segments.size() << std::endl;
        
        // Create a new simple JSON response with just the cleaned text
        json cleanedJson = {{
            "text", cleanedText
        }};
        
        return cleanedJson.dump();
        
    } catch (const std::exception& e) {
        std::cerr << "Error cleaning Whisper response: " << e.what() << std::endl;
        std::cerr << "Returning original response" << std::endl;
        return jsonResponse;
    }
}
