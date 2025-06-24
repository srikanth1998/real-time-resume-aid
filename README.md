# Audio Whisper App

A simple console application that captures system audio and uses the OpenAI Whisper API for transcription.

## Features

- Captures system audio output (loopback)
- Saves audio as WAV file
- Sends audio file to OpenAI Whisper API
- Displays transcription results in the console

## Requirements

- Windows OS
- Visual Studio with C++ development tools or MinGW
- CMake
- OpenAI API key

## Building the Project

1. Run the `build.bat` script to build the application
2. The executable will be created in the `build\bin\Release` directory

## Usage

1. Run the application
2. Enter your OpenAI API key when prompted
3. The application will capture 5 seconds of system audio
4. The audio will be sent to the Whisper API for transcription
5. Transcription results will be displayed in the console

## Code Structure

- `include/audio_capture.h` - Header for audio capture functionality
- `include/whisper_api_client.h` - Header for Whisper API client
- `src/audio_capture.cpp` - Implementation of audio capture using Windows WASAPI
- `src/whisper_api_client.cpp` - Implementation of Whisper API client using WinHTTP
- `src/main.cpp` - Main application entry point

## Notes

- The application captures audio for 5 seconds by default
- Audio is saved to a temporary WAV file named `temp_audio.wav`
- Make sure to speak or play audio while capturing for best results
