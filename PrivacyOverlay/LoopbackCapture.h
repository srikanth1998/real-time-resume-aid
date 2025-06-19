#pragma once

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <functiondiscoverykeys_devpkey.h>
#include <objbase.h>
#include <vector>
#include <string>
#include <mutex>
#include <condition_variable>

// Forward declaration
class LoopbackCapture;

// Callback interface for audio data - renamed to avoid conflict with Windows API
class IAudioCaptureHandler {
public:
    virtual void OnCapturedData(BYTE* data, UINT32 frames, WAVEFORMATEX* format) = 0;
    virtual ~IAudioCaptureHandler() {}
};

// Loopback capture class to record system audio
class LoopbackCapture {
public:
    LoopbackCapture();
    ~LoopbackCapture();

    // Initialize the capture device
    HRESULT Initialize();

    // Start capturing
    HRESULT Start();

    // Stop capturing
    HRESULT Stop();

    // Register callback to receive captured data
    void RegisterCallback(IAudioCaptureHandler* client) { m_client = client; }

private:
    // Thread function for audio capturing
    static DWORD WINAPI CaptureThread(LPVOID lpParam);

    // Member variables
    IMMDevice* m_pDevice;
    IAudioClient* m_pAudioClient;
    ::IAudioCaptureClient* m_pCaptureClient;
    HANDLE m_hCaptureThread;
    HANDLE m_hShutdownEvent;
    IAudioCaptureHandler* m_client;
    bool m_isCapturing;
};
