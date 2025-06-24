# AudioWhisperApp - C++ Client

This is the C++ client component for the Real-Time Resume Aid project. It handles audio capture and processing, communicating with Supabase edge functions for speech-to-text transcription and GPT conversation.

## Features

- Real-time audio capture using Windows WASAPI
- Integration with Supabase edge functions for secure API access
- Speech-to-text transcription using OpenAI Whisper
- GPT-based conversation responses
- Support for both fixed duration and continuous audio capture modes

## Building

Use the included build script or CMake:

```
build.bat
```

Or manually:

```
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

## Dependencies

- Windows platform (uses WinHTTP and WASAPI)
- CMake build system
- nlohmann/json for JSON processing
