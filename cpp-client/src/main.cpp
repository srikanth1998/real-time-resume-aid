#include <iostream>
#include <string>
#include <chrono>
#include <thread>
#include <windows.h>
#include <random>
#include <filesystem>
#include <limits>
#include "../include/audio_capture.h"
#include "../include/whisper_api_client.h"
#include "../include/auth_client.h"

// Supabase credentials for edge functions
const std::string SUPABASE_BASE_URL = "https://jafylkqbmvdptrqwwyed.supabase.co";
const std::string SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY";

// Use the filesystem namespace for path handling
namespace fs = std::filesystem;

// Global variables for session tracking
auto g_sessionStartTime = std::chrono::steady_clock::now();
bool g_sessionActive = false;

// Authentication mode selection
int SelectAuthenticationMode() {
    std::cout << "\n=== InterviewAce Authentication ===" << std::endl;
    std::cout << "Select authentication method:" << std::endl;
    std::cout << "1. Account Login (Email + OTP)" << std::endl;
    std::cout << "2. Quick Session (6-digit code)" << std::endl;
    std::cout << "Enter choice (1 or 2): ";
    
    int choice;
    std::cin >> choice;
    return choice;
}

// Account-based authentication flow
bool AuthenticateWithAccount(AuthClient& authClient) {
    std::string email, password;
    bool authSuccess = false;
    
    std::cout << "\n=== Account Login ===" << std::endl;
    std::cout << "Please enter your email address: ";
    std::cin >> email;
    
    std::cout << "Please enter your password: ";
    std::cin >> password;
    
    // Sign in with password
    std::cout << "Authenticating with " << email << "..." << std::endl;
    bool authComplete = false;
    authClient.SignInWithPassword(email, password, [&authSuccess, &authComplete](bool success, const std::string& message, const std::string& userEmail) {
        if (success) {
            std::cout << "✓ Authentication successful! Welcome, " << userEmail << std::endl;
            authSuccess = true;
        } else {
            std::cout << "✗ " << message << std::endl;
            authSuccess = false;
        }
        authComplete = true;
    });
    
    // Wait for authentication to complete
    while (!authComplete) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    return authSuccess;
}

// Session code authentication flow
bool AuthenticateWithSessionCode(AuthClient& authClient) {
    std::string sessionCode;
    bool authSuccess = false;
    
    std::cout << "\n=== Quick Session Login ===" << std::endl;
    std::cout << "Please enter your 6-digit session code: ";
    std::cin >> sessionCode;
    
    // Verify session code
    bool verificationComplete = false;
    authClient.VerifySessionCode(sessionCode, [&authSuccess, &verificationComplete](bool success, const std::string& message, const std::string& sessionId, int durationHours) {
        if (success) {
            std::cout << "✓ Session authenticated successfully!" << std::endl;
            std::cout << "Session ID: " << sessionId << std::endl;
            std::cout << "Duration: " << durationHours << " hours" << std::endl;
            authSuccess = true;
        } else {
            std::cout << "✗ " << message << std::endl;
            authSuccess = false;
        }
        verificationComplete = true;
    });
    
    // Wait for verification to complete
    while (!verificationComplete) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    return authSuccess;
}

// Display session timer
void DisplaySessionTimer(int durationHours) {
    auto currentTime = std::chrono::steady_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(currentTime - g_sessionStartTime);
    auto totalDurationSeconds = durationHours * 3600;
    auto remaining = totalDurationSeconds - elapsed.count();
    
    if (remaining <= 0) {
        std::cout << "\n⚠️ SESSION TIME EXPIRED! ⚠️" << std::endl;
        g_sessionActive = false;
        return;
    }
    
    int hours = remaining / 3600;
    int minutes = (remaining % 3600) / 60;
    int seconds = remaining % 60;
    
    std::cout << "\r⏱️ Time Remaining: " << hours << "h " << minutes << "m " << seconds << "s ";
    std::cout.flush();
}

// Print usage instructions
void PrintUsage() {
    std::cout << "InterviewAce - AI-Powered Interview Assistant\n";
    std::cout << "===========================================\n";
    std::cout << "This application captures audio and provides AI-powered interview assistance.\n";
    std::cout << "\nAUTHENTICATION METHODS:\n";
    std::cout << "1. Account Login - Use your registered email and OTP\n";
    std::cout << "2. Quick Session - Use 6-digit code from paid web session\n";
    std::cout << "\nMODES:\n";
    std::cout << "1. Fixed Duration Capture (20 seconds)\n";
    std::cout << "2. Continuous Capture with Silence Detection\n";
    std::cout << "\nUsing Supabase endpoint: " << SUPABASE_BASE_URL << "\n";
}

int main() {
    // Initialize COM for the audio capture
    CoInitializeEx(NULL, COINIT_MULTITHREADED);
    
    PrintUsage();
    
    // Initialize authentication client
    AuthClient authClient;
    if (!authClient.Initialize(SUPABASE_BASE_URL, SUPABASE_ANON_KEY)) {
        std::cerr << "Failed to initialize authentication client" << std::endl;
        CoUninitialize();
        return 1;
    }
    
    // Select authentication method
    int authMode = SelectAuthenticationMode();
    bool authenticated = false;
    
    if (authMode == 1) {
        authenticated = AuthenticateWithAccount(authClient);
    } else if (authMode == 2) {
        authenticated = AuthenticateWithSessionCode(authClient);
    } else {
        std::cerr << "Invalid authentication method selected" << std::endl;
        CoUninitialize();
        return 1;
    }
    
    if (!authenticated) {
        std::cerr << "Authentication failed. Exiting..." << std::endl;
        CoUninitialize();
        return 1;
    }
    
    // Create or get interview session
    std::string sessionId = authClient.CreateInterviewSession();
    if (sessionId.empty()) {
        std::cerr << "Failed to create interview session" << std::endl;
        CoUninitialize();
        return 1;
    }
    
    std::cout << "\n=== SESSION READY ===" << std::endl;
    std::cout << "Session ID: " << sessionId << std::endl;
    std::cout << "User: " << authClient.GetUserEmail() << std::endl;
    std::cout << "Duration: " << authClient.GetDurationHours() << " hours" << std::endl;
    std::cout << "Authentication Type: " << (authClient.GetAuthType() == AuthType::ACCOUNT_LOGIN ? "Account" : "Session Code") << std::endl;
    
    // Wait for user to press Start
    std::cout << "\nPress Enter to START your interview session...";
    std::cin.ignore();
    std::cin.get();
    
    // Start session timer
    g_sessionStartTime = std::chrono::steady_clock::now();
    g_sessionActive = true;
    
    std::cout << "\n🚀 SESSION STARTED! 🚀" << std::endl;
    std::cout << "Duration: " << authClient.GetDurationHours() << " hours" << std::endl;
    
    // Initialize audio capture
    AudioCapture audioCapture;
    
    // Generate a output file path in the current directory
    fs::path exePath = fs::current_path();
    fs::path audioFilePath = exePath / "temp_audio.wav";
    
    std::cout << "Audio will be saved to: " << audioFilePath.string() << std::endl;
    
    // Initialize audio capture
    if (!audioCapture.Initialize()) {
        std::cerr << "Failed to initialize audio capture" << std::endl;
        CoUninitialize();
        return 1;
    }
    
    // Initialize API client
    WhisperAPIClient apiClient;
    std::string anonKey = SUPABASE_ANON_KEY;
    
    std::cout << "\nUsing secure Supabase edge functions for API access" << std::endl;
    
    // Set API endpoint for Supabase
    apiClient.SetAPIEndpoint(
        SUPABASE_BASE_URL.substr(SUPABASE_BASE_URL.find("://") + 3), // Remove https:// prefix
        "/functions/v1/speech-to-text", // Edge function for Whisper
        "/functions/v1/generate-interview-answer", // Edge function for GPT responses
        443,
        true
    );
    
    // Set the audio file path in the audio capture class
    audioCapture.SetOutputFilePath(audioFilePath.string());
    
    // Let the user select the capture mode
    int mode;
    std::cout << "\nSelect capture mode:\n";
    std::cout << "1. Fixed duration capture (20 seconds)\n";
    std::cout << "2. Continuous capture with silence detection\n";
    std::cout << "Enter mode (1 or 2): ";
    std::cin >> mode;
    
    // Clear any previous audio files
    if (fs::exists(audioFilePath)) {
        try {
            fs::remove(audioFilePath);
            std::cout << "Removed previous audio file" << std::endl;
        } catch (const std::exception& e) {
            std::cerr << "Warning: Could not remove previous audio file: " << e.what() << std::endl;
        }
    }
    
    // Audio capture with session timer
    if (mode == 1) {
        // Fixed duration capture (20 seconds)
        std::cout << "\nStarting fixed duration audio capture (20 seconds)..." << std::endl;
        
        if (!audioCapture.Start()) {
            std::cerr << "Failed to start audio capture" << std::endl;
            CoUninitialize();
            return 1;
        }
        
        // Wait for capture to finish with timer display
        std::cout << "Recording for 20 seconds..." << std::endl;
        for (int i = 0; i < 21 && g_sessionActive; i++) {
            DisplaySessionTimer(authClient.GetDurationHours());
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        if (!g_sessionActive) {
            std::cout << "\nSession expired during recording." << std::endl;
            audioCapture.Stop();
            CoUninitialize();
            return 1;
        }
        
        // Stop audio capture
        audioCapture.Stop();
        
        std::cout << "\nAudio capture complete" << std::endl;
        
        // Send audio to API
        std::cout << "\nSending audio to Whisper API..." << std::endl;
        
        // Send the audio file to the Whisper API
        apiClient.SendAudioToAPI(audioFilePath.string(), anonKey, [&apiClient, &anonKey, &sessionId, &sessionInitialized](const std::string& response) {
            // 1. Print the Whisper transcription result
            std::cout << "\n===== WHISPER: Speech-to-Text Result =====\n";
            std::cout << response << std::endl;
            std::cout << "==========================================\n";
            
            // Parse the response to extract the transcribed text
            std::string transcribedText;
            try {
                auto json = nlohmann::json::parse(response);
                if (json.contains("text")) {
                    transcribedText = json["text"];
                    
                    // 2. Initialize session if needed, then send the transcribed text to GPT
                    if (!transcribedText.empty()) {
                        // Check if we need to initialize session first
                        if (!sessionInitialized) {
                            std::cout << "\nInitializing GPT session first...\n";
                            sessionInitialized = apiClient.InitializeGPTSession(
                                sessionId,      // Session ID for tracking
                                anonKey,        // Supabase anon key
                                [](const std::string& response) {
                                    // Print session initialization response
                                    std::cout << "Session initialization response: " << response << std::endl;
                                }
                            );
                            
                            // Add a short delay after initialization to allow backend to process
                            std::cout << "Waiting for session initialization..." << std::endl;
                            std::this_thread::sleep_for(std::chrono::milliseconds(500));
                        }
                        
                        std::cout << "\nSending transcribed text to GPT via secure edge function...\n";
                        apiClient.SendTranscriptionForAnswer(
                            transcribedText,  // Use the transcribed text as the question/prompt
                            sessionId,         // Session ID for tracking
                            anonKey,           // Supabase anon key
                            [transcribedText](const std::string& gptResponse) {
                                // Print the GPT response
                                std::cout << "\n===== GPT: Response to Transcribed Text =====\n";
                                std::cout << "User: " << transcribedText << std::endl;
                                std::cout << "GPT: " << gptResponse << std::endl;
                                std::cout << "===========================================\n";
                            }
                        );
                    }
                } else {
                    std::cout << "Warning: Could not extract transcribed text from response" << std::endl;
                }
            } catch (const std::exception& e) {
                std::cerr << "Error parsing Whisper API response: " << e.what() << std::endl;
            }
        });
    } else if (mode == 2) {
        // Continuous capture with session timer
        std::cout << "\nStarting continuous audio capture with silence detection..." << std::endl;
        std::cout << "Press Enter to stop recording (session will auto-stop when time expires)" << std::endl;
        
        // Configure silence detection parameters
        audioCapture.SetSilenceThreshold(0.015f);     // Adjust based on testing
        audioCapture.SetSilenceTimeout(1.0f);         // 1 second of silence to split
        audioCapture.SetMinSpeechDuration(0.5f);      // Minimum 0.5 sec of speech to keep
        audioCapture.SetMaxSpeechDuration(15.0f);     // Maximum 15 sec segment
        
        // Set up audio segment callback for continuous mode
        audioCapture.SetAudioSegmentCallback([&apiClient, &anonKey, &sessionId, &sessionInitialized](const std::string& filePath, float duration) {
            std::cout << "\nProcessing audio segment with duration: " << duration << " seconds" << std::endl;
            
            // Send the segment to the Whisper API for transcription
            apiClient.SendAudioToAPI(filePath, anonKey, [&apiClient, &anonKey, &sessionId, &sessionInitialized, filePath](const std::string& response) {
                // 1. Print the Whisper transcription result
                std::cout << "\n===== WHISPER: Speech-to-Text Result =====\n";
                std::cout << response << std::endl;
                std::cout << "==========================================\n";
                
                // Parse the response to extract the transcribed text
                std::string transcribedText;
                try {
                    auto json = nlohmann::json::parse(response);
                    if (json.contains("text")) {
                        transcribedText = json["text"];
                        
                        // 2. Initialize session if needed, then send the transcribed text to GPT
                        if (!transcribedText.empty()) {
                            // Check if we need to initialize session first
                            if (!sessionInitialized) {
                                std::cout << "\nInitializing GPT session first...\n";
                                sessionInitialized = apiClient.InitializeGPTSession(
                                    sessionId,      // Session ID for tracking
                                    anonKey,        // Supabase anon key
                                    [](const std::string& response) {
                                        // Print session initialization response
                                        std::cout << "Session initialization response: " << response << std::endl;
                                    }
                                );
                                
                                // Add a short delay after initialization to allow backend to process
                                std::cout << "Waiting for session initialization..." << std::endl;
                                std::this_thread::sleep_for(std::chrono::milliseconds(500));
                            }
                            
                            std::cout << "\nSending transcribed text to GPT via secure edge function...\n";
                            apiClient.SendTranscriptionForAnswer(
                                transcribedText,  // Use the transcribed text as the question/prompt
                                sessionId,         // Session ID for tracking
                                anonKey,           // Supabase anon key
                                [transcribedText](const std::string& gptResponse) {
                                    // Print the GPT response
                                    std::cout << "\n===== GPT: Response to Transcribed Text =====\n";
                                    std::cout << "User: " << transcribedText << std::endl;
                                    std::cout << "GPT: " << gptResponse << std::endl;
                                    std::cout << "===========================================\n";
                                }
                            );
                        }
                    } else {
                        std::cout << "Warning: Could not extract transcribed text from response" << std::endl;
                    }
                } catch (const std::exception& e) {
                    std::cerr << "Error parsing Whisper API response: " << e.what() << std::endl;
                }
            });
        });
        
        // Start continuous capture
        if (!audioCapture.StartContinuous()) {
            std::cerr << "Failed to start continuous audio capture" << std::endl;
            CoUninitialize();
            return 1;
        }
        
        // Monitor session time while waiting for user input
        std::thread timerThread([&authClient]() {
            while (g_sessionActive) {
                DisplaySessionTimer(authClient.GetDurationHours());
                std::this_thread::sleep_for(std::chrono::seconds(1));
            }
        });
        
        // Wait for user to press Enter or session to expire
        std::cin.ignore(1000, '\n');
        std::cin.get();
        
        g_sessionActive = false;
        if (timerThread.joinable()) {
            timerThread.join();
        }
        
        // Stop continuous capture
        audioCapture.Stop();
        
        std::cout << "\nContinuous audio capture stopped" << std::endl;
    } else {
        std::cerr << "Invalid mode selected" << std::endl;
        CoUninitialize();
        return 1;
    }
    
    // Calculate session duration
    auto sessionEndTime = std::chrono::steady_clock::now();
    auto totalDuration = std::chrono::duration_cast<std::chrono::minutes>(sessionEndTime - g_sessionStartTime);
    
    // Cleanup and exit
    std::cout << "\n=== SESSION COMPLETE ===" << std::endl;
    std::cout << "Session ID: " << sessionId << std::endl;
    std::cout << "User: " << authClient.GetUserEmail() << std::endl;
    std::cout << "Total Duration: " << totalDuration.count() << " minutes" << std::endl;
    std::cout << "Authentication Type: " << (authClient.GetAuthType() == AuthType::ACCOUNT_LOGIN ? "Account" : "Session Code") << std::endl;
    std::cout << "\nPress Enter to exit..." << std::endl;
    std::cin.get();
    
    // Sign out user
    authClient.SignOut();
    
    // Clean up COM
    CoUninitialize();
    
    return 0;
}
