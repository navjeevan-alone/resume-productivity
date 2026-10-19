use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager, WindowEvent};

static SHUTDOWN_CONFIRMED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn allow_windows_shutdown(app: tauri::AppHandle) -> Result<(), String> {
    SHUTDOWN_CONFIRMED.store(true, Ordering::SeqCst);

    #[cfg(windows)]
    {
        // If ShutdownBlockReasonCreate was registered on Windows, destroy it now
        if let Some(main_window) = app.get_webview_window("main") {
            if let Ok(hwnd) = main_window.hwnd() {
                unsafe {
                    use windows_sys::Win32::System::Shutdown::ShutdownBlockReasonDestroy;
                    ShutdownBlockReasonDestroy(hwnd.0 as _);
                }
            }
        }
    }

    // Exit application to allow Windows shutdown to finish
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ));
    }

    builder
        .invoke_handler(tauri::generate_handler![allow_windows_shutdown])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // If shutdown/close was not explicitly confirmed with a checkpoint,
                // intercept and present the shutdown checkpoint prompt
                if !SHUTDOWN_CONFIRMED.load(Ordering::SeqCst) {
                    api.prevent_close();

                    #[cfg(windows)]
                    {
                        if let Ok(hwnd) = window.hwnd() {
                            unsafe {
                                use windows_sys::Win32::System::Shutdown::ShutdownBlockReasonCreate;
                                let reason = "Resume: Please save your task status and next action before shutting down.\0"
                                    .encode_utf16()
                                    .collect::<Vec<u16>>();
                                ShutdownBlockReasonCreate(hwnd.0 as _, reason.as_ptr());
                            }
                        }
                    }

                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    let _ = window.emit("windows-shutdown-requested", ());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running resume desktop application");
}
