#include "LoopbackCapture.h"
#include <iostream>

// Initialize COM if needed
#define SAFE_RELEASE(punk) if ((punk) != NULL) { (punk)->Release(); (punk) = NULL; }

LoopbackCapture::LoopbackCapture() :
    m_pDevice(NULL),
    m_pAudioClient(NULL),
    m_pCaptureClient(NULL),
    m_hCaptureThread(NULL),
    m_hShutdownEvent(NULL),
    m_client(NULL),
    m_isCapturing(false) {
}

LoopbackCapture::~LoopbackCapture() {
    Stop();
    
    // Clean up resources
    if (m_hShutdownEvent) {
        CloseHandle(m_hShutdownEvent);
        m_hShutdownEvent = NULL;
    }
    
    SAFE_RELEASE(m_pCaptureClient);
    SAFE_RELEASE(m_pAudioClient);
    SAFE_RELEASE(m_pDevice);
}

HRESULT LoopbackCapture::Initialize() {
    HRESULT hr = S_OK;
    
    // Create shutdown event
    m_hShutdownEvent = CreateEvent(NULL, TRUE, FALSE, NULL);
    if (m_hShutdownEvent == NULL) {
        return E_FAIL;
    }
    
    // Get the device enumerator
    IMMDeviceEnumerator* pEnumerator = NULL;
    hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator), 
        NULL, 
        CLSCTX_ALL, 
        __uuidof(IMMDeviceEnumerator),
        (void**)&pEnumerator
    );
    if (FAILED(hr)) {
        return hr;
    }
    
    // Get the default audio render endpoint
    hr = pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &m_pDevice);
    SAFE_RELEASE(pEnumerator);
    if (FAILED(hr)) {
        return hr;
    }
    
    // Activate the audio client
    hr = m_pDevice->Activate(
        __uuidof(IAudioClient),
        CLSCTX_ALL,
        NULL,
        (void**)&m_pAudioClient
    );
    if (FAILED(hr)) {
        return hr;
    }
    
    // Get the mix format
    WAVEFORMATEX* pwfx = NULL;
    hr = m_pAudioClient->GetMixFormat(&pwfx);
    if (FAILED(hr)) {
        CoTaskMemFree(pwfx);
        return hr;
    }
    
    // Initialize the audio client for loopback capture
    hr = m_pAudioClient->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK,
        0,
        0,
        pwfx,
        NULL
    );
    CoTaskMemFree(pwfx);
    if (FAILED(hr)) {
        return hr;
    }
    
    // Get the capture client
    hr = m_pAudioClient->GetService(
        __uuidof(::IAudioCaptureClient),
        (void**)&m_pCaptureClient
    );
    if (FAILED(hr)) {
        return hr;
    }
    
    return S_OK;
}

HRESULT LoopbackCapture::Start() {
    if (m_isCapturing) {
        return S_FALSE; // Already capturing
    }
    
    HRESULT hr = S_OK;
    
    // Start the audio client
    hr = m_pAudioClient->Start();
    if (FAILED(hr)) {
        return hr;
    }
    
    // Reset the event
    ResetEvent(m_hShutdownEvent);
    
    // Create the capture thread
    m_hCaptureThread = CreateThread(
        NULL,
        0,
        CaptureThread,
        this,
        0,
        NULL
    );
    if (m_hCaptureThread == NULL) {
        m_pAudioClient->Stop();
        return E_FAIL;
    }
    
    m_isCapturing = true;
    return S_OK;
}

HRESULT LoopbackCapture::Stop() {
    if (!m_isCapturing) {
        return S_FALSE; // Not capturing
    }
    
    // Signal the thread to stop
    if (m_hShutdownEvent) {
        SetEvent(m_hShutdownEvent);
    }
    
    // Wait for the thread to exit
    if (m_hCaptureThread) {
        WaitForSingleObject(m_hCaptureThread, INFINITE);
        CloseHandle(m_hCaptureThread);
        m_hCaptureThread = NULL;
    }
    
    // Stop the audio client
    if (m_pAudioClient) {
        m_pAudioClient->Stop();
    }
    
    m_isCapturing = false;
    return S_OK;
}

DWORD WINAPI LoopbackCapture::CaptureThread(LPVOID lpParam) {
    LoopbackCapture* pThis = static_cast<LoopbackCapture*>(lpParam);
    HRESULT hr = S_OK;
    BYTE* pData = NULL;
    UINT32 numFramesAvailable = 0;
    DWORD flags = 0;
    UINT32 packetLength = 0;
    
    while (WaitForSingleObject(pThis->m_hShutdownEvent, 0) != WAIT_OBJECT_0) {
        // Sleep 10ms between polling the device
        Sleep(10);
        
        // Get the next packet size
        hr = pThis->m_pCaptureClient->GetNextPacketSize(&packetLength);
        if (FAILED(hr)) {
            break;
        }
        
        while (packetLength > 0) {
            // Get the available data
            hr = pThis->m_pCaptureClient->GetBuffer(
                &pData,
                &numFramesAvailable,
                &flags,
                NULL,
                NULL
            );
            if (FAILED(hr)) {
                break;
            }
            
            if (numFramesAvailable > 0 && pThis->m_client != NULL) {
                // Get the mix format for the callback
                WAVEFORMATEX* pwfx = NULL;
                hr = pThis->m_pAudioClient->GetMixFormat(&pwfx);
                
                if (SUCCEEDED(hr)) {
                    // Send the data to the callback
                    pThis->m_client->OnCapturedData(pData, numFramesAvailable, pwfx);
                    CoTaskMemFree(pwfx);
                }
            }
            
            // Release the buffer
            hr = pThis->m_pCaptureClient->ReleaseBuffer(numFramesAvailable);
            if (FAILED(hr)) {
                break;
            }
            
            // Get the next packet size
            hr = pThis->m_pCaptureClient->GetNextPacketSize(&packetLength);
            if (FAILED(hr)) {
                break;
            }
        }
    }
    
    return 0;
}
