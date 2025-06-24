
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

// Authentication flow
bool AuthenticateUser(AuthClient& authClient) {
    std::string email, otp;
    bool authSuccess = false;
    bool otpSent = false;
    
    std::cout << "\n=== InterviewAce Authentication ===" << std::endl;
    std::cout << "Please enter your email address: ";
    std::cin >> email;
    
    // Send OTP
    std::cout << "Sending OTP to " << email << "..." << std::endl;
    authClient.SendOTP(email, [&otpSent](bool success, const std::string& message) {
        if (success) {
            std::cout << "✓ " << message << std::endl;
        } else {
            std::cout << "✗ " << message << std::endl;
        }
        otpSent = true;
    });
    
    // Wait for OTP to be sent
    while (!otpSent) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    if (!otpSent) {
        std::cerr << "Failed to send OTP. Please check your email address." << std::endl;
        return false;
    }
    
    // Get OTP from user
    std::cout << "Please enter the 6-digit OTP sent to your email: ";
    std::cin >> otp;
    
    // Verify OTP
    bool verificationComplete = false;
    authClient.VerifyOTP(email, otp, [&authSuccess, &verificationComplete](bool success, const std::string& message, const std::string& userEmail) {
        if (success) {
            std::cout << "✓ Authentication successful! Welcome, " << userEmail << std::endl;
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

// Print usage instructions
void PrintUsage() {
    std::cout << "InterviewAce - AI-Powered Interview Assistant\n";
    std::cout << "===========================================\n";
    std::cout << "This application captures audio and provides AI-powered interview assistance.\n";
    std::cout << "\nMODES:\n";
    std::cout << "1. Fixed Duration Capture (20 seconds)\n";
    std::cout << "   - Records audio for a fixed duration\n";
    std::cout << "   - Sends to AI for transcription and response\n";
    std::cout << "\n";
    std::cout << "2. Continuous Capture with Silence Detection\n";
    std::cout << "   - Real-time audio capture with smart segmentation\n";
    std::cout << "   - Automatic processing when you stop speaking\n";
    std::cout << "   - Press Enter to stop recording\n";
    std::cout << "\n";
    std::cout << "Using Supabase endpoint: " << SUPABASE_BASE_URL << "\n";
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
    
    // Authenticate user
    if (!AuthenticateUser(authClient)) {
        std::cerr << "Authentication failed. Exiting..." << std::endl;
        CoUninitialize();
        return 1;
    }
    
    // Create interview session for authenticated user
    std::string sessionId = authClient.CreateInterviewSession();
    if (sessionId.empty()) {
        std::cerr << "Failed to create interview session" << std::endl;
        CoUninitialize();
        return 1;
    }
    
    std::cout << "\nSession created: " << sessionId << std::endl;
    std::cout << "Authenticated as: " << authClient.GetUserEmail() << std::endl;
    
    // Flag to track if the session has been initialized
    bool sessionInitialized = false;
    
    // Initialize the API client for speech-to-text and GPT (via Supabase edge functions)
    WhisperAPIClient apiClient;
    std::string anonKey = SUPABASE_ANON_KEY;
    
    std::cout << "\nUsing secure Supabase edge functions for API access" << std::endl;
    
    // Set up the audio capture
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
    if (!apiClient.Initialize()) {
        std::cerr << "Failed to initialize API client" << std::endl;
        CoUninitialize();
        return 1;
    }
    
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
    
    if (mode == 1) {
        // Fixed duration capture (20 seconds)
        std::cout << "\nStarting fixed duration audio capture (20 seconds)..." << std::endl;
        
        if (!audioCapture.Start()) {
            std::cerr << "Failed to start audio capture" << std::endl;
            CoUninitialize();
            return 1;
        }
        
        // Wait for capture to finish (20 seconds + a little buffer)
        std::cout << "Recording for 20 seconds..." << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(21));
        
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
        // Continuous capture with silence detection
        std::cout << "\nStarting continuous audio capture with silence detection..." << std::endl;
        std::cout << "Press Enter to stop recording" << std::endl;
        
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
        
        // Wait for user to press Enter to stop
        std::cin.ignore(1000, '\n'); // Clear any previous input
        std::cin.get(); // Wait for Enter key
        
        // Stop continuous capture
        audioCapture.Stop();
        
        std::cout << "\nContinuous audio capture stopped" << std::endl;
    } else {
        std::cerr << "Invalid mode selected" << std::endl;
        CoUninitialize();
        return 1;
    }
    
    // Cleanup and exit
    std::cout << "\nInterview session complete!" << std::endl;
    std::cout << "Session ID: " << sessionId << std::endl;
    std::cout << "User: " << authClient.GetUserEmail() << std::endl;
    std::cout << "\nPress Enter to exit..." << std::endl;
    std::cin.get();
    
    // Sign out user
    authClient.SignOut();
    
    // Clean up COM
    CoUninitialize();
    
    return 0;
}
