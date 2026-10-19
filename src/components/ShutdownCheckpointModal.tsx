import React, { useState } from 'react';
import { Power, ArrowRight,  CheckCircle2, Clock } from 'lucide-react';
import { Task, Checkpoint } from '../types.ts';
import { allowWindowsShutdown, playGentleClick } from '../lib/desktop.ts';

interface ShutdownCheckpointModalProps {
  task: Task | null;
  latestCheckpoint: Checkpoint | null;
  sessionDuration: number;
  onSaveAndProceed: (completedWork: string, nextAction: string) => void;
  onDismissAndProceed: () => void;
  soundEnabled: boolean;
}

export const ShutdownCheckpointModal: React.FC<ShutdownCheckpointModalProps> = ({
  task,
  latestCheckpoint,
  sessionDuration,
  onSaveAndProceed,
  onDismissAndProceed,
  soundEnabled,
}) => {
  const [completedWork, setCompletedWork] = useState(latestCheckpoint?.completed_work || '');
  const [nextAction, setNextAction] = useState(latestCheckpoint?.next_action || '');

  const formatDuration = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '0m';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playGentleClick();
    onSaveAndProceed(completedWork, nextAction);
    allowWindowsShutdown();
  };

  const handleDismiss = () => {
    if (soundEnabled) playGentleClick();
    onDismissAndProceed();
    allowWindowsShutdown();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn text-left">
      <div className="bg-[#151517] border-2 border-[#A78BFA] rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        {/* Urgent/Intentional Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#A78BFA]/15 border border-[#A78BFA]/40 flex items-center justify-center text-[#A78BFA]">
            <Power size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Laptop Shutdown / Wrap-Up Detected</h2>
            <p className="text-xs text-[#A1A1AA]">
              Capture your plan now so you start intentionally next time you boot up.
            </p>
          </div>
        </div>

        {task && (
          <div className="bg-[#1C1C1F] border border-[#27272A] rounded-lg p-3 mb-4 text-xs">
            <div className="flex items-center justify-between text-[#71717A] mb-1">
              <span>Task in progress</span>
              <span className="flex items-center gap-1 text-white font-mono">
                <Clock size={11} />
                {formatDuration(sessionDuration)} logged
              </span>
            </div>
            <div className="text-sm font-semibold text-white">{task.title}</div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Next action field - highlighted */}
          <div>
            <label className="block text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Next Action (What should you do first when laptop restarts?)</span>
              <span className="text-[10px] text-[#A1A1AA] lowercase font-normal">primary resumption cue</span>
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Continue writing tests for checkout module"
              className="w-full bg-[#0C0C0D] border border-[#A78BFA] text-white placeholder-[#71717A] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none"
              autoFocus
            />
          </div>

          {/* Accomplished field */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              What was accomplished before stopping?
            </label>
            <textarea
              value={completedWork}
              onChange={(e) => setCompletedWork(e.target.value)}
              placeholder="e.g. Finished the database migration and endpoint handler."
              rows={2}
              className="w-full bg-[#0C0C0D] border border-[#27272A] text-white placeholder-[#71717A] rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#A78BFA] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#27272A]">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-[#71717A] hover:text-white transition-colors cursor-pointer"
            >
              Skip & Shutdown now
            </button>

            <button
              type="submit"
              className="bg-white hover:bg-zinc-200 text-[#0C0C0D] font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <CheckCircle2 size={14} />
              <span>Save & Complete Shutdown</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
