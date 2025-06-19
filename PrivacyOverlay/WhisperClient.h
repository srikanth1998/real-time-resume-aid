#pragma once

#include <string>
#include <vector>
#include <windows.h>
#include <winhttp.h>
#include <mutex>
#include <queue>

#pragma comment(lib, "winhttp.lib")

class WhisperClient {
public:
    WhisperClient();
    ~WhisperClient();

    // Initialize the client
    bool Initialize();

    // Transcribe audio data
    std::wstring TranscribeAudio(const std::vector<BYTE>& audioData, WAVEFORMATEX* format);

    // Convert PCM audio data to WAV format
    std::vector<BYTE> ConvertToWAV(const std::vector<BYTE>& pcmData, WAVEFORMATEX* format);
    
    // Convert binary data to base64
    std::string Base64Encode(const std::vector<BYTE>& data);

private:
    // HTTP request handling
    std::string SendHttpRequest(const std::string& requestBody);
    
    // Constants
    const std::string SUPABASE_URL = "jafylkqbmvdptrqwwyed.supabase.co";
    const std::string ENDPOINT_PATH = "/functions/v1/speech-to-text";
    const std::string SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY";
    
    // Helper for UTF-8/Unicode conversion
    std::wstring Utf8ToWide(const std::string& utf8);
    std::string WideToUtf8(const std::wstring& wide);
    
    // Buffer management
    std::vector<BYTE> m_audioBuffer;
    std::mutex m_bufferMutex;
    
    // Silence detection
    bool m_isCapturingPhrase;
    DWORD m_captureStartTime;
    DWORD m_lastAudioActivity;
    const float m_silenceThreshold = 0.002f;  // Same as Chrome extension
    const DWORD m_silenceGapMs = 1200;        // 1.2 seconds gap (same as extension)
    const size_t m_minCaptureSize = 16000;    // Minimum 1 second @ 16kHz
    const size_t m_maxCaptureSize = 80000;    // Maximum 5 seconds @ 16kHz
    
    float CalculateAmplitude(const std::vector<BYTE>& audioData, WAVEFORMATEX* format);
};
