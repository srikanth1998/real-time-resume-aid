#include "../include/audio_capture.h"
#include <iostream>
#include <fstream>
#include <cstdio>
#include <chrono>
#include <Functiondiscoverykeys_devpkey.h>

// Explicitly define the required GUIDs for WASAPI
#ifdef __cplusplus
extern "C" {
#endif

// Define the MMDeviceEnumerator class ID
CONST CLSID CLSID_MMDeviceEnumerator = 
    { 0xBCDE0395, 0xE52F, 0x467C, { 0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E } };

// Define the IMMDeviceEnumerator interface ID
CONST IID IID_IMMDeviceEnumerator = 
    { 0xA95664D2, 0x9614, 0x4F35, { 0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6 } };

// Define the IAudioClient interface ID 
CONST IID IID_IAudioClient = 
    { 0x1CB9AD4C, 0xDBFA, 0x4C32, { 0xB1, 0x78, 0xC2, 0xF5, 0x68, 0xA7, 0x03, 0xB2 } };

// Define the IAudioCaptureClient interface ID
CONST IID IID_IAudioCaptureClient = 
    { 0xC8ADBD64, 0xE71E, 0x48a0, { 0xA4, 0xDE, 0x18, 0x5C, 0x39, 0x5C, 0xD3, 0x17 } };
    
#ifdef __cplusplus
}
#endif

// Define required WASAPI constants if not defined
#ifndef AUDCLNT_STREAMFLAGS_LOOPBACK
#define AUDCLNT_STREAMFLAGS_LOOPBACK 0x00010000
#endif

// Constructor
AudioCapture::AudioCapture() 
    : m_pEnumerator(nullptr), m_pDevice(nullptr), m_pAudioClient(nullptr), m_pCaptureClient(nullptr),
      m_pwfx(nullptr), m_bufferFrameCount(0), m_hnsBufferDuration(0), m_stopCapture(false),
      m_stopProcessing(false), m_initialized(false), m_continuousMode(false),
      m_silenceThreshold(0.3f), m_silenceTimeoutSec(1.0f), m_minSpeechDurationSec(0.5f),
      m_maxSpeechDurationSec(15.0f), m_outputFilePath("temp_audio.wav") {
}

AudioCapture::~AudioCapture() {
    Stop();

    // Wait for processing thread to finish
    m_stopProcessing = true;
    if (m_audioProcessingThread.joinable()) {
        m_queueCV.notify_all();
        m_audioProcessingThread.join();
    }

    // Release COM interfaces
    if (m_pAudioClient) {
        m_pAudioClient->Release();
        m_pAudioClient = nullptr;
    }

    if (m_pCaptureClient) {
        m_pCaptureClient->Release();
        m_pCaptureClient = nullptr;
    }

    if (m_pDevice) {
        m_pDevice->Release();
        m_pDevice = nullptr;
    }

    if (m_pEnumerator) {
        m_pEnumerator->Release();
        m_pEnumerator = nullptr;
    }

    if (m_pwfx) {
        CoTaskMemFree(m_pwfx);
        m_pwfx = nullptr;
    }
}

// Initialize WASAPI audio capture for loopback
bool AudioCapture::Initialize() {
    HRESULT hr;

    // Initialize COM if not already initialized
    hr = CoInitialize(NULL);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
        std::cerr << "Failed to initialize COM: " << hr << std::endl;
        return false;
    }

    // Create device enumerator
    hr = CoCreateInstance(
        CLSID_MMDeviceEnumerator, NULL, CLSCTX_ALL,
        IID_IMMDeviceEnumerator, (void**)&m_pEnumerator
    );
    if (FAILED(hr)) {
        std::cerr << "Failed to create device enumerator: " << hr << std::endl;
        return false;
    }

    // Get default audio render device (for loopback)
    hr = m_pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &m_pDevice);
    if (FAILED(hr)) {
        std::cerr << "Failed to get default audio endpoint: " << hr << std::endl;
        return false;
    }

    // Print device info
    IPropertyStore* pProps = nullptr;
    hr = m_pDevice->OpenPropertyStore(STGM_READ, &pProps);
    if (SUCCEEDED(hr)) {
        PROPVARIANT varName;
        PropVariantInit(&varName);
        hr = pProps->GetValue(PKEY_Device_FriendlyName, &varName);
        if (SUCCEEDED(hr)) {
            std::wcout << L"Capturing audio from device: " << varName.pwszVal << std::endl;
            PropVariantClear(&varName);
        }
        pProps->Release();
    }

    // Activate audio client
    hr = m_pDevice->Activate(IID_IAudioClient, CLSCTX_ALL, NULL, (void**)&m_pAudioClient);
    if (FAILED(hr)) {
        std::cerr << "Failed to activate audio client: " << hr << std::endl;
        return false;
    }

    // Get mix format
    hr = m_pAudioClient->GetMixFormat(&m_pwfx);
    if (FAILED(hr)) {
        std::cerr << "Failed to get mix format: " << hr << std::endl;
        return false;
    }

    // Initialize audio client for loopback capture
    m_hnsBufferDuration = 10000000; // 1 second buffer
    hr = m_pAudioClient->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK,
        m_hnsBufferDuration,
        0,
        m_pwfx,
        NULL
    );
    if (FAILED(hr)) {
        std::cerr << "Failed to initialize audio client: " << hr << std::endl;
        return false;
    }

    // Get buffer size
    hr = m_pAudioClient->GetBufferSize(&m_bufferFrameCount);
    if (FAILED(hr)) {
        std::cerr << "Failed to get buffer size: " << hr << std::endl;
        return false;
    }

    // Get capture client
    hr = m_pAudioClient->GetService(IID_IAudioCaptureClient, (void**)&m_pCaptureClient);
    if (FAILED(hr)) {
        std::cerr << "Failed to get capture client: " << hr << std::endl;
        return false;
    }

    std::cout << "Audio capture initialized successfully" << std::endl;
    std::cout << "Format: " << m_pwfx->nChannels << " channels, " 
              << m_pwfx->nSamplesPerSec << " Hz, " 
              << m_pwfx->wBitsPerSample << " bits per sample" << std::endl;
              
    m_initialized = true;
    return true;
}

// Start audio capture
bool AudioCapture::Start() {
    if (!m_initialized) {
        std::cerr << "Audio capture not initialized" << std::endl;
        return false;
    }
    
    // Reset the audio buffer and stop flag
    m_audioBuffer.clear();
    m_stopCapture = false;
    m_continuousMode = false;
    
    // Start the audio client
    HRESULT hr = m_pAudioClient->Start();
    if (FAILED(hr)) {
        std::cerr << "Failed to start audio client" << std::endl;
        return false;
    }
    
    std::cout << "Audio capture started" << std::endl;
    
    // Start the capture thread for fixed-duration capture
    m_captureThread = std::thread(&AudioCapture::CaptureThreadFunction, this);
    std::cout << "Capture thread started - capturing 20 seconds of audio..." << std::endl;
    
    return true;
}

bool AudioCapture::StartContinuous() {
    if (!m_initialized) {
        std::cerr << "Audio capture not initialized" << std::endl;
        return false;
    }
    
    // Clear any existing audio data
    m_audioBuffer.clear();
    
    // Reset stop flags
    m_stopCapture = false;
    m_stopProcessing = false;
    m_continuousMode = true;
    
    // Clear the segment queue
    {
        std::lock_guard<std::mutex> lock(m_queueMutex);
        std::queue<AudioSegment> empty;
        std::swap(m_segmentQueue, empty);
    }
    
    // Start the audio processing thread
    m_audioProcessingThread = std::thread(&AudioCapture::AudioProcessingThreadFunction, this);
    
    // Start the audio client
    HRESULT hr = m_pAudioClient->Start();
    if (FAILED(hr)) {
        std::cerr << "Failed to start audio client" << std::endl;
        m_stopProcessing = true;
        m_queueCV.notify_all();
        if (m_audioProcessingThread.joinable()) {
            m_audioProcessingThread.join();
        }
        return false;
    }
    
    std::cout << "Continuous audio capture started" << std::endl;
    
    // Start the continuous capture thread
    m_captureThread = std::thread(&AudioCapture::ContinuousCaptureThreadFunction, this);
    
    return true;
}

// Stop audio capture
bool AudioCapture::Stop() {
    m_stopCapture = true;

    // Stop audio client
    if (m_pAudioClient && m_initialized) {
        m_pAudioClient->Stop();
    }

    // Join thread if joinable
    if (m_captureThread.joinable()) {
        m_captureThread.join();
    }
    
    // If in continuous mode, also stop the processing thread
    if (m_continuousMode) {
        m_stopProcessing = true;
        m_queueCV.notify_all(); // Wake up the processing thread
        
        if (m_audioProcessingThread.joinable()) {
            m_audioProcessingThread.join();
        }
        
        std::cout << "Audio processing thread stopped" << std::endl;
    }
    
    std::cout << "Audio capture stopped" << std::endl;
    return true;
}

// Set callback for transcription results
void AudioCapture::SetTranscriptionCallback(TranscriptionCallback callback) {
    m_transcriptionCallback = callback;
}

void AudioCapture::SetAudioSegmentCallback(AudioSegmentCallback callback) {
    m_audioSegmentCallback = callback;
}

void AudioCapture::SetOutputFilePath(const std::string& filePath) {
    m_outputFilePath = filePath;
    std::cout << "Audio output file path set to: " << m_outputFilePath << std::endl;
}

void AudioCapture::SetSilenceThreshold(float threshold) {
    // Clamp threshold between 0.0 and 1.0
    m_silenceThreshold = (threshold < 0.0f) ? 0.0f : ((threshold > 1.0f) ? 1.0f : threshold);
}

void AudioCapture::SetSilenceTimeout(float timeoutSec) {
    // Ensure timeout is at least 0.1 seconds
    m_silenceTimeoutSec = (timeoutSec < 0.1f) ? 0.1f : timeoutSec;
}

void AudioCapture::SetMinSpeechDuration(float durationSec) {
    // Ensure minimum speech duration is at least 0.1 seconds
    m_minSpeechDurationSec = (durationSec < 0.1f) ? 0.1f : durationSec;
}

void AudioCapture::SetMaxSpeechDuration(float durationSec) {
    // Ensure maximum speech duration is at least 1.0 seconds
    m_maxSpeechDurationSec = (durationSec < 1.0f) ? 1.0f : durationSec;
}

void AudioCapture::CaptureThreadFunction() {
    if (!m_initialized || !m_pCaptureClient) return;
    
    std::cout << "Capture thread started - capturing 20 seconds of audio..." << std::endl;
    
    HRESULT hr;
    UINT32 packetLength = 0;
    BYTE* pData;
    UINT32 numFramesRead;
    DWORD flags;
    
    UINT32 bytesPerFrame = (m_pwfx->wBitsPerSample / 8) * m_pwfx->nChannels;
    
    auto startTime = std::chrono::steady_clock::now();
    float captureLimit = 20.0f; // 20 seconds
    float capturedSeconds = 0.0f;
    
    while (!m_stopCapture && capturedSeconds < captureLimit) {
        // Sleep to avoid busy wait
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        
        // Get next packet size
        hr = m_pCaptureClient->GetNextPacketSize(&packetLength);
        if (FAILED(hr)) {
            std::cerr << "Failed to get next packet size" << std::endl;
            break;
        }
        
        if (packetLength == 0) {
            continue;
        }
        
        // Get the data
        hr = m_pCaptureClient->GetBuffer(
            &pData,
            &numFramesRead,
            &flags,
            NULL,
            NULL
        );
        
        if (FAILED(hr)) {
            std::cerr << "Failed to get buffer" << std::endl;
            break;
        }
        
        if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
            // Silent data - for silence, we can just add zeros
            size_t offset = m_audioBuffer.size();
            m_audioBuffer.resize(offset + numFramesRead * bytesPerFrame);
            memset(&m_audioBuffer[offset], 0, numFramesRead * bytesPerFrame);
        } else {
            // Copy the data to our buffer
            size_t offset = m_audioBuffer.size();
            m_audioBuffer.resize(offset + numFramesRead * bytesPerFrame);
            memcpy(&m_audioBuffer[offset], pData, numFramesRead * bytesPerFrame);
        }
        
        // Release the buffer
        hr = m_pCaptureClient->ReleaseBuffer(numFramesRead);
        if (FAILED(hr)) {
            std::cerr << "Failed to release buffer" << std::endl;
            break;
        }
        
        // Update captured time
        auto currentTime = std::chrono::steady_clock::now();
        capturedSeconds = std::chrono::duration<float>(currentTime - startTime).count();
    }
    
    std::cout << "Captured " << m_audioBuffer.size() << " bytes of audio data" << std::endl;
    
    // Save the audio data to a WAV file
    SaveWavFile(m_outputFilePath);
}

// Helper method to calculate audio energy in a buffer
float AudioCapture::CalculateAudioEnergy(const std::vector<BYTE>& audioData, UINT32 numFrames, UINT16 bitsPerSample, UINT16 numChannels) {
    if (audioData.empty() || numFrames == 0) return 0.0f;
    
    float totalEnergy = 0.0f;
    UINT32 numSamples = numFrames * numChannels;
    
    if (bitsPerSample == 16) {
        // 16-bit PCM
        const int16_t* samples = reinterpret_cast<const int16_t*>(audioData.data());
        
        for (UINT32 i = 0; i < numSamples && i < audioData.size()/2; i++) {
            float sample = samples[i] / 32768.0f; // Normalize to -1.0 to 1.0
            totalEnergy += sample * sample;
        }
    } else if (bitsPerSample == 32) {
        // Get the current format from the audio client
        WAVEFORMATEX* pwfx = nullptr;
        HRESULT hr = m_pAudioClient->GetMixFormat(&pwfx);
        if (SUCCEEDED(hr) && pwfx) {
            if (pwfx->wFormatTag == WAVE_FORMAT_IEEE_FLOAT || 
                (pwfx->wFormatTag == WAVE_FORMAT_EXTENSIBLE && 
                 reinterpret_cast<WAVEFORMATEXTENSIBLE*>(pwfx)->SubFormat == KSDATAFORMAT_SUBTYPE_IEEE_FLOAT)) {
                // 32-bit float
                const float* samples = reinterpret_cast<const float*>(audioData.data());
                
                for (UINT32 i = 0; i < numSamples && i < audioData.size()/4; i++) {
                    totalEnergy += samples[i] * samples[i]; // Already normalized
                }
            } else {
                // 32-bit PCM
                const int32_t* samples = reinterpret_cast<const int32_t*>(audioData.data());
                
                for (UINT32 i = 0; i < numSamples && i < audioData.size()/4; i++) {
                    float sample = samples[i] / 2147483648.0f; // Normalize to -1.0 to 1.0
                    totalEnergy += sample * sample;
                }
            }
            CoTaskMemFree(pwfx);
        }
    }
    
    // Calculate RMS energy
    float rmsEnergy = 0.0f;
    if (numSamples > 0) {
        rmsEnergy = sqrt(totalEnergy / numSamples);
    }
    
    return rmsEnergy;
}

// Check if audio energy is below the silence threshold
bool AudioCapture::IsSilence(float energy) {
    return energy < m_silenceThreshold;
}

// Convert bytes to seconds based on the audio format
float AudioCapture::BytesToSeconds(size_t bytes) {
    if (!m_pAudioClient) {
        return 0.0f;
    }
    
    WAVEFORMATEX* pwfx = nullptr;
    HRESULT hr = m_pAudioClient->GetMixFormat(&pwfx);
    if (FAILED(hr) || !pwfx) {
        return 0.0f;
    }
    
    float bytesPerSecond = static_cast<float>(pwfx->nAvgBytesPerSec);
    float seconds = bytes / bytesPerSecond;
    
    CoTaskMemFree(pwfx);
    return seconds;
}

// (Implementation moved above)

// (Implementation moved above)

// Thread function for continuous audio capture with silence detection
void AudioCapture::ContinuousCaptureThreadFunction() {
    if (!m_initialized || !m_pCaptureClient) return;
    
    HRESULT hr;
    UINT32 packetLength = 0;
    BYTE* pData;
    UINT32 numFramesRead;
    DWORD flags;
    
    UINT32 bytesPerFrame = (m_pwfx->wBitsPerSample / 8) * m_pwfx->nChannels;
    bool inSpeechSegment = false;
    float silenceTime = 0.0f;
    float speechTime = 0.0f;
    std::vector<BYTE> currentSegment;
    
    // Debug info
    std::cout << "[SETUP] Audio capture configured with:" << std::endl;
    std::cout << "  - Silence threshold: " << m_silenceThreshold << " (adjusted for observed noise floor)" << std::endl;
    std::cout << "  - Silence gap for segmentation: " << m_silenceTimeoutSec << "s" << std::endl;
    std::cout << "  - Min speech duration: " << m_minSpeechDurationSec << "s" << std::endl;
    std::cout << "  - Max speech duration: " << m_maxSpeechDurationSec << "s" << std::endl;
    
    auto lastProcessTime = std::chrono::steady_clock::now();
    
    std::cout << "DEBUG: Silence threshold: " << m_silenceThreshold << std::endl;
    std::cout << "DEBUG: Min silence duration: " << m_silenceTimeoutSec << "s" << std::endl;
    std::cout << "DEBUG: Min speech duration: " << m_minSpeechDurationSec << "s" << std::endl;
    
    while (!m_stopCapture) {
        // Sleep to avoid busy wait
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        
        // Get next packet size
        hr = m_pCaptureClient->GetNextPacketSize(&packetLength);
        if (FAILED(hr)) {
            std::cerr << "Failed to get next packet size" << std::endl;
            break;
        }
        
        if (packetLength == 0) {
            continue;
        }
        
        // Get the data
        hr = m_pCaptureClient->GetBuffer(
            &pData,
            &numFramesRead,
            &flags,
            NULL,
            NULL
        );
        
        if (FAILED(hr)) {
            std::cerr << "Failed to get buffer" << std::endl;
            break;
        }
        
        // Calculate the energy in this packet
        std::vector<BYTE> packetData(pData, pData + (numFramesRead * bytesPerFrame));
        float energy = CalculateAudioEnergy(packetData, numFramesRead, m_pwfx->wBitsPerSample, m_pwfx->nChannels);
        bool isSilent = IsSilence(energy);
        
        // Calculate time delta for this packet
        float packetDurationSec = (float)numFramesRead / (float)m_pwfx->nSamplesPerSec;
        
        // Add the data to the current segment
        size_t offset = currentSegment.size();
        currentSegment.resize(offset + numFramesRead * bytesPerFrame);
        
        if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
            // Silent data - for silence, we can just add zeros
            memset(&currentSegment[offset], 0, numFramesRead * bytesPerFrame);
            isSilent = true;
        } else {
            // Copy the data to our buffer
            memcpy(&currentSegment[offset], pData, numFramesRead * bytesPerFrame);
        }
        
        // Release the buffer
        hr = m_pCaptureClient->ReleaseBuffer(numFramesRead);
        if (FAILED(hr)) {
            std::cerr << "Failed to release buffer" << std::endl;
            break;
        }
        
        // Log audio energy periodically (every second)
        auto now = std::chrono::steady_clock::now();
        if (std::chrono::duration<float>(now - lastProcessTime).count() >= 1.0f) {
            std::cout << "DEBUG: Audio energy: " << energy << ", is silence: " << (isSilent ? "yes" : "no") << std::endl;
            if (inSpeechSegment) {
                std::cout << "DEBUG: Current speech duration: " << speechTime << "s" << std::endl;
            }
            lastProcessTime = now;
        }
        
        // Speech/silence state machine
        if (isSilent) {
            silenceTime += packetDurationSec;
            
            if (inSpeechSegment) {
                // We were in speech, now we have silence
                if (silenceTime >= m_silenceTimeoutSec) {
                    // We've had enough silence to end the segment
                    if (speechTime >= m_minSpeechDurationSec) {
                        // The speech segment is long enough to keep
                        AudioSegment segment(currentSegment, BytesToSeconds(currentSegment.size()));
                        
                        // Add segment to the processing queue
                        {
                            std::lock_guard<std::mutex> lock(m_queueMutex);
                            m_segmentQueue.push(segment);
                        }
                        
                        // Notify processing thread
                        m_queueCV.notify_one();
                    }
                    
                    // Reset for the next segment
                    currentSegment.clear();
                    inSpeechSegment = false;
                    speechTime = 0.0f;
                }
            }
        } else {
            // We have speech
            if (!inSpeechSegment) {
                // Starting a new speech segment
                inSpeechSegment = true;
                silenceTime = 0.0f;
                speechTime = 0.0f;
            } else {
                // Continue existing speech segment
                speechTime += packetDurationSec;
                
                // Check if we've exceeded the maximum speech duration
                if (speechTime >= m_maxSpeechDurationSec) {
                    // Force a segment completion
                    std::cout << "DEBUG: Maximum speech duration reached (" << m_maxSpeechDurationSec << "s). Forcing segment completion." << std::endl;
                    
                    AudioSegment segment(currentSegment, BytesToSeconds(currentSegment.size()));
                    
                    // Add segment to the processing queue
                    {
                        std::lock_guard<std::mutex> lock(m_queueMutex);
                        m_segmentQueue.push(segment);
                    }
                    
                    // Notify processing thread
                    m_queueCV.notify_one();
                    
                    // Reset for the next segment
                    currentSegment.clear();
                    inSpeechSegment = false;
                    speechTime = 0.0f;
                    silenceTime = 0.0f;
                }
            }
            
            // Reset silence time since we have speech
            silenceTime = 0.0f;
        }
    }
    
    // Process any remaining audio if we're in a speech segment
    if (inSpeechSegment && speechTime >= m_minSpeechDurationSec) {
        AudioSegment segment(currentSegment, BytesToSeconds(currentSegment.size()));
        
        // Add segment to the processing queue
        {
            std::lock_guard<std::mutex> lock(m_queueMutex);
            m_segmentQueue.push(segment);
        }
        
        // Notify processing thread
        m_queueCV.notify_one();
    }
}

// Thread function for processing audio segments and sending them to the API
void AudioCapture::AudioProcessingThreadFunction() {
    std::cout << "Audio processing thread started" << std::endl;
    
    int segmentCounter = 0;
    
    while (!m_stopProcessing) {
        AudioSegment segment;
        bool hasSegment = false;
        
        // Wait for a segment or stop signal
        {
            std::unique_lock<std::mutex> lock(m_queueMutex);
            if (m_segmentQueue.empty()) {
                // Wait for up to 1 second for new data or stop signal
                m_queueCV.wait_for(lock, std::chrono::seconds(1), [this]() {
                    return !m_segmentQueue.empty() || m_stopProcessing;
                });
            }
            
            if (m_stopProcessing && m_segmentQueue.empty()) {
                break; // Exit if stopping and no more segments
            }
            
            if (!m_segmentQueue.empty()) {
                segment = m_segmentQueue.front();
                m_segmentQueue.pop();
                hasSegment = true;
            }
        }
        
        if (hasSegment) {
            segmentCounter++;
            std::string segmentFilePath = m_outputFilePath + "_segment_" + std::to_string(segmentCounter) + ".wav";
            std::cout << "Processing audio segment " << segmentCounter << ", duration: " << segment.durationSec << " seconds" << std::endl;
            
            // Save the audio segment to a WAV file
            if (SaveSegmentToWavFile(segment.audioData, segmentFilePath)) {
                // If we have a callback for audio segments, call it
                if (m_audioSegmentCallback) {
                    // Call with the filepath and duration, not the audio data
                    m_audioSegmentCallback(segmentFilePath, segment.durationSec);
                }
                
                // If we have a transcription callback, send audio to the API and call the callback
                if (m_transcriptionCallback) {
                    std::cout << "Sending segment " << segmentCounter << " to transcription API..." << std::endl;
                    m_transcriptionCallback(segmentFilePath);
                }
            } else {
                std::cerr << "Failed to save audio segment to file: " << segmentFilePath << std::endl;
            }
        }
    }
    
    std::cout << "Audio processing thread stopped" << std::endl;
}

// Save an audio segment to a WAV file
bool AudioCapture::SaveSegmentToWavFile(const std::vector<BYTE>& audioData, const std::string& filePath) {
    if (audioData.empty() || !m_pAudioClient) {
        std::cerr << "No audio data or audio client" << std::endl;
        return false;
    }
    
    WAVEFORMATEX* pwfx = nullptr;
    HRESULT hr = m_pAudioClient->GetMixFormat(&pwfx);
    if (FAILED(hr) || !pwfx) {
        std::cerr << "Failed to get audio format" << std::endl;
        return false;
    }
    
    std::ofstream file(filePath, std::ios::binary);
    if (!file.is_open()) {
        std::cerr << "Failed to open file: " << filePath << std::endl;
        CoTaskMemFree(pwfx);
        return false;
    }
    
    // Prepare WAV header
    WAVEFORMATEX outputFormat = *pwfx;
    
    if (pwfx->wFormatTag == WAVE_FORMAT_IEEE_FLOAT ||
        (pwfx->wFormatTag == WAVE_FORMAT_EXTENSIBLE && 
         reinterpret_cast<WAVEFORMATEXTENSIBLE*>(pwfx)->SubFormat == KSDATAFORMAT_SUBTYPE_IEEE_FLOAT)) {
        // Need to convert from IEEE float to PCM
        outputFormat.wFormatTag = WAVE_FORMAT_PCM;
        outputFormat.wBitsPerSample = 16;
        outputFormat.nBlockAlign = outputFormat.nChannels * 2; // 2 bytes per sample
        outputFormat.nAvgBytesPerSec = outputFormat.nSamplesPerSec * outputFormat.nBlockAlign;
    } else if (pwfx->wBitsPerSample == 32) {
        // Need to convert from 32-bit PCM to 16-bit PCM
        outputFormat.wBitsPerSample = 16;
        outputFormat.nBlockAlign = outputFormat.nChannels * 2; // 2 bytes per sample
        outputFormat.nAvgBytesPerSec = outputFormat.nSamplesPerSec * outputFormat.nBlockAlign;
    }
    
    // Write WAV header
    // RIFF header
    file.write("RIFF", 4);
    
    // Calculate total size = file size - 8 bytes for "RIFF" and size itself
    int dataSize = audioData.size();
    if (pwfx->wFormatTag == WAVE_FORMAT_IEEE_FLOAT || 
        (pwfx->wFormatTag == WAVE_FORMAT_EXTENSIBLE && 
         reinterpret_cast<WAVEFORMATEXTENSIBLE*>(pwfx)->SubFormat == KSDATAFORMAT_SUBTYPE_IEEE_FLOAT) ||
        pwfx->wBitsPerSample == 32) {
        // If we're converting from 32-bit to 16-bit, the data size will be halved
        dataSize = dataSize / 2;
    }
    
    DWORD fileSize = 36 + dataSize; // 36 = size of fmt chunk (24) + size of data header (8) + size of RIFF type (4)
    file.write(reinterpret_cast<char*>(&fileSize), 4);
    
    // WAVE header
    file.write("WAVE", 4);
    
    // fmt chunk
    file.write("fmt ", 4);
    DWORD fmtSize = 16; // Standard PCM format size
    file.write(reinterpret_cast<char*>(&fmtSize), 4);
    
    // Write format information
    file.write(reinterpret_cast<char*>(&outputFormat.wFormatTag), 2);
    file.write(reinterpret_cast<char*>(&outputFormat.nChannels), 2);
    file.write(reinterpret_cast<char*>(&outputFormat.nSamplesPerSec), 4);
    file.write(reinterpret_cast<char*>(&outputFormat.nAvgBytesPerSec), 4);
    file.write(reinterpret_cast<char*>(&outputFormat.nBlockAlign), 2);
    file.write(reinterpret_cast<char*>(&outputFormat.wBitsPerSample), 2);
    
    // data chunk
    file.write("data", 4);
    file.write(reinterpret_cast<char*>(&dataSize), 4);
    
    // Convert and write audio data if needed
    if (pwfx->wFormatTag == WAVE_FORMAT_IEEE_FLOAT || 
        (pwfx->wFormatTag == WAVE_FORMAT_EXTENSIBLE && 
         reinterpret_cast<WAVEFORMATEXTENSIBLE*>(pwfx)->SubFormat == KSDATAFORMAT_SUBTYPE_IEEE_FLOAT)) {
        // Convert from float to 16-bit int
        const float* floatData = reinterpret_cast<const float*>(audioData.data());
        UINT32 numSamples = audioData.size() / 4; // 4 bytes per float
        
        for (UINT32 i = 0; i < numSamples; i++) {
            // Clamp to [-1.0, 1.0] and convert to 16-bit int
            float sample = floatData[i];
            if (sample < -1.0f) sample = -1.0f;
            if (sample > 1.0f) sample = 1.0f;
            int16_t pcmSample = static_cast<int16_t>(sample * 32767.0f);
            file.write(reinterpret_cast<char*>(&pcmSample), 2);
        }
    } else if (pwfx->wBitsPerSample == 32) {
        // Convert from 32-bit int to 16-bit int
        const int32_t* intData = reinterpret_cast<const int32_t*>(audioData.data());
        UINT32 numSamples = audioData.size() / 4; // 4 bytes per int32
        
        for (UINT32 i = 0; i < numSamples; i++) {
            int16_t pcmSample = static_cast<int16_t>(intData[i] >> 16); // Shift down by 16 bits
            file.write(reinterpret_cast<char*>(&pcmSample), 2);
        }
    } else {
        // No conversion needed, just write the data
        file.write(reinterpret_cast<const char*>(audioData.data()), audioData.size());
    }
    
    file.close();
    CoTaskMemFree(pwfx);
    return true;
}

// Helper methods moved to implementations above

// Save captured audio to WAV file - converts to 16-bit PCM if needed
bool AudioCapture::SaveWavFile(const std::string& filePath) {
    if (m_audioBuffer.empty() || !m_pAudioClient) {
        std::cerr << "No audio data to save" << std::endl;
        return false;
    }

    return SaveWavFile(filePath, m_audioBuffer);
}

// Save audio data to WAV file
bool AudioCapture::SaveWavFile(const std::string& filePath, const std::vector<BYTE>& audioData) {
    if (audioData.empty() || !m_pAudioClient) {
        std::cerr << "No audio data to save" << std::endl;
        return false;
    }

    std::ofstream outFile(filePath, std::ios::binary);
    if (!outFile) {
        std::cerr << "Failed to open file for writing: " << filePath << std::endl;
        return false;
    }

    // WAV header structure
    struct WAVHeader {
        // RIFF chunk
        char chunkId[4];           // "RIFF"
        uint32_t chunkSize;        // File size - 8
        char format[4];            // "WAVE"
        
        // fmt subchunk
        char subchunk1Id[4];       // "fmt "
        uint32_t subchunk1Size;    // Size of the fmt chunk
        uint16_t audioFormat;      // Audio format (1 = PCM)
        uint16_t numChannels;      // Number of channels
        uint32_t sampleRate;       // Sample rate
        uint32_t byteRate;         // Byte rate
        uint16_t blockAlign;       // Block align
        uint16_t bitsPerSample;    // Bits per sample
        
        // data subchunk
        char subchunk2Id[4];       // "data"
        uint32_t subchunk2Size;    // Size of the data chunk
    };

    // Prepare for format conversion if necessary
    bool needsConversion = (m_pwfx->wFormatTag != WAVE_FORMAT_PCM || m_pwfx->wBitsPerSample != 16);
    std::vector<int16_t> pcmData; // For holding converted PCM data
    uint32_t dataSize;
    
    if (needsConversion) {
        std::cout << "Converting audio from " << m_pwfx->wBitsPerSample << "-bit to 16-bit PCM format" << std::endl;
        
        // Convert float or 32-bit samples to 16-bit PCM
        if (m_pwfx->wFormatTag == WAVE_FORMAT_EXTENSIBLE || m_pwfx->wFormatTag == WAVE_FORMAT_IEEE_FLOAT) {
            // Assuming the original data is 32-bit float
            float* floatData = reinterpret_cast<float*>(m_audioBuffer.data());
            size_t numSamples = m_audioBuffer.size() / sizeof(float);
            
            pcmData.resize(numSamples);
            
            // Convert float to int16_t
            for (size_t i = 0; i < numSamples; i++) {
                // Scale and clamp to int16_t range
                float sample = floatData[i] * 32767.0f;
                if (sample > 32767.0f) sample = 32767.0f;
                if (sample < -32768.0f) sample = -32768.0f;
                pcmData[i] = static_cast<int16_t>(sample);
            }
            
            dataSize = pcmData.size() * sizeof(int16_t);
        }
        else if (m_pwfx->wBitsPerSample == 32) {
            // Convert 32-bit int to 16-bit int
            int32_t* intData = reinterpret_cast<int32_t*>(m_audioBuffer.data());
            size_t numSamples = m_audioBuffer.size() / sizeof(int32_t);
            
            pcmData.resize(numSamples);
            
            // Convert int32_t to int16_t with scaling
            for (size_t i = 0; i < numSamples; i++) {
                pcmData[i] = static_cast<int16_t>(intData[i] >> 16);
            }
            
            dataSize = pcmData.size() * sizeof(int16_t);
        }
        else {
            std::cerr << "Unsupported audio format for conversion" << std::endl;
            return false;
        }
    }
    else {
        // No conversion needed
        dataSize = m_audioBuffer.size();
    }

    // Fill WAV header
    WAVHeader header;
    memcpy(header.chunkId, "RIFF", 4);
    header.chunkSize = 36 + dataSize;
    memcpy(header.format, "WAVE", 4);
    
    memcpy(header.subchunk1Id, "fmt ", 4);
    header.subchunk1Size = 16;
    header.audioFormat = WAVE_FORMAT_PCM; // Always set to PCM
    header.numChannels = m_pwfx->nChannels;
    header.sampleRate = m_pwfx->nSamplesPerSec;
    header.bitsPerSample = needsConversion ? 16 : m_pwfx->wBitsPerSample;
    header.blockAlign = header.numChannels * (header.bitsPerSample / 8);
    header.byteRate = header.sampleRate * header.blockAlign;
    
    memcpy(header.subchunk2Id, "data", 4);
    header.subchunk2Size = dataSize;

    // Write header
    outFile.write(reinterpret_cast<char*>(&header), sizeof(header));
    
    // Write audio data
    if (needsConversion) {
        outFile.write(reinterpret_cast<char*>(pcmData.data()), dataSize);
    } else {
        outFile.write(reinterpret_cast<char*>(m_audioBuffer.data()), m_audioBuffer.size());
    }

    outFile.close();

    std::cout << "Saved " << dataSize << " bytes of audio data to " << filePath << std::endl;
    std::cout << "Audio format: PCM, " << header.numChannels << " channels, " 
              << header.sampleRate << " Hz, " << header.bitsPerSample << "-bit" << std::endl;
    return true;
}
