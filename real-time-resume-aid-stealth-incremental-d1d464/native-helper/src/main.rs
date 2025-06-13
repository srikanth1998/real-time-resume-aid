
//! Native helper main
mod web;
mod capture;
mod overlay;
mod overlay_server;
use anyhow::Result;
use web::Command;
use overlay_server::OverlayServer;

#[tokio::main]
async fn main() -> Result<()> {
    println!("🚀 Starting Rust Native Helper v1.0.0");
    
    // Start overlay WebSocket server on port 8765
    let overlay_server = OverlayServer::new();
    let overlay_clone = overlay_server.clone();
    tokio::spawn(async move {
        if let Err(e) = overlay_clone.start(8765).await {
            eprintln!("❌ Overlay server error: {}", e);
        }
    });

    // Start main control server on port 4580
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Command>();
    web::ControlServer::start(tx)?;

    println!("✅ Native helper ready - listening on:");
    println!("   • Control API: http://localhost:4580");
    println!("   • Overlay WebSocket: ws://localhost:8765");

    while let Some(cmd) = rx.recv().await {
        match cmd {
            Command::Start { session_id, jwt } => {
                println!("▶️ Starting capture and overlay for session: {}", session_id);
                tokio::spawn(capture::run(session_id.clone(), jwt.clone()));
                tokio::spawn(async { 
                    if let Err(e) = overlay::run() {
                        eprintln!("❌ Overlay error: {}", e);
                    }
                });
            }
            Command::Stop => {
                println!("⏹️ Stopping capture and overlay");
                capture::stop();
                overlay::stop();
            }
        }
    }
    Ok(())
}
