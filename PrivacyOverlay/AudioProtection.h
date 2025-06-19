#pragma once

#include <windows.h>
#include <mmdeviceapi.h>
#include <endpointvolume.h>
#include <audiopolicy.h>
#include <string>
#include <comdef.h>

// Mute/unmute the default microphone
inline bool ToggleMicrophoneMute(bool mute) {
    HRESULT hr = S_OK;
    IMMDeviceEnumerator* pEnumerator = NULL;
    IMMDevice* pDevice = NULL;
    IAudioEndpointVolume* pEndpointVolume = NULL;
    bool success = false;

    try {
        // Create device enumerator
        hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), NULL, CLSCTX_ALL,
            __uuidof(IMMDeviceEnumerator), (void**)&pEnumerator);
        if (FAILED(hr)) throw _com_error(hr);

        // Get the default audio capture device (microphone)
        hr = pEnumerator->GetDefaultAudioEndpoint(eCapture, eConsole, &pDevice);
        if (FAILED(hr)) throw _com_error(hr);

        // Activate the endpoint volume interface
        hr = pDevice->Activate(__uuidof(IAudioEndpointVolume), CLSCTX_ALL,
            NULL, (void**)&pEndpointVolume);
        if (FAILED(hr)) throw _com_error(hr);

        // Set mute state
        hr = pEndpointVolume->SetMute(mute, NULL);
        if (FAILED(hr)) throw _com_error(hr);

        success = true;
    }
    catch (_com_error&) {
        // Failed to control microphone
        success = false;
    }

    // Clean up
    if (pEndpointVolume) pEndpointVolume->Release();
    if (pDevice) pDevice->Release();
    if (pEnumerator) pEnumerator->Release();

    return success;
}

// Check if microphone is currently muted
inline bool IsMicrophoneMuted() {
    HRESULT hr = S_OK;
    IMMDeviceEnumerator* pEnumerator = NULL;
    IMMDevice* pDevice = NULL;
    IAudioEndpointVolume* pEndpointVolume = NULL;
    BOOL muted = FALSE;
    bool success = false;

    try {
        // Create device enumerator
        hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), NULL, CLSCTX_ALL,
            __uuidof(IMMDeviceEnumerator), (void**)&pEnumerator);
        if (FAILED(hr)) throw _com_error(hr);

        // Get the default audio capture device
        hr = pEnumerator->GetDefaultAudioEndpoint(eCapture, eConsole, &pDevice);
        if (FAILED(hr)) throw _com_error(hr);

        // Activate the endpoint volume interface
        hr = pDevice->Activate(__uuidof(IAudioEndpointVolume), CLSCTX_ALL,
            NULL, (void**)&pEndpointVolume);
        if (FAILED(hr)) throw _com_error(hr);

        // Get mute state
        hr = pEndpointVolume->GetMute(&muted);
        if (FAILED(hr)) throw _com_error(hr);

        success = true;
    }
    catch (_com_error&) {
        // Failed to query microphone
        success = false;
    }

    // Clean up
    if (pEndpointVolume) pEndpointVolume->Release();
    if (pDevice) pDevice->Release();
    if (pEnumerator) pEnumerator->Release();

    return success ? (muted == TRUE) : false;
}

// Toggle audio protection
inline bool ToggleAudioProtection(bool enable) {
    return ToggleMicrophoneMute(enable);
}
