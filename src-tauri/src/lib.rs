#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  println!("Starting Tauri application...");
  
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        println!("Debug mode enabled");
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      println!("Application setup completed");
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
