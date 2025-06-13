
pub async fn run(session_id: String, jwt: String) {
    #[cfg(target_os="windows")]
    crate::capture::win::run(session_id, jwt).await;
    #[cfg(target_os="macos")]
    crate::capture::mac::run(session_id, jwt).await;
    #[cfg(target_os="linux")]
    crate::capture::linux::run(session_id, jwt).await;
}
pub fn stop() {}
#[cfg(target_os="windows")] pub mod win;
#[cfg(target_os="macos")] pub mod mac;
#[cfg(target_os="linux")] pub mod linux;
