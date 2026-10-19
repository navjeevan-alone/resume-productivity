import React, { useState } from 'react';
import { X,  Monitor, Volume2, VolumeX, Download, Upload,  Play, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AppSettings } from '../types.ts';
import { setWindowsAutoStart, isTauri, playGentleClick } from '../lib/desktop.ts';
import { exportDatabaseBackup, importDatabaseBackup, clearDatabase } from '../lib/storage.ts';
import { runAutomatedTestSuite, TestResult } from '../lib/selfTests.ts';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
  onDataReload: () => void;
  onTriggerShutdownModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onDataReload,
  onTriggerShutdownModal,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleToggleAutoStart = async () => {
    const nextVal = !localSettings.start_at_signin;
    await setWindowsAutoStart(nextVal);
    const updated = { ...localSettings, start_at_signin: nextVal };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleToggleSound = () => {
    const nextVal = !localSettings.sound_enabled;
    const updated = { ...localSettings, sound_enabled: nextVal };
    setLocalSettings(updated);
    onUpdateSettings(updated);
    if (nextVal) playGentleClick();
  };

  const handleToggleCompact = () => {
    const nextVal = !localSettings.compact_mode;
    const updated = { ...localSettings, compact_mode: nextVal };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleExport = () => {
    const jsonStr = exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        importDatabaseBackup(content);
        setImportMessage('Database imported successfully.');
        onDataReload();
      } catch {
        setImportMessage('Error importing file. Invalid backup format.');
      }
    };
    reader.readAsText(file);
  };

  const handleRunTests = () => {
    const results = runAutomatedTestSuite();
    setTestResults(results);
  };

  const handleConfirmClear = () => {
    clearDatabase();
    setShowClearConfirm(false);
    onDataReload();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn text-left">
      <div className="bg-[#151517] border border-[#27272A] rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor size={18} className="text-[#A78BFA]" />
            <h2 className="text-sm font-semibold text-white">Settings & Integration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white p-1 rounded hover:bg-[#1C1C1F] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-[#A1A1AA]">
          {/* Windows Startup Toggle */}
          <div className="bg-[#1C1C1F] border border-[#27272A] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>Start automatically at Windows sign-in</span>
                  {isTauri() && (
                    <span className="text-[10px] bg-[#4ADE80]/20 text-[#4ADE80] px-1.5 py-0.5 rounded font-mono">
                      Native Tauri
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#71717A] mt-1 max-w-sm">
                  Launches Resume in the background at sign-in so your unfinished task prompt is ready.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoStart}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  localSettings.start_at_signin ? 'bg-[#A78BFA]' : 'bg-[#27272A]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                    localSettings.start_at_signin ? 'transform translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
            <div className="mt-3 pt-2 border-t border-[#27272A] text-[11px] text-[#71717A] font-mono">
              Target location: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Resume.lnk
            </div>
          </div>

          {/* Laptop Shutdown Intercept & Checkpoint */}
          <div className="bg-[#1C1C1F] border border-[#27272A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>Laptop Shutdown / Wrap-Up Prompt</span>
                  <span className="text-[10px] bg-[#A78BFA]/20 text-[#A78BFA] px-1.5 py-0.2 rounded font-mono">
                    Win32 Hook
                  </span>
                </div>
                <p className="text-xs text-[#71717A] mt-1 max-w-sm">
                  Intercepts Windows shutdown to ask what was accomplished and your plan for the next boot.
                </p>
              </div>
              {onTriggerShutdownModal && (
                <button
                  onClick={() => {
                    onClose();
                    onTriggerShutdownModal();
                  }}
                  className="bg-white hover:bg-zinc-200 text-[#0C0C0D] font-medium px-3 py-1.5 rounded text-xs transition-colors cursor-pointer"
                >
                  Test Prompt
                </button>
              )}
            </div>
          </div>

          {/* Sound Feedback */}
          <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
            <div>
              <div className="text-sm font-semibold text-white">Subtle Sound Feedback</div>
              <p className="text-xs text-[#71717A]">
                Gentle mechanical click on action and completion chime on finish.
              </p>
            </div>
            <button
              onClick={handleToggleSound}
              className="p-2 rounded-lg bg-[#1C1C1F] border border-[#27272A] text-white hover:border-[#3F3F46] cursor-pointer"
            >
              {localSettings.sound_enabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-[#71717A]" />}
            </button>
          </div>

          {/* Compact Mode */}
          <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
            <div>
              <div className="text-sm font-semibold text-white">Compact Desktop Window Mode</div>
              <p className="text-xs text-[#71717A]">
                Constrains width to 480px, ideal for floating beside code editors or terminals.
              </p>
            </div>
            <button
              onClick={handleToggleCompact}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                localSettings.compact_mode
                  ? 'bg-white text-[#0C0C0D] border-white'
                  : 'bg-[#1C1C1F] text-white border-[#27272A]'
              }`}
            >
              {localSettings.compact_mode ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Verification Suite (Prompt Section 9) */}
          <div className="bg-[#1C1C1F] border border-[#27272A] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#4ADE80]" />
                <span className="text-sm font-semibold text-white">Automated Test Suite (13 Tests)</span>
              </div>
              <button
                onClick={handleRunTests}
                className="bg-white hover:bg-zinc-200 text-[#0C0C0D] font-medium px-3 py-1.5 rounded text-xs flex items-center gap-1 cursor-pointer"
              >
                <Play size={12} fill="#0C0C0D" />
                <span>Run Tests</span>
              </button>
            </div>
            <p className="text-xs text-[#71717A] mb-3">
              Direct verification of task creation, timer monotonic accumulation, single-session invariant, and interrupted session recovery.
            </p>

            {testResults && (
              <div className="max-h-40 overflow-y-auto space-y-1.5 border-t border-[#27272A] pt-2">
                {testResults.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="flex items-center gap-1.5 text-white truncate max-w-[320px]">
                      <CheckCircle2 size={12} className={t.passed ? 'text-[#4ADE80]' : 'text-[#F87171]'} />
                      <span>{t.id}. {t.name}</span>
                    </span>
                    <span className="font-mono text-[#71717A]">{t.durationMs}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Database Export & Import */}
          <div>
            <div className="text-sm font-semibold text-white mb-2">Local SQLite / JSON Storage</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="h-10 rounded-lg bg-[#1C1C1F] hover:bg-[#27272A] border border-[#27272A] text-white flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Download size={14} />
                <span>Export Backup</span>
              </button>

              <label className="h-10 rounded-lg bg-[#1C1C1F] hover:bg-[#27272A] border border-[#27272A] text-white flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer">
                <Upload size={14} />
                <span>Restore Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
            {importMessage && (
              <p className="text-xs text-[#4ADE80] mt-2">{importMessage}</p>
            )}
          </div>

          {/* Danger Zone */}
          <div className="pt-2 border-t border-[#27272A] flex items-center justify-between">
            <span className="text-xs text-[#71717A]">Reset local database</span>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[#F87171] hover:underline text-xs cursor-pointer"
            >
              Clear all data
            </button>
          </div>
        </div>
      </div>

      {/* Clear Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-60">
          <div className="bg-[#151517] border border-[#F87171]/40 rounded-xl p-5 max-w-sm w-full text-left">
            <h3 className="text-sm font-semibold text-white mb-2">Clear all local tasks & sessions?</h3>
            <p className="text-xs text-[#A1A1AA] mb-4">
              This will erase all tasks, checkpoints, and recorded session times from this device.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded text-xs text-[#A1A1AA] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-[#F87171] text-white"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
