import React, { useState, useEffect } from 'react';
import { Play, Pause, BookmarkPlus, CheckCircle2, ArrowLeftRight, Edit3, Check, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Task, Checkpoint, WorkSession } from '../types.ts';
import { playGentleClick, playCompletionChime } from '../lib/desktop.ts';

interface ActiveWorkViewProps {
  task: Task;
  session: WorkSession;
  latestCheckpoint: Checkpoint | null;
  checkpointHistory: Checkpoint[];
  onPause: () => void;
  onResume: () => void;
  onOpenCheckpointModal: () => void;
  onFinishTask: () => void;
  onSwitchTask: () => void;
  onQuickUpdateNextAction: (actionText: string) => void;
  onHeartbeat: (currentSeconds: number) => void;
  soundEnabled: boolean;
}

export const ActiveWorkView: React.FC<ActiveWorkViewProps> = ({
  task,
  session,
  latestCheckpoint,
  checkpointHistory,
  onPause,
  onResume,
  onOpenCheckpointModal,
  onFinishTask,
  onSwitchTask,
  onQuickUpdateNextAction,
  onHeartbeat,
  soundEnabled,
}) => {
  // Authoritative elapsed calculation using monotonic / wall-clock delta
  const [displaySeconds, setDisplaySeconds] = useState<number>(session.duration_seconds);
  const [isEditingNextAction, setIsEditingNextAction] = useState<boolean>(false);
  const [quickNextAction, setQuickNextAction] = useState<string>(latestCheckpoint?.next_action || '');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState<boolean>(false);

  const isPaused = session.status === 'paused';

  // Keep quickNextAction in sync with checkpoint updates
  useEffect(() => {
    setQuickNextAction(latestCheckpoint?.next_action || '');
  }, [latestCheckpoint?.next_action]);

  // Master monotonic timer loop
  useEffect(() => {
    const updateTimer = () => {
      if (session.status === 'active' && session.last_resumed_at) {
        const lastResumedTime = new Date(session.last_resumed_at).getTime();
        const now = Date.now();
        const deltaSeconds = Math.max(0, Math.floor((now - lastResumedTime) / 1000));
        const currentTotal = session.duration_seconds + deltaSeconds;
        setDisplaySeconds(currentTotal);
      } else {
        setDisplaySeconds(session.duration_seconds);
      }
    };

    updateTimer();

    // Check timer every 250ms for smooth display
    const timerInterval = window.setInterval(updateTimer, 250);

    // Heartbeat every 5 seconds to persist progress and catch unexpected computer sleeps
    const heartbeatInterval = window.setInterval(() => {
      if (session.status === 'active' && session.last_resumed_at) {
        const lastResumedTime = new Date(session.last_resumed_at).getTime();
        const deltaSeconds = Math.max(0, Math.floor((Date.now() - lastResumedTime) / 1000));
        onHeartbeat(session.duration_seconds + deltaSeconds);
      }
    }, 5000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(heartbeatInterval);
    };
  }, [session.status, session.last_resumed_at, session.duration_seconds, onHeartbeat]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const handleTogglePause = () => {
    if (soundEnabled) playGentleClick();
    if (isPaused) {
      onResume();
    } else {
      onPause();
    }
  };

  const handleSaveQuickAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickNextAction.trim()) {
      onQuickUpdateNextAction(quickNextAction.trim());
      setIsEditingNextAction(false);
      if (soundEnabled) playGentleClick();
    }
  };

  const handleConfirmFinish = () => {
    if (soundEnabled) playCompletionChime();
    setShowFinishConfirm(false);
    onFinishTask();
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 max-w-xl mx-auto w-full animate-fadeIn text-left">
      {/* Top Status & Context */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between text-xs text-[#71717A] mb-1.5">
          <span className="uppercase tracking-wider font-semibold">Currently working on</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isPaused ? 'bg-[#FBBF24]' : 'bg-[#4ADE80] animate-pulse'
              }`}
            />
            <span className={isPaused ? 'text-[#FBBF24] font-medium' : 'text-[#4ADE80] font-medium'}>
              {isPaused ? 'Paused' : 'Active Session'}
            </span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
          {task.title}
        </h1>
      </div>

      {/* Main Work Card */}
      <div className="w-full bg-[#151517] border border-[#27272A] rounded-xl p-6 mb-5 relative transition-all">
        {/* Next Action Box */}
        <div className="bg-[#1C1C1F] border border-[#27272A] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#A78BFA] font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
              Next action
            </span>
            {!isEditingNextAction && (
              <button
                onClick={() => setIsEditingNextAction(true)}
                className="text-xs text-[#71717A] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title="Edit next action"
              >
                <Edit3 size={12} />
                <span>Change</span>
              </button>
            )}
          </div>

          {isEditingNextAction ? (
            <form onSubmit={handleSaveQuickAction} className="flex gap-2 mt-2">
              <input
                type="text"
                value={quickNextAction}
                onChange={(e) => setQuickNextAction(e.target.value)}
                placeholder="What exactly are you doing next?"
                className="flex-1 bg-[#0C0C0D] border border-[#A78BFA] text-white text-sm rounded px-3 py-1.5 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="bg-white hover:bg-zinc-200 text-[#0C0C0D] px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check size={13} />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickNextAction(latestCheckpoint?.next_action || '');
                  setIsEditingNextAction(false);
                }}
                className="text-[#71717A] hover:text-white px-2 py-1.5 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <p className="text-sm sm:text-base text-white font-medium leading-relaxed">
              {latestCheckpoint?.next_action ? (
                latestCheckpoint.next_action
              ) : (
                <span className="text-[#71717A] italic font-normal">
                  Click 'Change' or 'Save Checkpoint' to declare your next micro-action.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Big Monospace Timer */}
        <div className="text-center py-4 mb-6 border-y border-[#27272A]/70">
          <div className="text-xs text-[#71717A] uppercase tracking-widest font-mono mb-1">
            Session Time
          </div>
          <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-white select-all">
            {formatTimer(displaySeconds)}
          </div>
          <div className="text-[11px] text-[#71717A] mt-1 font-mono">
            {isPaused ? 'Timer suspended • Press Space to resume' : 'Tracking declared work session'}
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
          {/* Pause / Resume Button */}
          <button
            onClick={handleTogglePause}
            className={`h-11 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isPaused
                ? 'bg-white text-[#0C0C0D] hover:bg-zinc-200 shadow-sm'
                : 'bg-[#1C1C1F] hover:bg-[#27272A] text-white border border-[#27272A]'
            }`}
          >
            {isPaused ? (
              <>
                <Play size={16} fill="#0C0C0D" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause size={16} />
                <span>Pause</span>
              </>
            )}
            <kbd className="text-[10px] bg-[#27272A] text-[#A1A1AA] px-1.5 py-0.5 rounded font-mono ml-0.5">
              Space
            </kbd>
          </button>

          {/* Save Checkpoint Button */}
          <button
            onClick={onOpenCheckpointModal}
            className="h-11 px-4 rounded-lg font-medium text-sm bg-[#1C1C1F] hover:bg-[#27272A] text-white border border-[#27272A] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            title="Save manual checkpoint"
          >
            <BookmarkPlus size={16} className="text-[#A78BFA]" />
            <span>Checkpoint</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-[#27272A] text-[#A1A1AA] px-1 py-0.5 rounded font-mono">
              Ctrl+S
            </kbd>
          </button>

          {/* Finish Task Button */}
          <button
            onClick={() => setShowFinishConfirm(true)}
            className="h-11 px-4 rounded-lg font-medium text-sm bg-transparent hover:bg-[#1C1C1F] text-[#4ADE80] border border-[#27272A] hover:border-[#4ADE80]/50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Finish Task</span>
          </button>
        </div>

        {/* Secondary: Switch Task */}
        <div className="pt-2 flex items-center justify-between text-xs text-[#71717A]">
          <button
            onClick={onSwitchTask}
            className="flex items-center gap-1.5 text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeftRight size={13} />
            <span>Switch Task (preserves session)</span>
          </button>

          {checkpointHistory.length > 0 && (
            <button
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className="flex items-center gap-1 text-[#71717A] hover:text-white transition-colors cursor-pointer"
            >
              <History size={12} />
              <span>{checkpointHistory.length} checkpoints</span>
              {showHistoryDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Checkpoint History Drawer */}
      {showHistoryDrawer && checkpointHistory.length > 0 && (
        <div className="w-full bg-[#151517] border border-[#27272A] rounded-xl p-4 mb-4 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-[#A1A1AA] font-semibold border-b border-[#27272A] pb-2">
            <span>Previous Checkpoints for this task</span>
            <span>{checkpointHistory.length} total</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {checkpointHistory.map((cp, idx) => (
              <div key={cp.id} className="bg-[#0C0C0D] border border-[#27272A] p-2.5 rounded-lg text-left">
                <div className="flex items-center justify-between text-[#71717A] mb-1">
                  <span className="font-mono text-[10px]">Checkpoint #{checkpointHistory.length - idx}</span>
                  <span className="text-[10px]">
                    {new Date(cp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {cp.next_action && (
                  <div className="text-white font-medium mb-1">
                    <span className="text-[#A78BFA]">Next:</span> {cp.next_action}
                  </div>
                )}
                {cp.completed_work && (
                  <div className="text-[#A1A1AA]">
                    <span className="text-[#71717A]">Accomplished:</span> {cp.completed_work}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finish Confirmation Dialog */}
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#151517] border border-[#27272A] rounded-xl p-5 max-w-sm w-full text-left shadow-2xl animate-scaleIn">
            <h3 className="text-base font-semibold text-white mb-2">Finish this task?</h3>
            <p className="text-sm text-[#A1A1AA] mb-4">
              This will complete the task <span className="text-white font-medium">"{task.title}"</span>, save the total session duration ({formatTimer(displaySeconds)}), and return you to startup.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1F] cursor-pointer"
              >
                Continue Working
              </button>
              <button
                onClick={handleConfirmFinish}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#4ADE80] text-[#0C0C0D] hover:bg-[#22c55e] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Yes, Complete Task</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
