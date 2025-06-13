
use warp::{Filter};
use serde::Deserialize;
use anyhow::Result;

#[derive(Debug)]
pub enum Command {
    Start { session_id: String, jwt: String },
    Stop,
}

#[derive(Deserialize)]
pub struct StartPayload { sessionId: String, jwt: String }

pub struct ControlServer;
impl ControlServer {
    pub fn start(tx: tokio::sync::mpsc::UnboundedSender<Command>) -> Result<()> {
        let start_tx = tx.clone();
        let start = warp::path("start").and(warp::post()).and(warp::body::json()).map(move |body: StartPayload| {
            start_tx.send(Command::Start{session_id: body.sessionId.clone(), jwt: body.jwt.clone()}).unwrap();
            "ok"
        });
        let stop_tx = tx.clone();
        let stop = warp::path("stop").and(warp::post()).map(move || {
            stop_tx.send(Command::Stop).unwrap();
            "stopped"
        });
        let ping = warp::path("ping").map(|| "ok");

        tokio::spawn(async move {
            warp::serve(start.or(stop).or(ping)).run(([127,0,0,1], 4580)).await;
        });
        Ok(())
    }
}
