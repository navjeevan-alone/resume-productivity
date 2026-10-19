import React, { useState } from 'react';
import { Play, ListOrdered, Plus, ArrowRight, Clock,   X } from 'lucide-react';
import { Task, Checkpoint } from '../types.ts';
import { playGentleClick } from '../lib/desktop.ts';

interface WelcomeViewProps {
  lastTask: Task | null;
  lastCheckpoint: Checkpoint | null;
  totalTaskDuration: number;
  onResume: (taskId: string) => void;
  onChooseAnother: () => void;
  onCreateTask: (title: string) => void;
  onDismiss: () => void;
  soundEnabled: boolean;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  lastTask,
  lastCheckpoint,
  totalTaskDuration,
  onResume,
  onChooseAnother,
  onCreateTask,
  onDismiss,
  soundEnabled,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const formatDuration = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '0m';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setError('Please enter a task title');
      return;
    }
    if (soundEnabled) playGentleClick();
    onCreateTask(newTaskTitle.trim());
    setNewTaskTitle('');
    setIsCreating(false);
    setError(null);
  };

  const handleResume = () => {
    if (!lastTask) return;
    if (soundEnabled) playGentleClick();
    onResume(lastTask.id);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 max-w-xl mx-auto w-full animate-fadeIn">
      {/* Gentle Header */}
      <div className="w-full text-left mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
          Welcome back.
        </h1>
        <p className="text-sm text-[#A1A1AA]">
          Start intentionally. Pick up exactly where you left off.
        </p>
      </div>

      {lastTask ? (
        /* Last Task Card */
        <div className="w-full bg-[#151517] border border-[#27272A] rounded-xl p-5 mb-6 text-left relative overflow-hidden transition-all hover:border-[#3F3F46]">
          {/* Subtle accent indicator */}
          <div className="absolute top-0 left-0 w-1 h-full bg-[#A78BFA]" />

          <div className="flex items-center justify-between text-xs text-[#71717A] mb-2">
            <span className="uppercase tracking-wider font-semibold">
              Last active task
            </span>
            {totalTaskDuration > 0 && (
              <span className="flex items-center gap-1 text-[#A1A1AA]">
                <Clock size={12} />
                <span>{formatDuration(totalTaskDuration)} logged</span>
              </span>
            )}
          </div>

          <h2 className="text-lg font-semibold text-white tracking-tight mb-3">
            {lastTask.title}
          </h2>

          {/* Next Action Highlight */}
          <div className="bg-[#1C1C1F] border border-[#27272A] rounded-lg p-3.5 mb-2">
            <div className="text-xs text-[#A78BFA] font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
              Next action
            </div>
            <p className="text-sm text-[#FFFFFF] leading-relaxed">
              {lastCheckpoint?.next_action
                ? lastCheckpoint.next_action
                : "No specific next action declared. Start and define your immediate step."}
            </p>
          </div>

          {lastCheckpoint?.remaining_work && (
            <p className="text-xs text-[#71717A] mt-2 line-clamp-1">
              <span className="text-[#A1A1AA]">Unfinished:</span>{" "}
              {lastCheckpoint.remaining_work}
            </p>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={handleResume}
              className="flex-1 py-2 bg-white hover:bg-zinc-200 text-[#0C0C0D] font-medium h-10 px-5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer shadow-sm"
              autoFocus>
              <Play size={16} fill="#0C0C0D" />
              <span>Resume Task</span>
              <kbd className="hidden sm:inline-block text-[10px] bg-zinc-300 text-zinc-800 px-1.5 py-0.5 rounded font-mono ml-1">
                Space
              </kbd>
            </button>

            <button
              onClick={onChooseAnother}
              className="bg-transparent hover:bg-[#1C1C1F] text-white border border-[#27272A] font-medium h-10 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer">
              <ListOrdered size={15} className="text-[#A1A1AA]" />
              <span>Choose Another Task</span>
            </button>

            <button
              onClick={() => setIsCreating(true)}
              className="bg-transparent hover:bg-[#1C1C1F] text-[#A1A1AA] hover:text-white border border-[#27272A] font-medium h-10 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer"
              title="Create a new task">
              <Plus size={16} />
              <span className="sm:hidden">New Task</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="w-full bg-[#151517] border border-[#27272A] rounded-xl p-8 mb-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#1C1C1F] border border-[#27272A] flex items-center justify-center text-[#A78BFA] mx-auto mb-3">
            <Plus size={20} />
          </div>
          <h2 className="text-base font-semibold text-white mb-1">
            No tasks in progress
          </h2>
          <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto mb-4">
            Resume helps you focus on one clear task at a time. Enter what you
            want to work on today.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-white hover:bg-zinc-200 text-[#0C0C0D] font-medium h-10 px-6 rounded-lg text-sm inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer">
            <Plus size={16} />
            <span>Create First Task</span>
          </button>
        </div>
      )}

      {/* Inline New Task Creator Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          className="w-full bg-[#151517] border border-[#A78BFA] rounded-xl p-4 mb-4 text-left transition-all">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="new-task-input"
              className="text-xs font-semibold text-white uppercase tracking-wider">
              New Task Title
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setError(null);
              }}
              className="text-[#71717A] hover:text-white p-1">
              <X size={14} />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              id="new-task-input"
              type="text"
              value={newTaskTitle}
              onChange={(e) => {
                setNewTaskTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Implement input validation"
              className="flex-1 bg-[#0C0C0D] border border-[#27272A] text-white placeholder-[#71717A] rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#A78BFA]"
              autoFocus
            />
            <button
              type="submit"
              className="bg-white hover:bg-zinc-200 text-[#0C0C0D] font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer">
              <span>Start</span>
              <ArrowRight size={14} />
            </button>
          </div>
          {error && <p className="text-xs text-[#F87171] mt-2">{error}</p>}
        </form>
      )}

      {/* Dismiss / Close Note */}
      <div className="flex items-center justify-between w-full text-xs text-[#71717A] px-1">
        <span>
          Press{" "}
          <kbd className="bg-[#1C1C1F] border border-[#27272A] px-1 rounded text-[11px] text-[#A1A1AA]">
            Esc
          </kbd>{" "}
          or dismiss anytime
        </span>
        <button
          onClick={onDismiss}
          className="hover:text-white transition-colors underline cursor-pointer">
          Dismiss window
        </button>
      </div>
    </div>
  );
};
