# Resume — Windows Packaging, Startup & Shutdown Guide

This guide explains how to package **Resume** into `.exe` (NSIS) and `.msi` (WiX) installers, configure it to run automatically on Windows boot, and intercept Windows shutdown to capture your current task status and next action.

---

## 1. Prerequisites on Windows

Before running the build command on your Windows machine, ensure you have:

1. **Rust & Cargo**:
   - Install via [rustup.rs](https://rustup.rs/) (choose 64-bit MSVC).
2. **Visual Studio C++ Build Tools**:
   - Install "Desktop development with C++" workload via the Visual Studio Installer.
3. **Node.js & npm / pnpm**:
   - Node 18+ or 20+.
4. **WebView2 Runtime**:
   - Pre-installed on Windows 10 and 11 by default.
5. **WiX Toolset (for `.msi` installer only)**:
   - Download and install WiX v3.11 or run in PowerShell:
     ```powershell
     winget install WiX.WiX
     ```

---

## 2. Generating `.exe` and `.msi` Installers

In your project root:

### A. Generate both `.exe` and `.msi`
```powershell
npm run build
npm run build:desktop
```
*(or using npx: `npx @tauri-apps/cli build`)*

### B. Generate `.exe` (NSIS Installer) only:
```powershell
npm run build:exe
```
The resulting installer is saved at:
`src-tauri/target/release/bundle/nsis/Resume_0.1.0_x64-setup.exe`

### C. Generate `.msi` (Windows Installer) only:
```powershell
npm run build:msi
```
The resulting installer is saved at:
`src-tauri/target/release/bundle/msi/Resume_0.1.0_x64_en-US.msi`

---

## 3. How Automatic Startup on Laptop Boot Works

When enabled, Resume opens automatically upon Windows sign-in with your last active task ready to resume.

### Mechanism 1: Native Tauri Autostart Plugin
Tauri uses `tauri-plugin-autostart`, which writes an entry in:
`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
- **Key Name**: `Resume`
- **Value**: `"C:\Users\<YourUser>\AppData\Local\Programs\Resume\Resume.exe" --autostart`

### Mechanism 2: Windows Startup Folder (No registry modification)
You can also place a shortcut directly in the Windows Startup directory:
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Resume.lnk`

To toggle this in the app:
- Open **Settings** (gear icon) -> Toggle **"Start automatically at Windows sign-in"**.

---

## 4. How the Laptop Shutdown Intercept Works

When you ask Windows to shut down or restart, Windows broadcasts two Win32 messages:
1. `WM_QUERYENDSESSION`: "Are apps ready to close?"
2. `WM_ENDSESSION`: "The session is terminating."

### In Resume (`src-tauri/src/lib.rs`):
1. **Blocking Reason**:
   Resume registers `ShutdownBlockReasonCreate(hwnd, reason)` with Windows:
   *"Resume: Please save your task status and next action before shutting down."*
   Windows will show Resume on the "Closing apps and shutting down" screen and bring the window to the foreground.
2. **Event Emission**:
   Tauri emits the event `windows-shutdown-requested` to the React frontend.
3. **Frontend Modal**:
   The **"Laptop Shutdown / Wrap-Up Detected"** dialog prompts you:
   - **Next Action**: What exactly should you do first when you turn the laptop back on?
   - **Accomplished**: What did you finish during this session?
4. **Unblocking Shutdown**:
   When you click **"Save & Complete Shutdown"** (or **"Skip"**), Resume:
   - Persists the checkpoint and session time to local storage.
   - Calls `ShutdownBlockReasonDestroy(hwnd)` via the Tauri command `allow_windows_shutdown`.
   - Closes cleanly so Windows finishes shutting down.
