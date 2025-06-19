
#pragma once

#include <windows.h>
#include <string>
#include <commctrl.h>
#include <vector>
#include "ScreenProtection.h"
#include "Settings.h"

#pragma comment(lib, "comctl32.lib")

// Forward declarations
class AudioMonitor;

// Structure to hold question-answer pairs
struct QuestionAnswerPair {
    std::string question;
    std::string answer;
    DWORD timestamp;
};

// Overlay window class
class OverlayWindow {
public:
    OverlayWindow();
    ~OverlayWindow();

    // Initialize the overlay window
    bool Initialize(HINSTANCE hInstance);
    
    // Show or hide the overlay
    void Show();
    void Hide();
    
    // Toggle visibility
    void ToggleVisibility();
    
    // Toggle screen share protection
    void ToggleScreenShareProtection();
    
    // Get window handle
    HWND GetHWND() const { return m_hWnd; }
    
    // Set window properties
    void SetColor(COLORREF color);
    void SetOpacity(int opacity); // 0-255
    void SetPosition(int x, int y);
    void SetSize(int width, int height);
    
    // Get window properties
    bool IsVisible() const { return IsWindowVisible(m_hWnd) == TRUE; }
    bool IsProtected() const { return m_isProtectionEnabled; }

    // Question/Answer handling
    void AddQuestion(const std::string& question);
    void AddAnswer(const std::string& answer);
    void UpdateDisplay();

    // Window procedure
    static LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);

private:
    // Create the overlay window
    bool CreateOverlayWindow(HINSTANCE hInstance);
    
    // Create context menu
    HMENU CreateContextMenu();
    
    // Update window appearance
    void UpdateWindowAppearance();
    
    // Question detection
    bool IsQuestion(const std::string& text);
    
    // Send question to GPT
    void ProcessQuestion(const std::string& question);
    
    // Member variables
    HWND m_hWnd;
    HINSTANCE m_hInstance;
    COLORREF m_color;
    int m_opacity;
    bool m_isProtectionEnabled;
    bool m_isDragging;
    POINT m_lastMousePos;
    SettingsManager m_settings;
    
    // Question/Answer handling
    std::vector<QuestionAnswerPair> m_questionAnswers;
    std::string m_currentQuestion;
    bool m_waitingForAnswer;
    
    // Display controls
    HWND m_hScrollArea;
    HWND m_hQuestionText;
    HWND m_hAnswerText;
};
