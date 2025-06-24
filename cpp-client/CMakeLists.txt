cmake_minimum_required(VERSION 3.10)
project(AudioWhisperApp)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add include directories
include_directories(${CMAKE_SOURCE_DIR}/include)

# Windows libraries are linked directly

# Add source files
set(SOURCES
    src/audio_capture.cpp
    src/whisper_api_client.cpp
    src/main.cpp
)

# Create executable
add_executable(AudioWhisperApp ${SOURCES})

# Link libraries directly
target_link_libraries(AudioWhisperApp
    winhttp.lib
    ole32.lib
    user32.lib
    uuid.lib
    crypt32.lib
)

# Set output directory
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
