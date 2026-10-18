import React from 'react';
import { AlertTriangle, ShieldCheck, PlusCircle, Trash2 } from 'lucide-react';
import { InterruptedSessionInfo } from '../types.ts';
import { playGentleClick } from '../lib/desktop.ts';

interface InterruptionModalProps {
  info: InterruptedSessionInfo;
  onResolve: (decision: 'conservative' | 'include_all' | 'discard_interval') => void;
  soundEnabled: boolean;
}

export const InterruptionModal: React.FC<InterruptionModalProps> = ({
  info,
  onResolve,
  soundEnabled,
}) => {
  const formatGap = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs} hour${hrs > 1 ? 's' : ''} ${mins % 60} min`;
    }
    return `${mins} minutes`;
  };

  const formatDeclaredTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };

  const handleDecision = (decision: 'conservative' | 'include_all' | 'discard_interval') => {
    if (soundEnabled) playGentleClick();
    onResolve(decision);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn text-left">
      <div className="bg-[#151517] border border-[#27272A] rounded-xl max-w-lg w-full p-6 shadow-2xl">
        {/* Warning Icon & Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Interrupted Session Detected</h2>
            <p className="text-xs text-[#A1A1AA]">
              Your computer slept, was turned off, or the app closed unexpectedly.
            </p>
          </div>
        </div>

        {/* Task & Gap Context */}
        <div className="bg-[#1C1C1F] border border-[#27272A] rounded-lg p-3.5 mb-5 space-y-1.5 text-xs">
          <div className="text-white font-medium flex justify-between">
            <span>Task:</span>
            <span className="text-[#A78BFA]">{info.task.title}</span>
          </div>
          <div className="text-[#A1A1AA] flex justify-between">
            <span>Recorded active work before interruption:</span>
            <span className="text-white font-mono">{formatDeclaredTime(info.session.duration_seconds)}</span>
          </div>
          <div className="text-[#A1A1AA] flex justify-between">
            <span>Unrecorded suspension interval:</span>
            <span className="text-[#F59E0B] font-mono font-medium">~{formatGap(info.unrecordedSeconds)}</span>
          </div>
        </div>

        <p className="text-xs text-[#A1A1AA] mb-4">
          How would you like to account for the unrecorded interval?
        </p>

        {/* 3 Choices */}
        <div className="space-y-2.5">
          {/* Conservative Choice (Default & Recommended) */}
          <button
            onClick={() => handleDecision('conservative')}
            className="w-full bg-[#1C1C1F] hover:bg-[#27272A] border border-[#A78BFA] p-3.5 rounded-lg flex items-start gap-3 transition-colors cursor-pointer text-left group"
          >
            <ShieldCheck size={18} className="text-[#A78BFA] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Conservative Recovery</span>
                <span className="text-[10px] bg-[#A78BFA]/20 text-[#A78BFA] px-1.5 py-0.2 rounded font-medium">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Keep the recorded time ({formatDeclaredTime(info.session.duration_seconds)}) and exclude the sleep/idle interval.
              </p>
            </div>
          </button>

          {/* Include All Interval */}
          <button
            onClick={() => handleDecision('include_all')}
            className="w-full bg-[#151517] hover:bg-[#1C1C1F] border border-[#27272A] p-3.5 rounded-lg flex items-start gap-3 transition-colors cursor-pointer text-left"
          >
            <PlusCircle size={18} className="text-[#4ADE80] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white">Count Entire Interval</div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                I was working offline during the entire {formatGap(info.unrecordedSeconds)} interval. Add it to the session.
              </p>
            </div>
          </button>

          {/* Discard Session */}
          <button
            onClick={() => handleDecision('discard_interval')}
            className="w-full bg-[#151517] hover:bg-[#1C1C1F] border border-[#27272A] p-3 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-xs text-[#71717A] hover:text-[#F87171]"
          >
            <span>Discard unrecorded interval and pause session</span>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
