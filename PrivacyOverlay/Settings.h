#pragma once

#include <windows.h>
#include <string>
#include <fstream>
#include <shlobj.h>

// Structure to hold overlay settings
struct OverlaySettings {
    int x;
    int y;
    int width;
    int height;
    COLORREF color;
    int opacity;  // 0-255
    bool isProtectionEnabled;
    bool isAudioMonitoringEnabled;
    std::wstring captureDir;
    
    OverlaySettings() :
        x(100),
        y(100),
        width(400),
        height(300),
        color(RGB(0, 0, 255)),  // Blue
        opacity(192),           // 75% opacity
        isProtectionEnabled(true),
        isAudioMonitoringEnabled(false),
        captureDir(L"") {}
};

// Settings manager class
class SettingsManager {
public:
    SettingsManager() {
        // Set default capture directory to user's Pictures folder
        WCHAR path[MAX_PATH];
        if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_MYPICTURES, NULL, 0, path))) {
            m_settings.captureDir = path;
        }
    }
    
    // Load settings from file
    bool LoadSettings(const std::wstring& filePath = L"PrivacyOverlay.cfg") {
        std::ifstream file(filePath);
        if (!file.is_open()) return false;
        
        std::string line;
        while (std::getline(file, line)) {
            size_t pos = line.find('=');
            if (pos == std::string::npos) continue;
            
            std::string key = line.substr(0, pos);
            std::string value = line.substr(pos + 1);
            
            if (key == "x") m_settings.x = std::stoi(value);
            else if (key == "y") m_settings.y = std::stoi(value);
            else if (key == "width") m_settings.width = std::stoi(value);
            else if (key == "height") m_settings.height = std::stoi(value);
            else if (key == "color") m_settings.color = std::stoul(value);
            else if (key == "opacity") m_settings.opacity = std::stoi(value);
            else if (key == "protection") m_settings.isProtectionEnabled = (value == "1");
            else if (key == "audio") m_settings.isAudioMonitoringEnabled = (value == "1");
            else if (key == "captureDir") {
                // Convert from UTF-8 to wide string
                int size_needed = MultiByteToWideChar(CP_UTF8, 0, value.c_str(), -1, NULL, 0);
                if (size_needed > 0) {
                    wchar_t* wstr = new wchar_t[size_needed];
                    MultiByteToWideChar(CP_UTF8, 0, value.c_str(), -1, wstr, size_needed);
                    m_settings.captureDir = wstr;
                    delete[] wstr;
                }
            }
        }
        
        return true;
    }
    
    // Save settings to file
    bool SaveSettings(const std::wstring& filePath = L"PrivacyOverlay.cfg") {
        std::ofstream file(filePath);
        if (!file.is_open()) return false;
        
        file << "x=" << m_settings.x << std::endl;
        file << "y=" << m_settings.y << std::endl;
        file << "width=" << m_settings.width << std::endl;
        file << "height=" << m_settings.height << std::endl;
        file << "color=" << m_settings.color << std::endl;
        file << "opacity=" << m_settings.opacity << std::endl;
        file << "protection=" << (m_settings.isProtectionEnabled ? "1" : "0") << std::endl;
        file << "audio=" << (m_settings.isAudioMonitoringEnabled ? "1" : "0") << std::endl;
        
        // Convert from wide string to UTF-8
        int size_needed = WideCharToMultiByte(CP_UTF8, 0, m_settings.captureDir.c_str(), -1, NULL, 0, NULL, NULL);
        if (size_needed > 0) {
            char* str = new char[size_needed];
            WideCharToMultiByte(CP_UTF8, 0, m_settings.captureDir.c_str(), -1, str, size_needed, NULL, NULL);
            file << "captureDir=" << str << std::endl;
            delete[] str;
        }
        
        return true;
    }
    
    // Get settings
    OverlaySettings& GetSettings() {
        return m_settings;
    }
    
    // Set settings
    void SetSettings(const OverlaySettings& settings) {
        m_settings = settings;
    }

private:
    OverlaySettings m_settings;
};
