#include "Logger.h"
#include <chrono>
#include <iomanip>
#include <ctime>
#include <sstream>

// Static member initialization
std::wofstream Logger::s_logFile;
LogLevel Logger::s_logLevel = LogLevel::Info;
std::mutex Logger::s_logMutex;
std::queue<std::wstring> Logger::s_recentLogs;

void Logger::Initialize(const std::wstring& logFilePath, LogLevel minLevel) {
    std::lock_guard<std::mutex> lock(s_logMutex);
    s_logLevel = minLevel;
    
    // Open log file in append mode
    s_logFile.open(logFilePath, std::ios::out | std::ios::app);
    
    if (!s_logFile.is_open()) {
        // Failed to open log file
        return;
    }
    
    // Write header to log file
    auto now = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    std::tm localTime;
    localtime_s(&localTime, &time);
    
    s_logFile << L"====================================" << std::endl;
    s_logFile << L"Log started at: ";
    s_logFile << std::put_time(&localTime, L"%Y-%m-%d %H:%M:%S") << std::endl;
    s_logFile << L"====================================" << std::endl;
    s_logFile.flush();
    
    // Log initialization
    LogInfo(L"Logger initialized");
}

void Logger::Shutdown() {
    std::lock_guard<std::mutex> lock(s_logMutex);
    
    if (s_logFile.is_open()) {
        // Write footer to log file
        auto now = std::chrono::system_clock::now();
        auto time = std::chrono::system_clock::to_time_t(now);
        std::tm localTime;
        localtime_s(&localTime, &time);
        
        s_logFile << L"====================================" << std::endl;
        s_logFile << L"Log ended at: ";
        s_logFile << std::put_time(&localTime, L"%Y-%m-%d %H:%M:%S") << std::endl;
        s_logFile << L"====================================" << std::endl;
        
        // Close the log file
        s_logFile.close();
    }
    
    // Clear recent logs
    while (!s_recentLogs.empty()) {
        s_recentLogs.pop();
    }
}

void Logger::Log(LogLevel level, const std::wstring& message) {
    if (level < s_logLevel) return; // Skip logging if below minimum level
    
    std::lock_guard<std::mutex> lock(s_logMutex);
    
    // Get current time
    auto now = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    std::tm localTime;
    localtime_s(&localTime, &time);
    
    // Format log message
    std::wstringstream ss;
    ss << std::put_time(&localTime, L"%H:%M:%S") << L" [" << LogLevelToString(level) << L"] " << message;
    std::wstring formattedMessage = ss.str();
    
    // Store in recent logs queue
    s_recentLogs.push(formattedMessage);
    while (s_recentLogs.size() > MAX_RECENT_LOGS) {
        s_recentLogs.pop();
    }
    
    // Write to log file if open
    if (s_logFile.is_open()) {
        s_logFile << formattedMessage << std::endl;
        s_logFile.flush();
    }
}

void Logger::LogDebug(const std::wstring& message) {
    Log(LogLevel::Debug, message);
}

void Logger::LogInfo(const std::wstring& message) {
    Log(LogLevel::Info, message);
}

void Logger::LogWarning(const std::wstring& message) {
    Log(LogLevel::Warning, message);
}

void Logger::LogError(const std::wstring& message) {
    Log(LogLevel::Error, message);
}

void Logger::SetLogLevel(LogLevel level) {
    std::lock_guard<std::mutex> lock(s_logMutex);
    s_logLevel = level;
    
    std::wstringstream ss;
    ss << L"Log level changed to: " << LogLevelToString(level);
    Log(LogLevel::Info, ss.str());
}

std::vector<std::wstring> Logger::GetRecentLogs(size_t maxMessages) {
    std::lock_guard<std::mutex> lock(s_logMutex);
    
    std::vector<std::wstring> result;
    std::queue<std::wstring> tempQueue = s_recentLogs; // Make a copy
    
    // We need to extract from the front but keep the newest messages
    size_t skipCount = 0;
    if (tempQueue.size() > maxMessages) {
        skipCount = tempQueue.size() - maxMessages;
    }
    
    // Skip older messages
    for (size_t i = 0; i < skipCount; i++) {
        tempQueue.pop();
    }
    
    // Extract the rest
    while (!tempQueue.empty()) {
        result.push_back(tempQueue.front());
        tempQueue.pop();
    }
    
    return result;
}

bool Logger::IsDebugEnabled() {
    return s_logLevel <= LogLevel::Debug;
}

std::wstring Logger::LogLevelToString(LogLevel level) {
    switch (level) {
        case LogLevel::Debug:   return L"DEBUG";
        case LogLevel::Info:    return L"INFO";
        case LogLevel::Warning: return L"WARN";
        case LogLevel::Error:   return L"ERROR";
        default:                return L"UNKNOWN";
    }
}
