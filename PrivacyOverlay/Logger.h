#pragma once

#include <string>
#include <fstream>
#include <mutex>
#include <queue>

// Log levels
enum class LogLevel {
    Debug,  // Detailed debug info
    Info,   // General information
    Warning, // Warning messages
    Error,   // Error messages
    None     // No logging
};

class Logger {
public:
    // Initialize the logger - should be called once at startup
    static void Initialize(const std::wstring& logFilePath = L"PrivacyOverlay.log", LogLevel minLevel = LogLevel::Info);
    
    // Shutdown the logger - should be called once at shutdown
    static void Shutdown();

    // Log a message
    static void Log(LogLevel level, const std::wstring& message);
    static void LogDebug(const std::wstring& message);
    static void LogInfo(const std::wstring& message);
    static void LogWarning(const std::wstring& message);
    static void LogError(const std::wstring& message);
    
    // Set minimum log level
    static void SetLogLevel(LogLevel level);
    
    // Get recent log messages for UI display (up to maxMessages)
    static std::vector<std::wstring> GetRecentLogs(size_t maxMessages = 10);
    
    // Check if logger is showing debug logs
    static bool IsDebugEnabled();

private:
    static std::wofstream s_logFile;
    static LogLevel s_logLevel;
    static std::mutex s_logMutex;
    static std::queue<std::wstring> s_recentLogs;
    static const size_t MAX_RECENT_LOGS = 100; // Circular buffer size for recent logs
    
    // Convert log level to string
    static std::wstring LogLevelToString(LogLevel level);
};
