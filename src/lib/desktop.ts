/**
 * Desktop integration bridge for Tauri 2 and Windows.
 * Follows Tauri application build guidelines:
 * - Browser-safe fallback without breaking bundler when not in Tauri environment
 * - Isolates native calls
 * - Clean interface for window control and autostart
 */

interface TauriWindow {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: Record<string, unknown>;
    __TAURI__?: {
      window?: {
        getCurrentWindow: () => TauriWindow;
      };
      core?: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
    };
  }
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

export async function minimizeWindow(): Promise<void> {
  if (typeof window !== 'undefined' && window.__TAURI__?.window?.getCurrentWindow) {
    try {
      await window.__TAURI__.window.getCurrentWindow().minimize();
      return;
    } catch (e) {
      console.warn('Failed to minimize window in Tauri:', e);
    }
  }
  console.log('[Desktop] Minimize requested (desktop/browser preview)');
}

export async function maximizeWindow(): Promise<void> {
  if (typeof window !== 'undefined' && window.__TAURI__?.window?.getCurrentWindow) {
    try {
      await window.__TAURI__.window.getCurrentWindow().toggleMaximize();
      return;
    } catch (e) {
      console.warn('Failed to toggle maximize in Tauri:', e);
    }
  }
  console.log('[Desktop] Maximize/Restore requested (desktop/browser preview)');
}

export async function closeWindow(): Promise<void> {
  if (typeof window !== 'undefined' && window.__TAURI__?.window?.getCurrentWindow) {
    try {
      await window.__TAURI__.window.getCurrentWindow().close();
      return;
    } catch (e) {
      console.warn('Failed to close window in Tauri:', e);
    }
  }
  console.log('[Desktop] Close/Hide requested (desktop/browser preview)');
}

export async function setWindowsAutoStart(enable: boolean): Promise<boolean> {
  if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
    try {
      await window.__TAURI__.core.invoke(enable ? 'plugin:autostart|enable' : 'plugin:autostart|disable');
      return true;
    } catch (e) {
      console.warn('Auto-start plugin error:', e);
      return false;
    }
  }
  // In portable / web preview mode, preference is saved in local storage
  return true;
}

export function playGentleClick(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  } catch {
    // AudioContext might be blocked until user gesture, ignore safely
  }
}

export function playCompletionChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const now = audioCtx.currentTime;
    
    // Pleasant two-tone chime
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    const gain2 = audioCtx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.05, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.05, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch {
    // Ignore audio errors
  }
}
