
use anyhow::Result;
#[cfg(target_os="windows")] pub mod win;
#[cfg(target_os="macos")] pub mod mac;

pub fn run() -> Result<()> {
    #[cfg(target_os="windows")] crate::overlay::win::run()?;
    #[cfg(target_os="macos")] crate::overlay::mac::run()?;
    Ok(())
}
pub fn stop() {}
