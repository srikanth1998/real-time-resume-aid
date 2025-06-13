
// WASAPI Audio Capture for Windows
// Captures loopback audio from virtual cable (VB-Cable)

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <audiopolicy.h>
#include <functiondiscoverykeys_devpkey.h>
#include <opus/opus.h>
#include <iostream>
#include <memory>
#include <thread>
#include <atomic>

class WASAPICapture {
private:
    IMMDeviceEnumerator* deviceEnumerator = nullptr;
    IMMDevice* device = nullptr;
    IAudioClient* audioClient = nullptr;
    IAudioCaptureClient* captureClient = nullptr;
    WAVEFORMATEX* waveFormat = nullptr;
    OpusEncoder* opusEncoder = nullptr;
    
    std::atomic<bool> isCapturing{false};
    std::thread captureThread;
    
    // Audio format constants
    static const int SAMPLE_RATE = 16000;
    static const int CHANNELS = 1;
    static const int FRAME_SIZE = 320; // 20ms at 16kHz
    static const int MAX_PACKET_SIZE = 4000;

public:
    WASAPICapture() {
        CoInitialize(nullptr);
        initializeOpus();
    }
    
    ~WASAPICapture() {
        cleanup();
        CoUninitialize();
    }
    
    bool initialize() {
        HRESULT hr = CoCreateInstance(
            __uuidof(MMDeviceEnumerator),
            nullptr,
            CLSCTX_ALL,
            __uuidof(IMMDeviceEnumerator),
            (void**)&deviceEnumerator
        );
        
        if (FAILED(hr)) return false;
        
        // Find VB-Cable device or default loopback device
        hr = deviceEnumerator->GetDefaultAudioEndpoint(
            eRender, eConsole, &device
        );
        
        if (FAILED(hr)) return false;
        
        hr = device->Activate(
            __uuidof(IAudioClient),
            CLSCTX_ALL,
            nullptr,
            (void**)&audioClient
        );
        
        if (FAILED(hr)) return false;
        
        // Get the mix format
        hr = audioClient->GetMixFormat(&waveFormat);
        if (FAILED(hr)) return false;
        
        // Initialize audio client for loopback capture
        hr = audioClient->Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK,
            10000000, // 1 second buffer
            0,
            waveFormat,
            nullptr
        );
        
        if (FAILED(hr)) return false;
        
        hr = audioClient->GetService(
            __uuidof(IAudioCaptureClient),
            (void**)&captureClient
        );
        
        return SUCCEEDED(hr);
    }
    
    bool startCapture() {
        if (isCapturing) return false;
        
        if (!initialize()) return false;
        
        HRESULT hr = audioClient->Start();
        if (FAILED(hr)) return false;
        
        isCapturing = true;
        captureThread = std::thread(&WASAPICapture::captureLoop, this);
        
        return true;
    }
    
    void stopCapture() {
        if (!isCapturing) return;
        
        isCapturing = false;
        if (captureThread.joinable()) {
            captureThread.join();
        }
        
        if (audioClient) {
            audioClient->Stop();
        }
        
        cleanup();
    }
    
private:
    void initializeOpus() {
        int error;
        opusEncoder = opus_encoder_create(SAMPLE_RATE, CHANNELS, OPUS_APPLICATION_VOIP, &error);
        if (error != OPUS_OK) {
            std::cerr << "Failed to create Opus encoder: " << error << std::endl;
        }
        
        // Configure for low latency
        opus_encoder_ctl(opusEncoder, OPUS_SET_BITRATE(32000));
        opus_encoder_ctl(opusEncoder, OPUS_SET_COMPLEXITY(0));
        opus_encoder_ctl(opusEncoder, OPUS_SET_SIGNAL(OPUS_SIGNAL_VOICE));
    }
    
    void captureLoop() {
        float* audioBuffer = new float[FRAME_SIZE];
        unsigned char opusBuffer[MAX_PACKET_SIZE];
        
        while (isCapturing) {
            UINT32 numFramesAvailable;
            HRESULT hr = captureClient->GetNextPacketSize(&numFramesAvailable);
            
            if (SUCCEEDED(hr) && numFramesAvailable > 0) {
                BYTE* data;
                UINT32 numFramesToRead;
                DWORD flags;
                
                hr = captureClient->GetBuffer(
                    &data,
                    &numFramesToRead,
                    &flags,
                    nullptr,
                    nullptr
                );
                
                if (SUCCEEDED(hr)) {
                    // Convert to float and downsample if needed
                    processAudioData(data, numFramesToRead, audioBuffer);
                    
                    // Encode with Opus
                    int encodedBytes = opus_encode_float(
                        opusEncoder,
                        audioBuffer,
                        FRAME_SIZE,
                        opusBuffer,
                        MAX_PACKET_SIZE
                    );
                    
                    if (encodedBytes > 0) {
                        // Send to Node.js callback
                        sendAudioData(opusBuffer, encodedBytes);
                    }
                    
                    captureClient->ReleaseBuffer(numFramesToRead);
                }
            }
            
            Sleep(20); // 20ms frames
        }
        
        delete[] audioBuffer;
    }
    
    void processAudioData(BYTE* data, UINT32 numFrames, float* output) {
        // Convert from system format to 16kHz mono float
        // This is a simplified conversion - in practice you'd need proper resampling
        float* input = reinterpret_cast<float*>(data);
        
        for (UINT32 i = 0; i < std::min(numFrames, (UINT32)FRAME_SIZE); i++) {
            if (waveFormat->nChannels == 2) {
                // Convert stereo to mono
                output[i] = (input[i * 2] + input[i * 2 + 1]) * 0.5f;
            } else {
                output[i] = input[i];
            }
        }
    }
    
    void sendAudioData(unsigned char* data, int size) {
        // This would call back to Node.js
        // Implementation depends on N-API or similar binding
    }
    
    void cleanup() {
        if (opusEncoder) {
            opus_encoder_destroy(opusEncoder);
            opusEncoder = nullptr;
        }
        
        if (captureClient) {
            captureClient->Release();
            captureClient = nullptr;
        }
        
        if (audioClient) {
            audioClient->Release();
            audioClient = nullptr;
        }
        
        if (device) {
            device->Release();
            device = nullptr;
        }
        
        if (deviceEnumerator) {
            deviceEnumerator->Release();
            deviceEnumerator = nullptr;
        }
        
        if (waveFormat) {
            CoTaskMemFree(waveFormat);
            waveFormat = nullptr;
        }
    }
};

// Export C interface for Node.js binding
extern "C" {
    WASAPICapture* createCapture() {
        return new WASAPICapture();
    }
    
    bool startCapture(WASAPICapture* capture) {
        return capture->startCapture();
    }
    
    void stopCapture(WASAPICapture* capture) {
        capture->stopCapture();
    }
    
    void destroyCapture(WASAPICapture* capture) {
        delete capture;
    }
}
