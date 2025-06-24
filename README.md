# Real-Time Resume Aid

This project consists of a web application and a C++ client for audio transcription.

## Web Application

**URL**: https://lovable.dev/projects/ab5cf0d4-af48-4db4-a29e-6081af8c9b49

### How can I edit the web application code?

There are several ways of editing the web application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/ab5cf0d4-af48-4db4-a29e-6081af8c9b49) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

### Web Application Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/ab5cf0d4-af48-4db4-a29e-6081af8c9b49) and click on Share -> Publish.

### Custom Domain

Yes, you can connect a custom domain!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## C++ Audio Whisper Client

A simple console application that captures system audio and uses the OpenAI Whisper API for transcription.

### Features

- Captures system audio output (loopback)
- Saves audio as WAV file
- Sends audio file to OpenAI Whisper API
- Displays transcription results in the console

### Requirements

- Windows OS
- Visual Studio with C++ development tools or MinGW
- CMake
- OpenAI API key

### Building the Project

1. Run the `build.bat` script to build the application
2. The executable will be created in the `build/bin/Release` directory

### Usage

1. Run the application
2. Enter your OpenAI API key when prompted
3. The application will capture 5 seconds of system audio
4. The audio will be sent to the Whisper API for transcription
5. Transcription results will be displayed in the console

### Code Structure

- `include/audio_capture.h` - Header for audio capture functionality
- `include/whisper_api_client.h` - Header for Whisper API client
- `src/audio_capture.cpp` - Implementation of audio capture using Windows WASAPI
- `src/whisper_api_client.cpp` - Implementation of Whisper API client using WinHTTP
- `src/main.cpp` - Main application entry point

### Notes

- The application captures audio for 5 seconds by default
- Audio is saved to a temporary WAV file named `temp_audio.wav`
- Make sure to speak or play audio while capturing for best results
