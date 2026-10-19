# Resume

> **A minimal, local-first Windows productivity utility built to solve task initiation, continuity, and intentional work.**

[![Stack](https://img.shields.io/badge/Stack-Tauri%202%20%7C%20React%2019%20%7C%20Rust-0C0C0D?style=flat-square)](#technical-architecture)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2B%20%28x64%29-151517?style=flat-square)](#windows-packaging--msi-distribution)
[![Offline](https://img.shields.io/badge/Architecture-Offline%20First%20%7C%20No%20Telemetry-4ADE80?style=flat-square)](#data-integrity--privacy)
[![License](https://img.shields.io/badge/License-Apache--2.0-A78BFA?style=flat-square)](#license)

---

## 1. Philosophy: Why We Built This

### The Problem
Most knowledge workers do not struggle with the ability to code or think; they struggle with **task initiation** and **task continuity**.

The failure mode looks like this:
1. You open your laptop in the morning without a declared micro-objective.
2. Because entering an open-ended cognitive state is uncomfortable, your brain defaults to low-friction dopamine sinks: email, chat, news, browser tabs.
3. When you finally sit down to work on yesterday's project, you spend 15–20 minutes paying the **context reconstruction tax**—re-reading files, inspecting git diffs, trying to remember what on earth was broken before you walked away.
4. When you leave or shut down your laptop, you close the lid without recording where you stopped, guaranteeing that tomorrow's initiation will be just as painful.

### The Problem With Productivity Apps
Commercial task managers and time trackers exacerbate this:
- **Project Bloat:** Endless hierarchies of workspaces, projects, tags, epics, sub-subtasks, and Kanban boards that turn planning into a chore.
- **Performative Logging:** Elaborate daily reports, retrospective forms, and long text fields that feel like homework.
- **Gamification & Guilt:** Streaks, badges, and analytics graphs that penalize you for taking a walk or thinking away from the keyboard.
- **Cloud Dependency:** Mandatory sign-in, remote telemetry, network latency, and vendor lock-in.

### The Governing Principle
> **Every feature must directly support intentional task initiation, task continuity, reliable time tracking, or data integrity. If it does not, leave it out.**

- **A checkpoint is a resumption aid, not a report-writing exercise.** It takes 10 seconds to write.
- **The next action is sacred.** When you sit down, you shouldn't have to decide *what* to do. The answer should be waiting on your screen.
- **The timer measures declared work, not moral concentration.** It uses monotonic time accounting, protects your sleep intervals, and respects reality.

---

## 2. Core Experience

```text
 ┌────────────────────────────────────────────────────────┐
 │ Resume                                         ─  □  × │
 ├────────────────────────────────────────────────────────┤
 │                                                        │
 │   Welcome back.                                        │
 │   Start intentionally. Pick up where you left off.     │
 │                                                        │
 │   ┌────────────────────────────────────────────────┐   │
 │   │ LAST ACTIVE TASK                               │   │
 │   │ Build AI learning app                          │   │
 │   │                                                │   │
 │   │ ● NEXT ACTION                                  │   │
 │   │ Complete input validation on email and auth.   │   │
 │   │                                                │   │
 │   │ [ Resume Task (Space) ]  [ Choose Another ]    │   │
 │   └────────────────────────────────────────────────┘   │
 │                                                        │
 └────────────────────────────────────────────────────────┘
```

### A. The Startup Gate (`WelcomeView`)
When Windows boots or you log in, Resume presents a quiet, compact prompt showing:
1. The most recently active incomplete task.
2. The exact **Next Action** you declared when you last stopped.
3. A primary **[Resume Task]** action (triggerable with `Space`).

Resuming creates a work session immediately—no clicks, no browsing menus.

### B. The Active Session (`ActiveWorkView`)
- **Focused Monospace Timer (`HH:MM:SS`):** Driven by monotonic wall-clock delta calculation. It cannot drift or stall when the UI background-throttles.
- **Instant Next Action:** Displayed prominently with 1-click inline editing.
- **Frictionless Controls:** `Pause` (`Space`), `Save Checkpoint` (`Ctrl+S`), `Finish Task`, `Switch Task`.
- **Checkpoint History Drawer:** One-click review of your previous notes on this task.

### C. The 3-Field Checkpoint (`CheckpointModal`)
No markdown documents, no endless fields:
1. **Next action:** What exactly should I do first when I return? *(Highlighted as primary resumption cue)*
2. **Completed work:** What did I accomplish?
3. **Remaining work:** What is unfinished?

All fields are optional. Next action is emphasized.

### D. Laptop Shutdown Intercept (`ShutdownCheckpointModal`)
When you initiate a Windows shutdown or restart:
- Resume captures Windows `WM_QUERYENDSESSION`.
- Calls the Win32 API `ShutdownBlockReasonCreate`.
- Brings Resume to the front and asks:
  - *What was accomplished?*
  - *What is the plan when you next open your laptop?*
- Once saved or skipped, it unblocks Windows (`ShutdownBlockReasonDestroy`) and cleanly powers off.

### E. Conservative Interrupted Session Recovery
If your computer enters sleep, hibernates, or crashes during an active session:
- Resume detects the heartbeat gap (>90s).
- Prompts with **Conservative Recovery**: keeps your verified declared work time and safely discards uncertain sleep/idle hours.

---

## 3. Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    REACT 19 FRONTEND (Vite)                     │
│  WelcomeView │ ActiveWorkView │ TaskList │ History │ Checkpoint │
│                     Design: index-0.in Tokens                   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                     Desktop Bridge (desktop.ts)
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼                                                 ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│       TAURI 2 (RUST)         │        │    BROWSER / PREVIEW         │
│  - WM_QUERYENDSESSION Hook   │        │  - Storage: Relational       │
│  - ShutdownBlockReasonCreate │        │    localStorage schema       │
│  - tauri-plugin-autostart    │        │  - AudioContext chimes       │
│  - Native window controls    │        │  - JSON Backup/Restore       │
│  - NSIS / WiX packaging      │        │  - Automated Test Runner     │
└──────────────────────────────┘        └──────────────────────────────┘
```

### Stack & Decisions
| Layer | Choice | Rationale |
|---|---|---|
| **Shell** | **Tauri 2 (Rust)** | Native Windows binaries (~10MB vs ~180MB Electron), instant startup, zero background bloat, native Win32 hooks. |
| **Frontend** | **React 19 + TypeScript** | Declarative state, high type safety, fast component lifecycles. |
| **Styling** | **Tailwind CSS v4** | Dark-first `#0C0C0D` design system adhering strictly to `index-0.in` tokens. Minimal borders, zero pill clutter. |
| **Persistence** | **Local-First Relational** | Normalized tables (`tasks`, `checkpoints`, `sessions`, `settings`) with zero cloud telemetry. |
| **Time Accounting** | **Monotonic Clock Delta** | Measures declared time using wall-clock anchors; immune to interval timer drift and CPU throttling. |

### Win32 Shutdown Hook Details
In `src-tauri/src/lib.rs`:
```rust
// Registers Windows shutdown delay
ShutdownBlockReasonCreate(hwnd, "Resume: Please save your task status and next action before shutting down.");

// Emits event to frontend modal
window.emit("windows-shutdown-requested", ());

// Once checkpoint is written, frontend invokes allow_windows_shutdown
ShutdownBlockReasonDestroy(hwnd);
app.exit(0);
```

---

## 4. Windows Packaging & MSI Distribution

Resume is pre-configured to bundle into both **NSIS (`.exe`)** and **WiX (`.msi`)** installers.

### Prerequisites on Windows:
1. **Rust**: [rustup.rs](https://rustup.rs/) (default MSVC toolchain).
2. **Visual Studio C++ Build Tools**: Check *"Desktop development with C++"*.
3. **WiX Toolset (v3.11)** for `.msi`:
   ```powershell
   winget install WiX.WiX
   ```

### Building Installers:

```powershell
# 1. Install dependencies and build client assets
npm install
npm run build

# 2. Build both .exe and .msi
npm run build:desktop

# Or build individually:
npm run build:exe   # Produces NSIS standalone installer (.exe)
npm run build:msi   # Produces enterprise Windows Installer (.msi)
```

### Artifact Outputs:
- **MSI Installer**: `src-tauri/target/release/bundle/msi/Resume_0.1.0_x64_en-US.msi`
- **EXE Installer**: `src-tauri/target/release/bundle/nsis/Resume_0.1.0_x64-setup.exe`

### MSI Enterprise Deployment:
For enterprise silent deployment:
```powershell
msiexec /i Resume_0.1.0_x64_en-US.msi /qn /norestart
```

---

## 5. Automated Verification Suite (13 Core Tests)

Part 2, Section 9 of the specification mandates strict automated validation. Resume includes an in-app and programmatic test runner (`src/lib/selfTests.ts`) testing 13 deterministic requirements:

1. `Creating a task`
2. `Rejecting empty / whitespace task title`
3. `Saving and retrieving a checkpoint`
4. `Retrieving latest checkpoint in chronological order`
5. `Starting a session with zero duration`
6. `Pausing and resuming without resetting elapsed duration`
7. `Accumulating elapsed time with monotonic clock calculation`
8. `Preventing simultaneous active sessions (auto-pauses previous)`
9. `Finishing task and completing active session`
10. `Detecting interrupted sessions after heartbeat gap`
11. `Excluding uncertain sleep or shutdown time from work calculations`
12. `Persisting state across application restarts`
13. `Handling database/storage error with safe fallback and notification`

Run them directly inside the app: **Settings** → **"Run Tests"**.

---

## 6. Future Capabilities (Roadmap)

While preserving the core rule of zero bloat, the following low-overhead capabilities are planned:

### 1. Embedded SQLite Driver (`tauri-plugin-sql`)
- Transition the storage repository to write to an actual on-disk SQLite file at:
  `%LOCALAPPDATA%\Resume\resume.db`
- Enable easy schema migrations and direct SQL queryability from external tools like DBeaver or SQLite CLI.

### 2. Global Hotkey & System Tray Daemon
- Quick toggle hotkey: `Win + Alt + R` or `Ctrl + Shift + Space` to summon/hide the compact utility instantly over whatever you are doing.
- Silent minimization to the Windows System Notification Area (Tray) with session time badge.

### 3. Git Branch & Working Directory Auto-Context
- Optional capability to detect the active Git branch and uncommitted file count in a declared workspace folder when saving a checkpoint.
- Automatically prepopulates: *"Completed work: 4 commits on feat/auth"* without requiring manual typing.

### 4. Windows Focus Assist / Do Not Disturb Sync
- Automatically engage Windows Focus Assist (Alarms Only) when a session is active.
- Restore normal notification priority when a session is paused or finished.

### 5. Floating Micro-HUD (Picture-in-Picture)
- A pin-to-top, 180×40px micro-bar showing only `[Task Name] [00:24:18] [Pause]`, designed to float unobtrusively in the corner of secondary monitors.

---

## 7. Data Integrity & Privacy

- **100% Offline:** No network requests, analytics, cookies, or external trackers.
- **Zero Telemetry:** Your task titles, work checkpoints, and durations never leave your machine.
- **Export & Portability:** One-click full JSON database backup and restore in Settings.

---

## License

Apache-2.0