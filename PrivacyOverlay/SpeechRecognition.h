#pragma once

#include <windows.h>
#include <sapi.h>
#include <sphelper.h>
#include <string>
#include <vector>
#include "LoopbackCapture.h"
#include "WhisperClient.h"

// Constants
#define WM_SPEECH_RECOGNITION (WM_USER + 1)

// Global variable to toggle between Whisper API and Windows Speech API
extern bool g_useWhisperAPI;

// Function declarations
DWORD WINAPI SpeechRecognitionThreadProc(LPVOID lpParam);
void ProcessRecognitionEvent(ISpRecoContext* context, HWND hwnd);
void AddRecognizedText(const std::wstring& text);
bool ToggleSpeechRecognition(HWND hwnd);

// System audio capture class that implements IAudioCaptureHandler
class SystemAudioCapture : public IAudioCaptureHandler {
public:
    SystemAudioCapture(ISpRecognizer* recognizer);
    ~SystemAudioCapture();
    
    // IAudioCaptureHandler implementation
    virtual void OnCapturedData(BYTE* data, UINT32 frames, WAVEFORMATEX* format) override;
    
private:
    // Windows Speech API members
    ISpRecognizer* m_recognizer;
    ISpStream* m_stream;
    
    // Whisper API members
    WhisperClient m_whisperClient;
    std::vector<BYTE> m_audioBuffer;
    WAVEFORMATEX m_lastFormat;
    
    // Silence detection
    bool m_isCapturingPhrase;
    DWORD m_captureStartTime;
    DWORD m_lastAudioActivity;
    const float m_silenceThreshold = 0.002f;
    const DWORD m_silenceGapMs = 1200;       // 1.2 seconds gap
    const size_t m_minCaptureSize = 16000;   // Minimum 1 second @ 16kHz
    const size_t m_maxCaptureSize = 80000;   // Maximum 5 seconds @ 16kHz
    
    // Helper method to calculate audio amplitude
    float CalculateAmplitude(const BYTE* data, UINT32 frames, WAVEFORMATEX* format);
    
    // Helper method to process captured audio buffer
    void ProcessCapturedBuffer();
};

