#include <windows.h>
#include <sapi.h>
#include <sphelper.h>
#include <string>
#include <queue>
#include <mutex>
#include <vector>
#include <algorithm>
#include "SpeechRecognition.h"
#include "GlobalVariables.h"
#include "LoopbackCapture.h"
#include "WhisperClient.h"

// Define the global variable for speech API selection
bool g_useWhisperAPI = true; // Default to using Whisper API

// Implementation of SystemAudioCapture class
SystemAudioCapture::SystemAudioCapture(ISpRecognizer* recognizer) : 
    m_recognizer(recognizer),
    m_stream(nullptr),
    m_isCapturingPhrase(false),
    m_captureStartTime(0),
    m_lastAudioActivity(0) {
    // Initialize the WhisperClient if we're using the Whisper API
    if (g_useWhisperAPI) {
        m_whisperClient.Initialize();
    }
}

SystemAudioCapture::~SystemAudioCapture() {
    if (m_stream) {
        m_stream->Release();
        m_stream = nullptr;
    }
    
    if (g_useWhisperAPI) {
        // Process any remaining audio in the buffer
        if (!m_audioBuffer.empty()) {
            ProcessCapturedBuffer();
        }
    }
}

void SystemAudioCapture::OnCapturedData(BYTE* data, UINT32 frames, WAVEFORMATEX* format) {
    if (!data || !format) return;
    
    if (g_useWhisperAPI) {
        // Calculate amplitude for silence detection
        float amplitude = CalculateAmplitude(data, frames, format);
        DWORD currentTime = GetTickCount();
        
        // Store format info for later use
        memcpy(&m_lastFormat, format, sizeof(WAVEFORMATEX));
        
        // Detect speech based on amplitude
        if (amplitude > m_silenceThreshold) {
            // Activity detected
            m_lastAudioActivity = currentTime;
            
            if (!m_isCapturingPhrase) {
                // Start new phrase capture
                m_isCapturingPhrase = true;
                m_captureStartTime = currentTime;
                m_audioBuffer.clear();
            }
            
            // Add audio data to buffer
            size_t currentSize = m_audioBuffer.size();
            m_audioBuffer.resize(currentSize + (frames * format->nBlockAlign));
            memcpy(&m_audioBuffer[currentSize], data, frames * format->nBlockAlign);
            
            // If buffer gets too large, process it
            if (m_audioBuffer.size() > m_maxCaptureSize) {
                ProcessCapturedBuffer();
            }
        } else if (m_isCapturingPhrase) {
            // No speech detected but we're in a phrase
            
            // Add audio data to buffer (include some silence)
            size_t currentSize = m_audioBuffer.size();
            m_audioBuffer.resize(currentSize + (frames * format->nBlockAlign));
            memcpy(&m_audioBuffer[currentSize], data, frames * format->nBlockAlign);
            
            // If silence duration exceeds threshold, end the phrase
            if ((currentTime - m_lastAudioActivity) > m_silenceGapMs && 
                (m_audioBuffer.size() > m_minCaptureSize)) {
                ProcessCapturedBuffer();
            }
        }
    } else {
        // Original Windows Speech API implementation
        // Create a stream if we don't have one yet
        if (!m_stream) {
            HRESULT hr = CoCreateInstance(
                CLSID_SpStream,
                NULL,
                CLSCTX_ALL,
                IID_ISpStream,
                (void**)&m_stream
            );
            
            if (FAILED(hr)) {
                return;
            }
        }
        
        // Create memory stream and set the waveform format
        IStream* pMemStream = nullptr;
        HRESULT hr = CreateStreamOnHGlobal(NULL, TRUE, &pMemStream);
        
        if (SUCCEEDED(hr)) {
            // Initialize the SP stream
            hr = m_stream->SetBaseStream(pMemStream, SPDFID_WaveFormatEx, format);
            
            if (SUCCEEDED(hr)) {
                // Write the audio data to the stream
                ULONG bytesWritten = 0;
                hr = m_stream->Write(data, frames * format->nBlockAlign, &bytesWritten);
                
                if (SUCCEEDED(hr)) {
                    // Set the position to the beginning
                    LARGE_INTEGER pos = {0};
                    m_stream->Seek(pos, STREAM_SEEK_SET, NULL);
                    
                    // Set the input for the recognizer
                    m_recognizer->SetInput(m_stream, TRUE);
                }
            }
            
            pMemStream->Release();
        }
    }
}

// Helper method to calculate audio amplitude
float SystemAudioCapture::CalculateAmplitude(const BYTE* data, UINT32 frames, WAVEFORMATEX* format) {
    if (!data || frames == 0) return 0.0f;
    
    float sum = 0.0f;
    float count = 0.0f;
    
    // Process based on bit depth
    if (format->wBitsPerSample == 16) {
        // 16-bit audio (most common)
        const int16_t* samples = reinterpret_cast<const int16_t*>(data);
        
        for (UINT32 i = 0; i < frames * format->nChannels; i++) {
            float sample = abs(samples[i]) / 32768.0f; // Normalize to 0-1
            sum += sample;
            count += 1.0f;
        }
    }
    else if (format->wBitsPerSample == 8) {
        // 8-bit audio
        for (UINT32 i = 0; i < frames * format->nChannels; i++) {
            float sample = abs((int)data[i] - 128) / 128.0f; // Normalize to 0-1
            sum += sample;
            count += 1.0f;
        }
    }
    else if (format->wBitsPerSample == 32) {
        // 32-bit audio (float)
        const float* samples = reinterpret_cast<const float*>(data);
        
        for (UINT32 i = 0; i < frames * format->nChannels; i++) {
            float sample = abs(samples[i]); // Already normalized
            sum += sample;
            count += 1.0f;
        }
    }
    
    return (count > 0) ? (sum / count) : 0.0f;
}

// Helper method to process captured audio buffer
void SystemAudioCapture::ProcessCapturedBuffer() {
    if (m_audioBuffer.empty()) return;
    
    // Reset capture state
    m_isCapturingPhrase = false;
    
    // Clone the buffer for processing
    std::vector<BYTE> bufferToProcess = m_audioBuffer;
    m_audioBuffer.clear();
    
    // Transcribe using WhisperClient
    std::wstring transcription = m_whisperClient.TranscribeAudio(bufferToProcess, &m_lastFormat);
    
    if (!transcription.empty()) {
        // Add recognized text
        AddRecognizedText(transcription);
    }
}

// Speech recognition thread function implementation
DWORD WINAPI SpeechRecognitionThreadProc(LPVOID lpParam) {
    HWND hwnd = (HWND)lpParam;
    
    // Initialize COM for this thread
    HRESULT hr = CoInitialize(NULL);
    if (FAILED(hr)) {
        MessageBoxW(hwnd, L"Failed to initialize COM", L"Error", MB_OK | MB_ICONERROR);
        return 1;
    }
    
    // Create recognizer
    ISpRecognizer* recognizer = nullptr;
    hr = CoCreateInstance(CLSID_SpInprocRecognizer, NULL, CLSCTX_ALL, 
                         IID_ISpRecognizer, (void**)&recognizer);
    if (FAILED(hr)) {
        MessageBoxW(hwnd, L"Failed to create speech recognizer", L"Error", MB_OK | MB_ICONERROR);
        CoUninitialize();
        return 1;
    }
    
    // Create system audio capture handler and start capturing
    SystemAudioCapture* systemAudioCapture = new SystemAudioCapture(recognizer);
    LoopbackCapture loopbackCapture;
    // Register our handler (which implements IAudioCaptureHandler)
    loopbackCapture.RegisterCallback(systemAudioCapture);
    hr = loopbackCapture.Initialize();
    if (FAILED(hr)) {
        MessageBoxW(hwnd, L"Failed to initialize system audio capture. Falling back to microphone.", 
                   L"Warning", MB_OK | MB_ICONWARNING);
                   
        // Set flag to indicate we're using microphone instead of system audio
        g_isUsingSystemAudio = false;
        
        // Fallback to microphone
        ISpObjectToken* audioToken = nullptr;
        hr = SpGetDefaultTokenFromCategoryId(SPCAT_AUDIOIN, &audioToken);
        if (FAILED(hr)) {
            MessageBoxW(hwnd, L"Failed to get audio device", L"Error", MB_OK | MB_ICONERROR);
            recognizer->Release();
            CoUninitialize();
            return 1;
        }
        
        // Set the audio input
        hr = recognizer->SetInput(audioToken, TRUE);
        audioToken->Release();
        if (FAILED(hr)) {
            MessageBoxW(hwnd, L"Failed to set audio input", L"Error", MB_OK | MB_ICONERROR);
            recognizer->Release();
            CoUninitialize();
            return 1;
        }
    }
    else {
        // Register the callback
        loopbackCapture.RegisterCallback(systemAudioCapture);
        
        // Start capturing
        hr = loopbackCapture.Start();
        if (FAILED(hr)) {
            MessageBoxW(hwnd, L"Failed to start system audio capture. Falling back to microphone.", 
                      L"Warning", MB_OK | MB_ICONWARNING);
                      
            // Set flag to indicate we're using microphone instead of system audio
            g_isUsingSystemAudio = false;
            
            // Fallback to microphone
            ISpObjectToken* audioToken = nullptr;
            hr = SpGetDefaultTokenFromCategoryId(SPCAT_AUDIOIN, &audioToken);
            if (FAILED(hr)) {
                MessageBoxW(hwnd, L"Failed to get audio device", L"Error", MB_OK | MB_ICONERROR);
                recognizer->Release();
                CoUninitialize();
                return 1;
            }
            
            // Set the audio input
            hr = recognizer->SetInput(audioToken, TRUE);
            audioToken->Release();
            if (FAILED(hr)) {
                MessageBoxW(hwnd, L"Failed to set audio input", L"Error", MB_OK | MB_ICONERROR);
                recognizer->Release();
                CoUninitialize();
                return 1;
            }
        }
    }
    
    // Create context
    ISpRecoContext* context = nullptr;
    hr = recognizer->CreateRecoContext(&context);
    if (FAILED(hr)) {
        recognizer->Release();
        CoUninitialize();
        return 1;
    }
    
    // Set notification message
    hr = context->SetNotifyWindowMessage(hwnd, WM_SPEECH_RECOGNITION, 0, 0);
    
    // Set interest
    hr = context->SetInterest(SPFEI(SPEI_RECOGNITION), SPFEI(SPEI_RECOGNITION));
    
    // Create grammar
    ISpRecoGrammar* grammar = nullptr;
    hr = context->CreateGrammar(1, &grammar);
    if (SUCCEEDED(hr)) {
        // Load dictation grammar
        hr = grammar->LoadDictation(NULL, SPLO_STATIC);
        if (SUCCEEDED(hr)) {
            // Activate the grammar
            hr = grammar->SetDictationState(SPRS_ACTIVE);
        }
    }
    
    // Main message loop for recognizer
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    // Stop the loopback capture if it was started
    loopbackCapture.Stop();
    
    // Cleanup
    if (context) context->Release();
    if (grammar) grammar->Release();
    if (recognizer) recognizer->Release();
    CoUninitialize();
    
    return 0;
}

// Process speech recognition event
void ProcessRecognitionEvent(ISpRecoContext* context, HWND hwnd) {
    if (!g_isSpeechRecognitionActive) return;
    
    if (context == nullptr) return;

    // Get recognition events
    SPEVENT event;
    ULONG fetched = 0;
    HRESULT hr = context->GetEvents(1, &event, &fetched);
    
    if (SUCCEEDED(hr) && fetched > 0) {
        // If this is a recognition event
        if (event.eEventId == SPEI_RECOGNITION) {
            ISpRecoResult* result = reinterpret_cast<ISpRecoResult*>(event.lParam);
            if (result) {
                // Get the text
                WCHAR* text = nullptr;
                hr = result->GetText(SP_GETWHOLEPHRASE, SP_GETWHOLEPHRASE, TRUE, &text, NULL);
                if (SUCCEEDED(hr) && text) {
                    // Add to queue
                    std::wstring recognizedText(text);
                    
                    // Add to queue with proper lock
                    std::lock_guard<std::mutex> lock(g_recognizedTextMutex);
                    g_recognizedTextQueue.push(recognizedText);
                    
                    // Remove oldest entries if queue is too large
                    while (g_recognizedTextQueue.size() > MAX_RECOGNIZED_TEXTS) {
                        g_recognizedTextQueue.pop();
                    }
                    
                    // Update UI
                    InvalidateRect(hwnd, NULL, TRUE);
                    
                    // Free memory
                    CoTaskMemFree(text);
                }
                result->Release();
            }
        }
    }
    if (context) context->Release();
}

// Bridge function for window procedure to call ProcessRecognitionEvent
void ProcessSpeechRecognitionEvent(HWND hwnd) {
    if (!g_isSpeechRecognitionActive) return;

    if (g_useWhisperAPI) {
        // For Whisper API, we don't need the context since our WhisperClient handles everything
        // Just update the UI since new text might have been added
        InvalidateRect(hwnd, NULL, TRUE);
    } else {
        // For Windows Speech API, we need to get the context
        ISpRecoContext* context = nullptr;
        HRESULT hr = CoCreateInstance(CLSID_SpSharedRecoContext, NULL, CLSCTX_ALL, 
                                     IID_ISpRecoContext, (void**)&context);
        if (SUCCEEDED(hr)) {
            ProcessRecognitionEvent(context, hwnd);
            context->Release();
        }
    }
}

// Add recognized text to the queue
void AddRecognizedText(const std::wstring& text) {
    std::lock_guard<std::mutex> lock(g_recognizedTextMutex);
    
    // Add new text to queue
    g_recognizedTextQueue.push(text);
    
    // Remove oldest entries if queue is too large
    while (g_recognizedTextQueue.size() > MAX_RECOGNIZED_TEXTS) {
        g_recognizedTextQueue.pop();
    }
}

// Toggle speech recognition on/off
bool ToggleSpeechRecognition(HWND hwnd) {
    bool result = false;
    
    if (g_isSpeechRecognitionActive) {
        // Stop speech recognition
        if (g_speechRecognitionThread) {
            g_isSpeechRecognitionActive = false;
            WaitForSingleObject(g_speechRecognitionThread, INFINITE);
            CloseHandle(g_speechRecognitionThread);
            g_speechRecognitionThread = NULL;
            result = true;
        }
    } else {
        // Start speech recognition
        g_isSpeechRecognitionActive = true;
        g_speechRecognitionThread = CreateThread(
            NULL,
            0,
            SpeechRecognitionThreadProc,
            hwnd,
            0,
            NULL
        );
        result = (g_speechRecognitionThread != NULL);
    }
    
    // Update UI to show speech recognition status
    InvalidateRect(hwnd, NULL, TRUE);
    
    return result;
}
