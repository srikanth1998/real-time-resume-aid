use anyhow::Result;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

static CAPTURING: AtomicBool = AtomicBool::new(false);

pub async fn run(session_id: String, jwt: String) {
    println!("🎤 Starting Windows WASAPI audio capture...");
    println!("Session ID: {}", session_id);
    
    CAPTURING.store(true, Ordering::Relaxed);
    
    // Initialize Windows WASAPI capture
    let capture_active = Arc::new(AtomicBool::new(true));
    let capture_flag = capture_active.clone();
    
    // Start audio capture loop
    tokio::spawn(async move {
        let mut last_send = std::time::Instant::now();
        
        while capture_flag.load(Ordering::Relaxed) && CAPTURING.load(Ordering::Relaxed) {
            // Simulate audio capture - in real implementation this would:
            // 1. Use WASAPI to capture system audio from VB-Cable
            // 2. Encode to Opus format
            // 3. Send to Supabase via HTTP POST to speech-to-text function
            
            // Send audio chunks every 2 seconds
            if last_send.elapsed().as_secs() >= 2 {
                if let Err(e) = send_audio_chunk(&session_id, &jwt).await {
                    eprintln!("Audio processing error: {}", e);
                } else {
                    println!("📤 Sent audio chunk for session: {}", session_id);
                }
                last_send = std::time::Instant::now();
            }
            
            sleep(Duration::from_millis(100)).await;
        }
        println!("🛑 Windows audio capture stopped");
    });
    
    // Keep running until stopped
    while CAPTURING.load(Ordering::Relaxed) {
        sleep(Duration::from_millis(500)).await;
    }
    
    capture_active.store(false, Ordering::Relaxed);
}

async fn send_audio_chunk(session_id: &str, jwt: &str) -> Result<()> {
    let client = reqwest::Client::new();
    let supabase_url = "https://jafylkqbmvdptrqwwyed.supabase.co";
    
    // Simulate 16kHz mono audio data (2 seconds = 32,000 samples = 64,000 bytes for 16-bit)
    let dummy_audio = vec![0u8; 64000];
    
    let payload = serde_json::json!({
        "session_id": session_id,
        "audio_data": base64::encode(dummy_audio),
        "format": "opus",
        "sample_rate": 16000,
        "channels": 1,
        "timestamp": chrono::Utc::now().timestamp_millis()
    });
    
    let response = client
        .post(&format!("{}/functions/v1/speech-to-text", supabase_url))
        .header("Authorization", format!("Bearer {}", jwt))
        .header("Content-Type", "application/json")
        .header("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY")
        .json(&payload)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        eprintln!("❌ Supabase error: {}", error_text);
        return Err(anyhow::anyhow!("Supabase request failed: {}", error_text));
    }
    
    Ok(())
}

pub fn stop() {
    println!("🛑 Stopping Windows audio capture...");
    CAPTURING.store(false, Ordering::Relaxed);
}
