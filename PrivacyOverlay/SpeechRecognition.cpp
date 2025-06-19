#include "SpeechRecognition.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <thread>
#include <algorithm>

#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <Mferror.h>

#pragma comment(lib, "mfplat.lib")
#pragma comment(lib, "mfreadwrite.lib")
#pragma comment(lib, "mfuuid.lib")

#include "AudioMonitor.h"
#include "WhisperClient.h"
#include "Authentication.h"
#include "Settings.h"

// Define the GUID constant for the IID_IMFAudioMediaType interface.
const GUID IID_IMFAudioMediaType = { 0x73647541, 0xc0af, 0x4a8d, { 0x80, 0x34, 0xa9, 0x84, 0xba, 0x62, 0x72, 0x75 } };

// Settings
extern bool g_useWindowsSTT;
extern bool g_useWhisperAPI;
extern bool g_debugMode;

// External whisper client
extern WhisperClient* g_whisperClient;

// External audio monitor
extern AudioMonitor* g_audioMonitor;

// Recognized text queue
extern std::vector<RecognizedText> g_recognizedTextQueue;

// Mutex for accessing the recognized text queue
extern std::mutex g_recognizedTextQueueMutex;

// Add recognized text to the queue
void AddRecognizedText(const std::string& text) {
    std::lock_guard<std::mutex> lock(g_recognizedTextQueueMutex);
    
    // Get current timestamp
    auto now = std::chrono::system_clock::now();
    auto now_ms = std::chrono::time_point_cast<std::chrono::milliseconds>(now);
    auto epoch = now_ms.time_since_epoch();
    long long timestamp = epoch.count();
    
    // Add to queue
    g_recognizedTextQueue.push_back({ text, timestamp });
    
    // Debug output
    if (g_debugMode) {
        std::cout << "Recognized: " << text << std::endl;
    }
}

// ====================================================================================================================
//  System Audio Capture
// ====================================================================================================================

// Constructor
SystemAudioCapture::SystemAudioCapture() :
    m_shutdownEvent(CreateEvent(nullptr, TRUE, FALSE, nullptr)),
    m_audioClient(nullptr),
    m_renderClient(nullptr),
    m_captureClient(nullptr),
    m_sampleRate(0),
    m_bitsPerSample(0),
    m_channels(0),
    m_bytesPerFrame(0),
    m_captureThread(nullptr),
    m_isCapturing(false)
{
    // Initialize COM
    CoInitialize(nullptr);
    
    // Initialize Media Foundation
    MFStartup(MF_VERSION);
}

// Destructor
SystemAudioCapture::~SystemAudioCapture() {
    StopCapture();
    
    // Clean up
    if (m_shutdownEvent) {
        CloseHandle(m_shutdownEvent);
        m_shutdownEvent = nullptr;
    }
    
    // Release COM and Media Foundation
    MFShutdown();
    CoUninitialize();
}

// Initialize audio capture
bool SystemAudioCapture::Initialize() {
    HRESULT hr = S_OK;
    
    // Get the default audio endpoint
    CComPtr<IMMDeviceEnumerator> deviceEnumerator;
    hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, __uuidof(IMMDeviceEnumerator), (void**)&deviceEnumerator);
    if (FAILED(hr)) {
        std::cerr << "Error creating device enumerator: " << hr << std::endl;
        return false;
    }
    
    CComPtr<IMMDevice> defaultDevice;
    hr = deviceEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &defaultDevice);
    if (FAILED(hr)) {
        std::cerr << "Error getting default audio endpoint: " << hr << std::endl;
        return false;
    }
    
    // Activate the audio client
    hr = defaultDevice->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, (void**)&m_audioClient);
    if (FAILED(hr)) {
        std::cerr << "Error activating audio client: " << hr << std::endl;
        return false;
    }
    
    // Get the wave format
    WAVEFORMATEX* waveFormat;
    hr = m_audioClient->GetMixFormat(&waveFormat);
    if (FAILED(hr)) {
        std::cerr << "Error getting mix format: " << hr << std::endl;
        return false;
    }
    
    // Store wave format details
    m_sampleRate = waveFormat->nSamplesPerSec;
    m_bitsPerSample = waveFormat->wBitsPerSample;
    m_channels = waveFormat->nChannels;
    m_bytesPerFrame = (m_bitsPerSample / 8) * m_channels;
    
    // Print audio details
    std::cout << "Audio details:" << std::endl;
    std::cout << "  Sample rate: " << m_sampleRate << std::endl;
    std::cout << "  Bits per sample: " << m_bitsPerSample << std::endl;
    std::cout << "  Channels: " << m_channels << std::endl;
    std::cout << "  Bytes per frame: " << m_bytesPerFrame << std::endl;
    
    // Initialize capture client
    hr = m_audioClient->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        0,
        100 * 10000,  // 100ms latency
        0,
        waveFormat,
        nullptr
    );
    
    if (FAILED(hr)) {
        std::cerr << "Error initializing capture client: " << hr << std::endl;
        return false;
    }
    
    // Get capture client
    hr = m_audioClient->GetService(__uuidof(IAudioCaptureClient), (void**)&m_captureClient);
    if (FAILED(hr)) {
        std::cerr << "Error getting capture client: " << hr << std::endl;
        return false;
    }
    
    // Free the wave format
    CoTaskMemFree(waveFormat);
    
    return true;
}

// Start audio capture
bool SystemAudioCapture::StartCapture() {
    if (m_isCapturing) {
        std::cout << "Audio capture already started." << std::endl;
        return true;
    }
    
    if (!m_audioClient || !m_captureClient) {
        std::cerr << "Audio capture not initialized." << std::endl;
        return false;
    }
    
    // Reset shutdown event
    ResetEvent(m_shutdownEvent);
    
    // Start the capture thread
    m_isCapturing = true;
    m_captureThread = new std::thread(&SystemAudioCapture::CaptureThread, this);
    
    std::cout << "Audio capture started." << std::endl;
    return true;
}

// Stop audio capture
bool SystemAudioCapture::StopCapture() {
    if (!m_isCapturing) {
        std::cout << "Audio capture already stopped." << std::endl;
        return true;
    }
    
    // Signal the capture thread to stop
    SetEvent(m_shutdownEvent);
    
    // Wait for the capture thread to exit
    if (m_captureThread) {
        m_captureThread->join();
        delete m_captureThread;
        m_captureThread = nullptr;
    }
    
    m_isCapturing = false;
    std::cout << "Audio capture stopped." << std::endl;
    return true;
}

// Capture thread
void SystemAudioCapture::CaptureThread() {
    HRESULT hr = S_OK;
    BYTE* data;
    UINT32 framesAvailable;
    DWORD flags;
    
    // Start streaming
    hr = m_audioClient->Start();
    if (FAILED(hr)) {
        std::cerr << "Error starting audio client: " << hr << std::endl;
        return;
    }
    
    std::cout << "Capture thread started." << std::endl;
    
    while (WaitForSingleObject(m_shutdownEvent, 0) == WAIT_TIMEOUT) {
        // Sleep for a short time
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        
        // Get the number of frames available
        hr = m_captureClient->GetBuffer(&data, &framesAvailable, &flags, nullptr, nullptr);
        if (FAILED(hr)) {
            std::cerr << "Error getting buffer: " << hr << std::endl;
            continue;
        }
        
        // Process the audio data
        if (framesAvailable > 0) {
            // Calculate the size of the audio data
            UINT32 dataSize = framesAvailable * m_bytesPerFrame;
            
            // Create a vector to hold the audio data
            std::vector<float> audioData(framesAvailable * m_channels);
            
            // Convert the audio data to float
            if (m_bitsPerSample == 16) {
                // 16-bit audio
                INT16* pcmData = reinterpret_cast<INT16*>(data);
                for (UINT32 i = 0; i < framesAvailable * m_channels; i++) {
                    audioData[i] = static_cast<float>(pcmData[i]) / 32768.0f;
                }
            } else if (m_bitsPerSample == 32) {
                // 32-bit audio
                float* floatData = reinterpret_cast<float*>(data);
                for (UINT32 i = 0; i < framesAvailable * m_channels; i++) {
                    audioData[i] = floatData[i];
                }
            } else {
                std::cerr << "Unsupported bits per sample: " << m_bitsPerSample << std::endl;
            }
            
            // Send the audio data to the callback
            OnCapturedData(audioData);
        }
        
        // Release the buffer
        hr = m_captureClient->ReleaseBuffer(framesAvailable);
        if (FAILED(hr)) {
            std::cerr << "Error releasing buffer: " << hr << std::endl;
            continue;
        }
    }
    
    // Stop streaming
    hr = m_audioClient->Stop();
    if (FAILED(hr)) {
        std::cerr << "Error stopping audio client: " << hr << std::endl;
        return;
    }
    
    std::cout << "Capture thread stopped." << std::endl;
}

// ====================================================================================================================
//  Dummy Audio Capture
// ====================================================================================================================

DummyAudioCapture::DummyAudioCapture() : m_isRunning(false), m_thread(nullptr) {}

DummyAudioCapture::~DummyAudioCapture() {
    StopCapture();
}

bool DummyAudioCapture::StartCapture() {
    if (m_isRunning) return false;
    m_isRunning = true;
    m_thread = new std::thread(&DummyAudioCapture::GenerateDummyData, this);
    return true;
}

bool DummyAudioCapture::StopCapture() {
    if (!m_isRunning) return false;
    m_isRunning = false;
    if (m_thread && m_thread->joinable()) {
        m_thread->join();
        delete m_thread;
        m_thread = nullptr;
    }
    return true;
}

void DummyAudioCapture::GenerateDummyData() {
    while (m_isRunning) {
        std::vector<float> dummyData(48000, 0.0f); // 1 second of silence at 48kHz
        OnCapturedData(dummyData);
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
}

// External overlay window reference
extern OverlayWindow* g_overlayWindow;

void SystemAudioCapture::OnCapturedData(const std::vector<float>& audioData) {
    // Apply audio threshold from settings
    float audioThreshold = 0.01f;
    
    // Check for silence
    bool isSilent = true;
    for (float sample : audioData) {
        if (std::abs(sample) > audioThreshold) {
            isSilent = false;
            break;
        }
    }
    
    // If silent, skip processing
    if (isSilent) {
        return;
    }
    
    // When using Windows Speech API
    if (g_useWindowsSTT) {
        // TODO: Implement Windows Speech API integration
    }
    
    // When we have transcribed text
    if (g_useWhisperAPI && g_whisperClient) {
        std::string transcribedText = g_whisperClient->ProcessAudioChunk(audioData);
        
        if (!transcribedText.empty()) {
            // Check if it's a question
            if (g_overlayWindow && IsQuestion(transcribedText)) {
                // Add question to overlay
                g_overlayWindow->AddQuestion(transcribedText);
            }
            
            // Also add to the regular text queue for other processing
            AddRecognizedText(transcribedText);
        }
    }
    
    // When using Windows Speech API
    if (g_useWindowsSTT) {
        // TODO: Implement Windows Speech API integration
    }
}

// Helper function to detect questions
bool SystemAudioCapture::IsQuestion(const std::string& text) {
    if (text.empty()) return false;
    
    // Convert to lowercase for checking
    std::string lowerText = text;
    std::transform(lowerText.begin(), lowerText.end(), lowerText.begin(), ::tolower);
    
    // Question indicators
    if (text.back() == '?') return true;
    
    // Common question starters
    std::vector<std::string> questionStarters = {
        "what", "how", "why", "when", "where", "who", "which", "whose",
        "can you", "could you", "would you", "do you", "did you", "have you",
        "tell me", "explain", "describe", "walk me through"
    };
    
    for (const auto& starter : questionStarters) {
        if (lowerText.find(starter) == 0) {
            return true;
        }
    }
    
    return false;
}
