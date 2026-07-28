//! Hanzo desktop starter — the smallest complete Tauri v2 core: two commands,
//! one window, no plugins. Everything a fork adds hangs off `run()`.

use serde::Serialize;

#[derive(Serialize)]
pub struct Env {
    os: String,
    arch: String,
    family: String,
    cores: usize,
    tauri: String,
}

/// Host facts the webview cannot know. The web build answers the same shape
/// from `navigator`, which is why the UI never branches.
#[tauri::command]
fn app_env() -> Env {
    Env {
        os: std::env::consts::OS.into(),
        arch: std::env::consts::ARCH.into(),
        family: std::env::consts::FAMILY.into(),
        cores: std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1),
        tauri: tauri::VERSION.into(),
    }
}

/// FNV-1a, byte for byte the same as the fallback in `src/web.ts` — a command
/// round-trip you can verify rather than trust.
#[tauri::command]
fn digest(text: String) -> String {
    let mut h: u32 = 0x811c_9dc5;
    for b in text.as_bytes() {
        h ^= *b as u32;
        h = h.wrapping_mul(0x0100_0193);
    }
    format!("fnv1a:{h:08x}")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_env, digest])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
