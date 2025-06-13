
// BlackHole Audio Capture for macOS
// Captures loopback audio from BlackHole virtual driver

import AVFoundation
import AudioToolbox
import OpusKit

class MacOSAudioCapture {
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
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
        audioEngine = AVAudioEngine()
        guard let engine = audioEngine else { return false }
        
        inputNode = engine.inputNode
        guard let input = inputNode else { return false }
        
        // Find BlackHole device
        if !setBlackHoleAsInput() {
            print("Warning: BlackHole not found, using default input")
        }
        
        // Configure audio format
        let format = AVAudioFormat(
            standardFormatWithSampleRate: sampleRate,
            channels: channels
        )
        
        guard let audioFormat = format else { return false }
        
        // Install tap on input node
        input.installTap(
            onBus: 0,
            bufferSize: frameSize,
            format: audioFormat
        ) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer)
        }
        
        return true
    }
    
    func startCapture() -> Bool {
        guard let engine = audioEngine else { return false }
        
        if !initialize() { return false }
        
        do {
            try engine.start()
            isCapturing = true
            print("Started macOS audio capture")
            return true
        } catch {
            print("Failed to start audio engine: \(error)")
            return false
        }
    }
    
    func stopCapture() {
        guard let engine = audioEngine else { return }
        
        isCapturing = false
        engine.stop()
        inputNode?.removeTap(onBus: 0)
        
        audioEngine = nil
        inputNode = nil
        
        print("Stopped macOS audio capture")
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
    
    private func setBlackHoleAsInput() -> Bool {
        let devices = AVCaptureDevice.devices()
        
        for device in devices {
            if device.localizedName.contains("BlackHole") {
                do {
                    try AVAudioSession.sharedInstance().setPreferredInput(device as? AVAudioSessionPortDescription)
                    return true
                } catch {
                    print("Failed to set BlackHole as input: \(error)")
                }
            }
        }
        
        return false
    }
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let opusEncoder = opusEncoder,
              let floatChannelData = buffer.floatChannelData else { return }
        
        let frameCount = Int(buffer.frameLength)
        let audioData = floatChannelData[0]
        
        do {
            // Encode audio with Opus
            let encodedData = try opusEncoder.encode(
                pcm: audioData,
                frameCount: frameCount
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
