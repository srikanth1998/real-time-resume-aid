use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};
use warp::Filter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayMessage {
    pub message_type: String,
    pub content: String,
    pub position: Option<OverlayPosition>,
    pub duration: Option<u64>, // Duration in milliseconds
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayPosition {
    pub x: i32,
    pub y: i32,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Clone)]
pub struct OverlayServer {
    sender: broadcast::Sender<OverlayMessage>,
    active_messages: Arc<Mutex<Vec<OverlayMessage>>>,
}

impl OverlayServer {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(100);
        let active_messages = Arc::new(Mutex::new(Vec::new()));
        
        Self {
            sender,
            active_messages,
        }
    }

    pub async fn start(&self, port: u16) -> Result<()> {
        let sender = self.sender.clone();
        let active_messages = self.active_messages.clone();

        // WebSocket endpoint for real-time overlay updates
        let ws_route = warp::path("overlay")
            .and(warp::ws())
            .and(warp::any().map(move || sender.clone()))
            .map(|ws: warp::ws::Ws, sender| {
                ws.on_upgrade(move |websocket| handle_websocket(websocket, sender))
            });

        // HTTP endpoint to send messages to overlay
        let send_message = warp::path("overlay")
            .and(warp::path("message"))
            .and(warp::post())
            .and(warp::body::json())
            .and(warp::any().map(move || sender.clone()))
            .and(warp::any().map(move || active_messages.clone()))
            .and_then(handle_send_message);

        // HTTP endpoint to get active messages
        let get_messages = warp::path("overlay")
            .and(warp::path("messages"))
            .and(warp::get())
            .and(warp::any().map(move || active_messages.clone()))
            .and_then(handle_get_messages);

        let cors = warp::cors()
            .allow_any_origin()
            .allow_headers(vec!["content-type"])
            .allow_methods(vec!["GET", "POST", "OPTIONS"]);

        let routes = ws_route
            .or(send_message)
            .or(get_messages)
            .with(cors);

        println!("🖥️ Overlay server starting on port {}", port);
        warp::serve(routes).run(([127, 0, 0, 1], port)).await;
        
        Ok(())
    }

    pub async fn send_message(&self, message: OverlayMessage) -> Result<()> {
        // Add to active messages if it has a duration
        if message.duration.is_some() {
            let mut messages = self.active_messages.lock().await;
            messages.push(message.clone());
        }

        // Broadcast to all connected clients
        let _ = self.sender.send(message);
        Ok(())
    }
}

async fn handle_websocket(
    websocket: warp::ws::WebSocket,
    sender: broadcast::Sender<OverlayMessage>,
) {
    let mut receiver = sender.subscribe();
    let (ws_sender, mut ws_receiver) = websocket.split();
    
    // Forward messages from broadcast to WebSocket
    let sender_task = tokio::spawn(async move {
        while let Ok(message) = receiver.recv().await {
            if let Ok(json) = serde_json::to_string(&message) {
                if ws_sender.send(warp::ws::Message::text(json)).await.is_err() {
                    break;
                }
            }
        }
    });

    // Handle incoming WebSocket messages (for acknowledgments, etc.)
    let receiver_task = tokio::spawn(async move {
        while let Some(result) = ws_receiver.next().await {
            match result {
                Ok(msg) => {
                    if msg.is_close() {
                        break;
                    }
                    // Handle incoming messages if needed
                    println!("📨 Received overlay message: {:?}", msg);
                }
                Err(e) => {
                    println!("❌ WebSocket error: {}", e);
                    break;
                }
            }
        }
    });

    // Wait for either task to complete
    tokio::select! {
        _ = sender_task => {},
        _ = receiver_task => {},
    }
}

async fn handle_send_message(
    message: OverlayMessage,
    sender: broadcast::Sender<OverlayMessage>,
    active_messages: Arc<Mutex<Vec<OverlayMessage>>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Add to active messages if it has a duration
    if message.duration.is_some() {
        let mut messages = active_messages.lock().await;
        messages.push(message.clone());
        
        // Clean up expired messages
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        messages.retain(|msg| {
            msg.duration.map_or(true, |duration| {
                // This is simplified - in practice you'd track creation time
                duration > 1000 // Keep for demo
            })
        });
    }

    // Broadcast message
    let _ = sender.send(message);
    
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "Overlay message sent"
    })))
}

async fn handle_get_messages(
    active_messages: Arc<Mutex<Vec<OverlayMessage>>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let messages = active_messages.lock().await;
    Ok(warp::reply::json(&*messages))
}

use futures_util::{SinkExt, StreamExt};