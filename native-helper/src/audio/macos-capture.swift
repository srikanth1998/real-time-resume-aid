
// CoreAudio Process-Tap for macOS 14.4+
// Native system audio capture without virtual drivers

import AVFoundation
import AudioToolbox
import OpusKit

class MacOSAudioCapture {
    private var audioEngine: AVAudioEngine?
    private var processTap: AVAudioProcessTap?
    private var opusEncoder: OpusEncoder?
    private var isCapturing = false
    
    // Audio format constants
    private let sampleRate: Double = 16000
    private let channels: AVAudioChannelCount = 1
    private let frameSize: AVAudioFrameCount = 320 // 20ms at 16kHz
    
    init() {
        setupOpusEncoder()
    }
    
    deinit {
        stopCapture()
    }
    
    func initialize() -> Bool {
        // Check if process-tap is available (macOS 14.4+)
        if #available(macOS 14.4, *) {
            return initializeProcessTap()
        } else {
            print("Process-tap not available, requires macOS 14.4+")
            return false
        }
    }
    
    @available(macOS 14.4, *)
    private func initializeProcessTap() -> Bool {
        do {
            // Create process-tap for system audio capture
            let tapDescription = AudioComponentDescription(
                componentType: kAudioUnitType_Effect,
                componentSubType: kAudioUnitSubType_Tap,
                componentManufacturer: kAudioUnitManufacturer_Apple,
                componentFlags: 0,
                componentFlagsMask: 0
            )
            
            // Configure audio format for capture
            let format = AVAudioFormat(
                standardFormatWithSampleRate: sampleRate,
                channels: channels
            )
            
            guard let audioFormat = format else { return false }
            
            // Create process tap with callback
            var callbacks = MTAudioProcessingTapCallbacks(
                version: kMTAudioProcessingTapCallbacksVersion_0,
                clientInfo: Unmanaged.passUnretained(self).toOpaque(),
                init: { tap, clientInfo, tapStorageOut in
                    tapStorageOut?.pointee = clientInfo
                    return noErr
                },
                finalize: { tap in },
                prepare: { tap, maxFrames, processingFormat in
                    return noErr
                },
                unprepare: { tap in },
                process: { tap, numberFrames, flags, bufferListInOut, numberFramesOut, flagsOut in
                    let selfPtr = MTAudioProcessingTapGetStorage(tap)
                    let capture = Unmanaged<MacOSAudioCapture>.fromOpaque(selfPtr).takeUnretainedValue()
                    capture.processAudioTap(bufferListInOut, frameCount: numberFrames)
                    return noErr
                }
            )
            
            var tap: Unmanaged<MTAudioProcessingTap>?
            let status = MTAudioProcessingTapCreate(
                kCFAllocatorDefault,
                &callbacks,
                kMTAudioProcessingTapCreationFlag_PostEffects,
                &tap
            )
            
            if status == noErr, let processTap = tap?.takeRetainedValue() {
                self.processTap = processTap
                print("✅ CoreAudio process-tap initialized")
                return true
            } else {
                print("❌ Failed to create process-tap: \(status)")
                return false
            }
            
        } catch {
            print("❌ Error initializing process-tap: \(error)")
            return false
        }
    }
    
    func startCapture() -> Bool {
        if !initialize() { return false }
        
        isCapturing = true
        print("✅ Started macOS CoreAudio process-tap capture")
        return true
    }
    
    func stopCapture() {
        isCapturing = false
        
        if let tap = processTap {
            // Clean up process-tap
            processTap = nil
        }
        
        print("✅ Stopped macOS CoreAudio process-tap capture")
    }
    
    private func setupOpusEncoder() {
        do {
            opusEncoder = try OpusEncoder(
                sampleRate: Int32(sampleRate),
                channels: Int32(channels),
                application: .voip
            )
            
            // Configure for low latency
            try opusEncoder?.setBitrate(32000)
            try opusEncoder?.setComplexity(0)
            try opusEncoder?.setSignal(.voice)
            
        } catch {
            print("Failed to create Opus encoder: \(error)")
        }
    }
    
    // Process audio from CoreAudio process-tap
    private func processAudioTap(_ bufferList: UnsafeMutablePointer<AudioBufferList>, frameCount: UInt32) {
        guard let opusEncoder = opusEncoder, isCapturing else { return }
        
        let buffers = UnsafeMutableAudioBufferListPointer(bufferList)
        guard let audioBuffer = buffers.first else { return }
        
        // Convert raw audio data to Float32 array
        let audioData = audioBuffer.mData?.bindMemory(to: Float32.self, capacity: Int(frameCount))
        guard let audioPtr = audioData else { return }
        
        do {
            // Encode audio with Opus
            let encodedData = try opusEncoder.encode(
                pcm: audioPtr,
                frameCount: Int(frameCount)
            )
            
            // Send to callback
            sendAudioData(encodedData)
            
        } catch {
            print("Opus encoding failed: \(error)")
        }
    }
    
    private func sendAudioData(_ data: Data) {
        // This would call back to the Node.js layer
        // Implementation would use a callback mechanism
        NotificationCenter.default.post(
            name: NSNotification.Name("AudioDataReady"),
            object: nil,
            userInfo: ["audioData": data]
        )
    }
}

// C interface for Node.js binding
@_cdecl("createMacOSCapture")
func createMacOSCapture() -> UnsafeMutableRawPointer {
    let capture = MacOSAudioCapture()
    return Unmanaged.passRetained(capture).toOpaque()
}

@_cdecl("startMacOSCapture")
func startMacOSCapture(_ ptr: UnsafeMutableRawPointer) -> Bool {
    let capture = Unmanaged<MacOSAudioCapture>.fromOpaque(ptr).takeUnretainedValue()
    return capture.startCapture()
}

@_cdecl("stopMacOSCapture")
func stopMacOSCapture(_ ptr: UnsafeMutableRawPointer) {
    let capture = Unmanaged<MacOSAudioCapture>.fromOpaque(ptr).takeUnretainedValue()
    capture.stopCapture()
}

@_cdecl("destroyMacOSCapture")
func destroyMacOSCapture(_ ptr: UnsafeMutableRawPointer) {
    let _ = Unmanaged<MacOSAudioCapture>.fromOpaque(ptr).takeRetainedValue()
}
