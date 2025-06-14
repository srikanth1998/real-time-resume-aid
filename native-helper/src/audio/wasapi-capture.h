#ifndef WASAPI_CAPTURE_H
#define WASAPI_CAPTURE_H

#ifdef _WIN32
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <audiopolicy.h>
#include <functiondiscoverykeys_devpkey.h>
#include <thread>
#include <atomic>
#include <functional>

// Forward declaration for Opus encoder
struct OpusEncoder;

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
    std::function<void(unsigned char*, int)> audioDataCallback;
    
    // Audio format constants
    static const int SAMPLE_RATE = 16000;
    static const int CHANNELS = 1;
    static const int FRAME_SIZE = 320; // 20ms at 16kHz
    static const int MAX_PACKET_SIZE = 4000;

    void initializeOpus();
    void cleanup();
    bool findVirtualDevice();
    void captureLoop();

public:
    WASAPICapture();
    ~WASAPICapture();
    
    bool initialize();
    bool startCapture();
    void stopCapture();
    void setAudioCallback(std::function<void(unsigned char*, int)> callback);
};

// C API for Node.js binding
extern "C" {
    WASAPICapture* createCapture();
    bool startCapture(WASAPICapture* capture);
    void stopCapture(WASAPICapture* capture);
    void destroyCapture(WASAPICapture* capture);
    void setAudioCallback(WASAPICapture* capture, void(*callback)(unsigned char*, int));
}

#endif // _WIN32

#endif // WASAPI_CAPTURE_H