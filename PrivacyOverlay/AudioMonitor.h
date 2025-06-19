#pragma once

#include <windows.h>
#include <mmdeviceapi.h>
#include <endpointvolume.h>
#include <audiopolicy.h>
#include <functiondiscoverykeys_devpkey.h>
#include <vector>

#pragma comment(lib, "ole32.lib")

// Audio monitor class to capture audio levels
class AudioMonitor {
public:
    AudioMonitor() : m_pEnumerator(NULL), m_pDevice(NULL), m_pAudioMeter(NULL), m_initialized(false) {}
    
    ~AudioMonitor() {
        Cleanup();
    }
    
    // Initialize audio monitoring
    bool Initialize() {
        // Already initialized
        if (m_initialized) return true;
        
        // Initialize COM if not already done
        HRESULT hr = CoInitialize(NULL);
        bool comInitialized = SUCCEEDED(hr) || hr == S_FALSE;
        
        // Create device enumerator
        hr = CoCreateInstance(
            __uuidof(MMDeviceEnumerator),
            NULL,
            CLSCTX_ALL,
            __uuidof(IMMDeviceEnumerator),
            (void**)&m_pEnumerator
        );
        
        if (FAILED(hr)) {
            if (comInitialized) CoUninitialize();
            return false;
        }
        
        // Get default audio endpoint
        hr = m_pEnumerator->GetDefaultAudioEndpoint(
            eRender, // Audio output (speakers)
            eConsole, // Default device
            &m_pDevice
        );
        
        if (FAILED(hr)) {
            Cleanup();
            return false;
        }
        
        // Get audio meter interface
        hr = m_pDevice->Activate(
            __uuidof(IAudioMeterInformation),
            CLSCTX_ALL,
            NULL,
            (void**)&m_pAudioMeter
        );
        
        if (FAILED(hr)) {
            Cleanup();
            return false;
        }
        
        m_initialized = true;
        return true;
    }
    
    // Get current peak audio level (0.0 to 1.0)
    float GetAudioLevel() {
        if (!m_initialized || !m_pAudioMeter) return 0.0f;
        
        float level = 0.0f;
        HRESULT hr = m_pAudioMeter->GetPeakValue(&level);
        
        return SUCCEEDED(hr) ? level : 0.0f;
    }
    
    // Get a list of available audio devices
    std::vector<std::wstring> GetAudioDevices() {
        std::vector<std::wstring> devices;
        
        if (!m_pEnumerator) return devices;
        
        IMMDeviceCollection* pCollection = NULL;
        HRESULT hr = m_pEnumerator->EnumAudioEndpoints(eAll, DEVICE_STATE_ACTIVE, &pCollection);
        
        if (FAILED(hr)) return devices;
        
        UINT count = 0;
        hr = pCollection->GetCount(&count);
        
        if (SUCCEEDED(hr)) {
            for (UINT i = 0; i < count; i++) {
                IMMDevice* pDevice = NULL;
                hr = pCollection->Item(i, &pDevice);
                
                if (SUCCEEDED(hr)) {
                    IPropertyStore* pProps = NULL;
                    hr = pDevice->OpenPropertyStore(STGM_READ, &pProps);
                    
                    if (SUCCEEDED(hr)) {
                        PROPVARIANT varName;
                        PropVariantInit(&varName);
                        
                        hr = pProps->GetValue(PKEY_Device_FriendlyName, &varName);
                        
                        if (SUCCEEDED(hr) && varName.vt == VT_LPWSTR) {
                            devices.push_back(varName.pwszVal);
                        }
                        
                        PropVariantClear(&varName);
                        pProps->Release();
                    }
                    
                    pDevice->Release();
                }
            }
        }
        
        pCollection->Release();
        return devices;
    }
    
    // Switch to specific audio device by index
    bool SwitchToDevice(UINT deviceIndex) {
        if (!m_pEnumerator) return false;
        
        // Clean up current device
        if (m_pAudioMeter) {
            m_pAudioMeter->Release();
            m_pAudioMeter = NULL;
        }
        
        if (m_pDevice) {
            m_pDevice->Release();
            m_pDevice = NULL;
        }
        
        // Get device collection
        IMMDeviceCollection* pCollection = NULL;
        HRESULT hr = m_pEnumerator->EnumAudioEndpoints(eAll, DEVICE_STATE_ACTIVE, &pCollection);
        
        if (FAILED(hr)) return false;
        
        // Get device count
        UINT count = 0;
        hr = pCollection->GetCount(&count);
        
        if (FAILED(hr) || deviceIndex >= count) {
            pCollection->Release();
            return false;
        }
        
        // Get specified device
        hr = pCollection->Item(deviceIndex, &m_pDevice);
        pCollection->Release();
        
        if (FAILED(hr)) return false;
        
        // Get audio meter interface
        hr = m_pDevice->Activate(
            __uuidof(IAudioMeterInformation),
            CLSCTX_ALL,
            NULL,
            (void**)&m_pAudioMeter
        );
        
        return SUCCEEDED(hr);
    }

private:
    // Clean up resources
    void Cleanup() {
        if (m_pAudioMeter) {
            m_pAudioMeter->Release();
            m_pAudioMeter = NULL;
        }
        
        if (m_pDevice) {
            m_pDevice->Release();
            m_pDevice = NULL;
        }
        
        if (m_pEnumerator) {
            m_pEnumerator->Release();
            m_pEnumerator = NULL;
        }
        
        m_initialized = false;
    }
    
    // Member variables
    IMMDeviceEnumerator* m_pEnumerator;
    IMMDevice* m_pDevice;
    IAudioMeterInformation* m_pAudioMeter;
    bool m_initialized;
};
