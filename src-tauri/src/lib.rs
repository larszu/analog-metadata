// Shared entry point used by desktop (main.rs) and the mobile targets Tauri 2
// generates. The web UI in ../dist carries all the app logic; the native shell
// provides the window, the file-system dialog and OS integration.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running Analog Metadata");
}
