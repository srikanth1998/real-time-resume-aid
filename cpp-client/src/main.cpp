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

// Supabase credentials for edge functions
const std::string SUPABASE_BASE_URL = "https://jafylkqbmvdptrqwwyed.supabase.co";
const std::string SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY";

// Use the filesystem namespace for path handling
namespace fs = std::filesystem;

// Generate a session ID that matches the expected format in Supabase
std::string GenerateSessionId() {
    // Use a consistent session ID that's recognized by the edge function
    // Format: "interview-" + timestamp + fixed string
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();
    return "interview-" + std::to_string(timestamp) + "-default";
}

// Print usage instructions
void PrintUsage() {
    std::cout << "Audio Whisper App - Capture audio and send to Supabase Speech-to-Text API\n";
    std::cout << "----------------------------------------------------------------------\n";
    std::cout << "USAGE:\n";
    std::cout << "Mode 1: Fixed Duration Capture\n";
    std::cout << "  1. Start audio capture (20 seconds of system audio will be recorded)\n";
    std::cout << "  2. Send the captured audio to Speech-to-Text API for transcription\n";
    std::cout << "  3. View the transcription results\n";
    std::cout << "\n";
    std::cout << "Mode 2: Continuous Capture with Silence Detection\n";
    std::cout << "  1. Start continuous audio capture with automatic silence detection\n";
    std::cout << "  2. Audio will be automatically split on silence gaps\n";
    std::cout << "  3. Each segment will be sent to the API in real-time\n";
    std::cout << "  4. Press Enter to stop recording\n";
    std::cout << "\n";
    std::cout << "Using Supabase endpoint: " << SUPABASE_BASE_URL << "\n";
}

int main() {
    // Initialize COM for the audio capture
    CoInitializeEx(NULL, COINIT_MULTITHREADED);
    
    PrintUsage();
    
    // Generate a random session ID
    std::string sessionId = GenerateSessionId();
    std::cout << "\nGenerated session ID: " << sessionId << "\n" << std::endl;
    
    // Flag to track if the session has been initialized
    bool sessionInitialized = false;
    
    // Initialize the API client for speech-to-text and GPT (via Supabase edge functions)
    WhisperAPIClient apiClient;
    std::string anonKey = SUPABASE_ANON_KEY;
    
    std::cout << "Using configured Supabase credentials" << std::endl;
    std::cout << "Using secure Supabase edge functions for API access" << std::endl;
    
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
        
        // Set up a transcription callback for fixed mode
        audioCapture.SetTranscriptionCallback([&apiClient, &anonKey](const std::string& filePath) {
            std::cout << "\nSending audio to Whisper API..." << std::endl;
            
            apiClient.SendAudioToAPI(filePath, anonKey, [](const std::string& response) {
                std::cout << "\n===== Speech-to-Text API Response =====\n";
                std::cout << response << std::endl;
                std::cout << "=======================================\n";
            });
        });
        
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
    std::cout << "\nApplication complete. Cleaning up..." << std::endl;
    std::cout << "\nPress Enter to exit..." << std::endl;
    std::cin.get();
    
    // Clean up COM
    CoUninitialize();
    
    return 0;
}
