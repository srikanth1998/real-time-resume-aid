#include "WhisperClient.h"
#include "Logger.h"
#include <sstream>
#include <codecvt>
#include <locale>
#include <algorithm>

// Base64 encoding table
static const char BASE64_CHARS[] = 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

WhisperClient::WhisperClient() : 
    m_isCapturingPhrase(false),
    m_captureStartTime(0),
    m_lastAudioActivity(0)
{
}

WhisperClient::~WhisperClient()
{
}

bool WhisperClient::Initialize()
{
    // No specific initialization needed right now
    return true;
}

std::wstring WhisperClient::TranscribeAudio(const std::vector<BYTE>& audioData, WAVEFORMATEX* format)
{
    if (audioData.empty()) {
        Logger::LogDebug(L"TranscribeAudio: Empty audio data received");
        return L"";
    }
    
    Logger::LogDebug(L"TranscribeAudio: Processing audio data, size: " + 
                    std::to_wstring(audioData.size()) + L" bytes, " + 
                    L"format: " + std::to_wstring(format->nSamplesPerSec) + 
                    L"Hz, " + std::to_wstring(format->wBitsPerSample) + L"-bit, " + 
                    std::to_wstring(format->nChannels) + L" channels");

    // Convert PCM audio to WAV format
    std::vector<BYTE> wavData = ConvertToWAV(audioData, format);
    
    // Convert WAV data to base64
    std::string base64Audio = Base64Encode(wavData);
    
    // Create JSON payload
    std::string requestBody = "{\"audio\":\"" + base64Audio + "\"}";
    
    // Send HTTP request to Supabase endpoint
    std::string response = SendHttpRequest(requestBody);
    
    Logger::LogDebug(L"Received raw response of " + std::to_wstring(response.length()) + L" bytes");
    
    // Extract transcription from response (simple JSON parsing)
    std::string transcription;
    size_t textPos = response.find("\"text\":");
    if (textPos != std::string::npos) {
        textPos += 7; // Skip over "text":"
        size_t endPos = response.find("\"", textPos);
        if (endPos != std::string::npos) {
            transcription = response.substr(textPos, endPos - textPos);
            Logger::LogInfo(L"Transcription received: " + Utf8ToWide(transcription));
        }
    } else {
        Logger::LogWarning(L"Failed to parse transcription response");
        if (response.length() < 200) { // Only log short responses to avoid flooding
            Logger::LogDebug(L"Response: " + Utf8ToWide(response));
        } else {
            Logger::LogDebug(L"Response too long to log " + std::to_wstring(response.length()) + L" bytes");
        }
    }
    
    // Convert to wide string and return
    return Utf8ToWide(transcription);
}

std::vector<BYTE> WhisperClient::ConvertToWAV(const std::vector<BYTE>& pcmData, WAVEFORMATEX* format)
{
    // WAV header size
    const int WAV_HEADER_SIZE = 44;
    
    // Create vector with enough space for header + data
    std::vector<BYTE> wavData(WAV_HEADER_SIZE + pcmData.size());
    
    // WAV header constants
    const char* RIFF = "RIFF";
    const char* WAVE = "WAVE";
    const char* FMT = "fmt ";
    const char* DATA = "data";
    
    // File size (minus 8 bytes for RIFF and size fields)
    DWORD fileSize = pcmData.size() + 36;
    
    // Construct WAV header
    int pos = 0;
    
    // RIFF header
    memcpy(&wavData[pos], RIFF, 4); pos += 4;
    memcpy(&wavData[pos], &fileSize, 4); pos += 4;
    memcpy(&wavData[pos], WAVE, 4); pos += 4;
    
    // Format chunk
    memcpy(&wavData[pos], FMT, 4); pos += 4;
    DWORD fmtSize = 16;
    memcpy(&wavData[pos], &fmtSize, 4); pos += 4;
    memcpy(&wavData[pos], &format->wFormatTag, 2); pos += 2;
    memcpy(&wavData[pos], &format->nChannels, 2); pos += 2;
    memcpy(&wavData[pos], &format->nSamplesPerSec, 4); pos += 4;
    memcpy(&wavData[pos], &format->nAvgBytesPerSec, 4); pos += 4;
    memcpy(&wavData[pos], &format->nBlockAlign, 2); pos += 2;
    memcpy(&wavData[pos], &format->wBitsPerSample, 2); pos += 2;
    
    // Data chunk
    memcpy(&wavData[pos], DATA, 4); pos += 4;
    DWORD dataSize = pcmData.size();
    memcpy(&wavData[pos], &dataSize, 4); pos += 4;
    
    // Copy audio data
    memcpy(&wavData[pos], pcmData.data(), pcmData.size());
    
    return wavData;
}

std::string WhisperClient::Base64Encode(const std::vector<BYTE>& data)
{
    std::string result;
    result.reserve((data.size() + 2) / 3 * 4); // Reserve space for base64 output
    
    int val = 0, valb = -6;
    for (BYTE c : data) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            result.push_back(BASE64_CHARS[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    
    if (valb > -6) {
        result.push_back(BASE64_CHARS[((val << 8) >> (valb + 8)) & 0x3F]);
    }
    
    // Add padding
    while (result.size() % 4) {
        result.push_back('=');
    }
    
    return result;
}

std::string WhisperClient::SendHttpRequest(const std::string& requestBody)
{
    std::string response;
    Logger::LogInfo(L"SendHttpRequest: Sending request to Whisper API");
    Logger::LogDebug(L"Request size: " + std::to_wstring(requestBody.size()) + L" bytes");
    
    // Initialize WinHTTP
    HINTERNET hSession = WinHttpOpen(
        L"Privacy Overlay Whisper Client/1.0",
        WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
        WINHTTP_NO_PROXY_NAME,
        WINHTTP_NO_PROXY_BYPASS,
        0);
    
    if (!hSession) {
        Logger::LogError(L"SendHttpRequest: Failed to initialize WinHTTP session. Error code: " + 
                        std::to_wstring(GetLastError()));
        return response;
    }
    
    // Connect to server
    HINTERNET hConnect = WinHttpConnect(
        hSession,
        std::wstring(SUPABASE_URL.begin(), SUPABASE_URL.end()).c_str(),
        INTERNET_DEFAULT_HTTPS_PORT,
        0);
    
    if (!hConnect) {
        WinHttpCloseHandle(hSession);
        return response;
    }
    
    // Create request
    HINTERNET hRequest = WinHttpOpenRequest(
        hConnect,
        L"POST",
        std::wstring(ENDPOINT_PATH.begin(), ENDPOINT_PATH.end()).c_str(),
        NULL,
        WINHTTP_NO_REFERER,
        WINHTTP_DEFAULT_ACCEPT_TYPES,
        WINHTTP_FLAG_SECURE);
    
    if (!hRequest) {
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return response;
    }
    
    // Set request headers
    std::wstring headers = L"Content-Type: application/json\r\n";
    headers += L"Authorization: Bearer " + std::wstring(SUPABASE_ANON_KEY.begin(), SUPABASE_ANON_KEY.end()) + L"\r\n";
    headers += L"apikey: " + std::wstring(SUPABASE_ANON_KEY.begin(), SUPABASE_ANON_KEY.end()) + L"\r\n";
    
    BOOL result = WinHttpAddRequestHeaders(
        hRequest,
        headers.c_str(),
        (DWORD)-1,
        WINHTTP_ADDREQ_FLAG_ADD);
    
    if (!result) {
        WinHttpCloseHandle(hRequest);
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return response;
    }
    
    // Send request
    result = WinHttpSendRequest(
        hRequest,
        WINHTTP_NO_ADDITIONAL_HEADERS,
        0,
        (LPVOID)requestBody.c_str(),
        requestBody.size(),
        requestBody.size(),
        0);
    
    if (!result) {
        WinHttpCloseHandle(hRequest);
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return response;
    }
    
    // Receive response
    result = WinHttpReceiveResponse(hRequest, NULL);
    if (!result) {
        Logger::LogError(L"SendHttpRequest: Failed to receive response. Error code: " + 
                        std::to_wstring(GetLastError()));
        WinHttpCloseHandle(hRequest);
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);
        return response;
    }
    
    Logger::LogDebug(L"SendHttpRequest: Successfully received response");
    
    // Read response data
    DWORD bytesAvailable = 0;
    DWORD bytesRead = 0;
    char buffer[4096];
    
    while (WinHttpQueryDataAvailable(hRequest, &bytesAvailable) && bytesAvailable > 0) {
        ZeroMemory(buffer, sizeof(buffer));
        
        if (bytesAvailable > sizeof(buffer)) {
            bytesAvailable = sizeof(buffer);
        }
        
        if (WinHttpReadData(hRequest, buffer, bytesAvailable, &bytesRead)) {
            response.append(buffer, bytesRead);
        }
        else {
            break;
        }
    }
    
    // Clean up
    WinHttpCloseHandle(hRequest);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);
    
    return response;
}

float WhisperClient::CalculateAmplitude(const std::vector<BYTE>& audioData, WAVEFORMATEX* format)
{
    // Only process if we have PCM audio
    if (format->wFormatTag != WAVE_FORMAT_PCM) {
        return 0.0f;
    }
    
    float sum = 0.0f;
    float count = 0.0f;
    
    // Process based on bit depth
    if (format->wBitsPerSample == 16) {
        // 16-bit audio (most common)
        const int16_t* samples = reinterpret_cast<const int16_t*>(audioData.data());
        size_t sampleCount = audioData.size() / sizeof(int16_t);
        
        for (size_t i = 0; i < sampleCount; i++) {
            float sample = abs(samples[i]) / 32768.0f; // Normalize to 0-1
            sum += sample;
            count += 1.0f;
        }
    }
    else if (format->wBitsPerSample == 8) {
        // 8-bit audio
        for (size_t i = 0; i < audioData.size(); i++) {
            float sample = abs((int)audioData[i] - 128) / 128.0f; // Normalize to 0-1
            sum += sample;
            count += 1.0f;
        }
    }
    else if (format->wBitsPerSample == 32) {
        // 32-bit audio (float)
        const float* samples = reinterpret_cast<const float*>(audioData.data());
        size_t sampleCount = audioData.size() / sizeof(float);
        
        for (size_t i = 0; i < sampleCount; i++) {
            float sample = abs(samples[i]); // Already normalized
            sum += sample;
            count += 1.0f;
        }
    }
    
    return (count > 0) ? (sum / count) : 0.0f;
}

std::wstring WhisperClient::Utf8ToWide(const std::string& utf8)
{
    if (utf8.empty()) {
        return std::wstring();
    }
    
    // Calculate required buffer size
    int requiredSize = MultiByteToWideChar(CP_UTF8, 0, utf8.c_str(), -1, NULL, 0);
    if (requiredSize == 0) {
        return std::wstring();
    }
    
    // Allocate buffer and perform conversion
    std::vector<wchar_t> buffer(requiredSize);
    if (MultiByteToWideChar(CP_UTF8, 0, utf8.c_str(), -1, buffer.data(), requiredSize) == 0) {
        return std::wstring();
    }
    
    return std::wstring(buffer.data());
}

std::string WhisperClient::WideToUtf8(const std::wstring& wide)
{
    if (wide.empty()) {
        return std::string();
    }
    
    // Calculate required buffer size
    int requiredSize = WideCharToMultiByte(CP_UTF8, 0, wide.c_str(), -1, NULL, 0, NULL, NULL);
    if (requiredSize == 0) {
        return std::string();
    }
    
    // Allocate buffer and perform conversion
    std::vector<char> buffer(requiredSize);
    if (WideCharToMultiByte(CP_UTF8, 0, wide.c_str(), -1, buffer.data(), requiredSize, NULL, NULL) == 0) {
        return std::string();
    }
    
    return std::string(buffer.data());
}
