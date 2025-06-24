#pragma once

#include <windows.h>
#include <mmdeviceapi.h>
#include <Audioclient.h>
#include <functional>
#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <condition_variable>

// Callback type for transcription results
using TranscriptionCallback = std::function<void(const std::string&)>;
// Callback type for audio segments
using AudioSegmentCallback = std::function<void(const std::string&, float)>;

// Audio segment structure for processing
struct AudioSegment {
    std::vector<BYTE> audioData;
    float durationSec;
    
    AudioSegment() : durationSec(0.0f) {}
    AudioSegment(const std::vector<BYTE>& data, float duration) 
        : audioData(data), durationSec(duration) {}
};

class AudioCapture {
public:
    AudioCapture();
    ~AudioCapture();

    // Initialize the audio capture system (for system audio loopback)
    bool Initialize();
    
    // Start and stop audio capture
    bool Start();
    bool StartContinuous(); // Start continuous capture with silence detection
    bool Stop();
    
    // Set callback for transcription results
    void SetTranscriptionCallback(TranscriptionCallback callback);
    
    // Set callback for audio segments
    void SetAudioSegmentCallback(AudioSegmentCallback callback);
    
    // Set silence detection parameters
    void SetSilenceThreshold(float threshold); // 0.0 to 1.0
    void SetSilenceTimeout(float timeoutSec); // Seconds of silence to trigger segment
    void SetMinSpeechDuration(float durationSec); // Minimum speech segment duration
    void SetMaxSpeechDuration(float durationSec); // Maximum speech segment duration
    
    // Set output file path for saving audio
    void SetOutputFilePath(const std::string& filePath);
    
    // Save captured audio to WAV file
    bool SaveWavFile(const std::string& filePath);
    bool SaveWavFile(const std::string& filePath, const std::vector<BYTE>& audioData);
    bool SaveSegmentToWavFile(const std::vector<BYTE>& audioData, const std::string& filePath);
    
    // Helper methods for continuous capture
    float CalculateAudioEnergy(const std::vector<BYTE>& audioData, UINT32 numFrames, UINT16 bitsPerSample, UINT16 numChannels);
    bool IsSilence(float energy);
    float BytesToSeconds(size_t bytes);
    
    // Get current silence detection parameters
    float GetSilenceThreshold() const { return m_silenceThreshold; }
    float GetSilenceTimeout() const { return m_silenceTimeoutSec; }
    float GetMinSpeechDuration() const { return m_minSpeechDurationSec; }
    float GetMaxSpeechDuration() const { return m_maxSpeechDurationSec; }

private:
    // Audio device interfaces
    IMMDeviceEnumerator* m_pEnumerator;
    IMMDevice* m_pDevice;
    IAudioClient* m_pAudioClient;
    IAudioCaptureClient* m_pCaptureClient;
    WAVEFORMATEX* m_pwfx;
    
    // Buffer and thread management
    UINT32 m_bufferFrameCount;
    REFERENCE_TIME m_hnsBufferDuration;
    std::vector<BYTE> m_audioBuffer;
    std::thread m_captureThread;
    std::thread m_audioProcessingThread;
    std::atomic<bool> m_stopCapture;
    std::atomic<bool> m_stopProcessing;
    bool m_initialized;
    bool m_continuousMode;
    
    // Silence detection parameters
    float m_silenceThreshold;     // Audio energy level threshold (0.0-1.0)
    float m_silenceTimeoutSec;    // Seconds of silence to trigger a segment
    float m_minSpeechDurationSec; // Minimum speech segment duration
    float m_maxSpeechDurationSec; // Maximum speech segment duration
    
    // Audio segment processing
    std::queue<AudioSegment> m_segmentQueue;
    std::mutex m_queueMutex;
    std::condition_variable m_queueCV;
    
    // Output file path
    std::string m_outputFilePath;
    
    // Callbacks
    TranscriptionCallback m_transcriptionCallback;
    AudioSegmentCallback m_audioSegmentCallback;
    
    // Thread functions
    void CaptureThreadFunction();            // Regular fixed-duration capture
    void ContinuousCaptureThreadFunction();   // Continuous capture with silence detection
    void AudioProcessingThreadFunction();     // Process audio segments from queue
    
    // Helper methods
    std::vector<BYTE> GetAudioChunk(size_t startPos, size_t endPos);
    int GetBytesPerFrame();
};
