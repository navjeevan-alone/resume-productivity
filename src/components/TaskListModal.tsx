import React, { useState } from 'react';
import { Play, Plus, CheckCircle2, Trash2, Clock, Calendar,   X } from 'lucide-react';
import { Task, Checkpoint } from '../types.ts';
import { playGentleClick } from '../lib/desktop.ts';

interface TaskListModalProps {
  tasks: Task[];
  checkpointsMap: Record<string, Checkpoint | null>;
  totalTimeMap: Record<string, number>;
  activeTaskId?: string;
  onResumeTask: (taskId: string) => void;
  onCreateTask: (title: string) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onClose: () => void;
  soundEnabled: boolean;
}

export const TaskListModal: React.FC<TaskListModalProps> = ({
  tasks,
  checkpointsMap,
  totalTimeMap,
  activeTaskId,
  onResumeTask,
  onCreateTask,
  onCompleteTask,
  onDeleteTask,
  onClose,
  soundEnabled,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '0m';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Not yet started';
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Task title cannot be empty.');
      return;
    }
    if (soundEnabled) playGentleClick();
    onCreateTask(newTitle.trim());
    setNewTitle('');
    setError(null);
  };

  return (
    <div className="flex flex-col p-6 sm:p-8 max-w-2xl mx-auto w-full animate-fadeIn text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Choose a Task</h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Select an unfinished task or begin something new.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[#71717A] hover:text-white p-2 rounded-lg hover:bg-[#1C1C1F] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Quick Create Input */}
      <form onSubmit={handleCreateSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="New task title... (press Enter to create and start)"
            className="flex-1 bg-[#151517] border border-[#27272A] text-white placeholder-[#71717A] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#A78BFA] transition-colors"
          />
          <button
            type="submit"
            className="bg-white hover:bg-zinc-200 text-[#0C0C0D] font-medium px-4 py-2.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
        {error && <p className="text-xs text-[#F87171] mt-1.5">{error}</p>}
      </form>

      {/* Task List */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="bg-[#151517] border border-[#27272A] rounded-xl p-8 text-center text-[#A1A1AA] text-sm">
            No active tasks. Create a task above to begin.
          </div>
        ) : (
          tasks.map((task) => {
            const checkpoint = checkpointsMap[task.id];
            const duration = totalTimeMap[task.id] || 0;
            const isActive = task.id === activeTaskId;

            return (
              <div
                key={task.id}
                className={`bg-[#151517] border rounded-xl p-4 transition-all ${
                  isActive
                    ? 'border-[#A78BFA] bg-[#151517]'
                    : 'border-[#27272A] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-base truncate">
                        {task.title}
                      </h3>
                      {isActive && (
                        <span className="text-[10px] bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/40 px-1.5 py-0.5 rounded font-medium">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Next Action */}
                    {checkpoint?.next_action ? (
                      <p className="text-xs text-[#A1A1AA] flex items-baseline gap-1.5 line-clamp-2">
                        <span className="text-[#A78BFA] font-medium shrink-0">Next:</span>
                        <span className="text-white">{checkpoint.next_action}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-[#71717A] italic">No next action recorded</p>
                    )}
                  </div>

                  {/* Quick Action Button */}
                  <button
                    onClick={() => {
                      if (soundEnabled) playGentleClick();
                      onResumeTask(task.id);
                    }}
                    className="shrink-0 bg-white hover:bg-zinc-200 text-[#0C0C0D] font-medium px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Play size={13} fill="#0C0C0D" />
                    <span>{isActive ? 'Continue' : 'Resume'}</span>
                  </button>
                </div>

                {/* Footer metadata & secondary actions */}
                <div className="pt-2.5 mt-2 border-t border-[#27272A]/70 flex items-center justify-between text-xs text-[#71717A]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{formatDuration(duration)}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 truncate max-w-[140px] sm:max-w-none">
                      <Calendar size={11} />
                      <span>Last worked: {formatDate(task.last_worked_at)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onCompleteTask(task.id)}
                      className="p-1 text-[#71717A] hover:text-[#4ADE80] transition-colors rounded hover:bg-[#1C1C1F] cursor-pointer"
                      title="Mark task completed"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-[#71717A] hover:text-[#F87171] transition-colors rounded hover:bg-[#1C1C1F] cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
