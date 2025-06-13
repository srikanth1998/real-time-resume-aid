
# Native Helper

Cross‑platform desktop helper providing loop‑back audio capture
and stealth overlay hidden from screen‑sharing.

Build with Rust:
  * Windows: `cargo build --release --features windows`
  * macOS ≥14.4: `cargo build --release --features macos`
  * Linux: `cargo build --release`

Control API (HTTP localhost:4580):
  * `POST /start { "sessionId": "...", "jwt": "..." }`
  * `POST /stop`
  * `GET  /ping`
