#pragma once

#include <windows.h>
#include <string>
#include <queue>
#include <mutex>

// Shared global variables
extern bool g_isScreenShareProtected;    // Track if window is protected from screen capture
extern bool g_isAudioProtectionEnabled;  // Track if microphone is muted for protection
extern bool g_isSpeechRecognitionActive; // Track if speech recognition is active
extern bool g_isUsingSystemAudio;        // Indicates if system audio (vs microphone) is being used
extern HANDLE g_speechRecognitionThread; // Handle to speech recognition thread
extern std::wstring g_recognizedText;    // Currently recognized text
extern std::queue<std::wstring> g_recognizedTextQueue; // Queue of recognized texts
extern std::mutex g_recognizedTextMutex; // Mutex for thread safety
extern const size_t MAX_RECOGNIZED_TEXTS; // Maximum number of recognized texts to store
