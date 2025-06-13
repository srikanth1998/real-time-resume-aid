
//! Native helper main
mod web;
mod capture;
mod overlay;
use anyhow::Result;
use web::Command;

#[tokio::main]
async fn main() -> Result<()> {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Command>();
    web::ControlServer::start(tx)?;

    while let Some(cmd) = rx.recv().await {
        match cmd {
            Command::Start { session_id, jwt } => {
                tokio::spawn(capture::run(session_id.clone(), jwt.clone()));
                tokio::spawn(async { overlay::run().unwrap(); });
            }
            Command::Stop => {
                capture::stop();
                overlay::stop();
            }
        }
    }
    Ok(())
}
