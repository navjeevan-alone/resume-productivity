import React, { useState } from 'react';
import { X, BookmarkPlus, ArrowRight } from 'lucide-react';
import { Checkpoint } from '../types.ts';
import { playGentleClick } from '../lib/desktop.ts';

interface CheckpointModalProps {
  taskTitle: string;
  previousCheckpoint: Checkpoint | null;
  onSave: (completedWork: string, remainingWork: string, nextAction: string) => void;
  onCancel: () => void;
  soundEnabled: boolean;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({
  taskTitle,
  previousCheckpoint,
  onSave,
  onCancel,
  soundEnabled,
}) => {
  const [completedWork, setCompletedWork] = useState(previousCheckpoint?.completed_work || '');
  const [remainingWork, setRemainingWork] = useState(previousCheckpoint?.remaining_work || '');
  const [nextAction, setNextAction] = useState(previousCheckpoint?.next_action || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playGentleClick();
    onSave(completedWork, remainingWork, nextAction);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#151517] border border-[#27272A] rounded-xl max-w-lg w-full text-left shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkPlus size={18} className="text-[#A78BFA]" />
            <div>
              <h2 className="text-sm font-semibold text-white">Save Checkpoint</h2>
              <p className="text-xs text-[#71717A] truncate max-w-xs">{taskTitle}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[#71717A] hover:text-white p-1 rounded hover:bg-[#1C1C1F] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Checkpoints preserve your exact mental context so you can return without friction. All fields are optional.
          </p>

          {/* Field 3 placed at the top or highlighted as primary resumption cue: Next Action */}
          <div>
            <label className="block text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>3. Next action (What should I do first when I return?)</span>
              <span className="text-[10px] text-[#A1A1AA] lowercase font-normal">primary resumption cue</span>
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Validate the email field and display inline errors"
              className="w-full bg-[#0C0C0D] border border-[#A78BFA]/60 text-white placeholder-[#71717A] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#A78BFA] transition-colors"
              autoFocus
            />
          </div>

          {/* Field 1: Completed work */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              1. Completed work (What did I accomplish?)
            </label>
            <textarea
              value={completedWork}
              onChange={(e) => setCompletedWork(e.target.value)}
              placeholder="e.g. Implemented the signup form UI and basic layout."
              rows={2}
              className="w-full bg-[#0C0C0D] border border-[#27272A] text-white placeholder-[#71717A] rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#A78BFA] transition-colors resize-none"
            />
          </div>

          {/* Field 2: Remaining work */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              2. Remaining work (What is unfinished?)
            </label>
            <textarea
              value={remainingWork}
              onChange={(e) => setRemainingWork(e.target.value)}
              placeholder="e.g. Input validation and error message styling."
              rows={2}
              className="w-full bg-[#0C0C0D] border border-[#27272A] text-white placeholder-[#71717A] rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#A78BFA] transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1F] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-white text-[#0C0C0D] hover:bg-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Save Checkpoint</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
