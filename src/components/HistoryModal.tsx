import React from 'react';
import {  Clock, Calendar, CheckCircle2, RotateCcw, X, Trash2 } from 'lucide-react';
import { Task, Checkpoint } from '../types.ts';
import { playGentleClick } from '../lib/desktop.ts';

interface HistoryModalProps {
  completedTasks: Task[];
  checkpointsMap: Record<string, Checkpoint | null>;
  totalTimeMap: Record<string, number>;
  onReopenTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onClose: () => void;
  soundEnabled: boolean;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  completedTasks,
  checkpointsMap,
  totalTimeMap,
  onReopenTask,
  onDeleteTask,
  onClose,
  soundEnabled,
}) => {
  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '0m';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col p-6 sm:p-8 max-w-2xl mx-auto w-full animate-fadeIn text-left">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#151517] border border-[#27272A] flex items-center justify-center text-[#4ADE80]">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Completed Tasks</h1>
            <p className="text-xs text-[#A1A1AA]">A quiet record of finished work.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#71717A] hover:text-white p-2 rounded-lg hover:bg-[#1C1C1F] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
        {completedTasks.length === 0 ? (
          <div className="bg-[#151517] border border-[#27272A] rounded-xl p-8 text-center text-[#A1A1AA] text-sm">
            No completed tasks yet. Finish a task in the active session to see it here.
          </div>
        ) : (
          completedTasks.map((task) => {
            const checkpoint = checkpointsMap[task.id];
            const duration = totalTimeMap[task.id] || 0;

            return (
              <div
                key={task.id}
                className="bg-[#151517] border border-[#27272A] rounded-xl p-4 transition-all hover:border-[#3F3F46]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={16} className="text-[#4ADE80] shrink-0" />
                      <h3 className="font-semibold text-white text-base truncate">
                        {task.title}
                      </h3>
                    </div>

                    {checkpoint?.completed_work && (
                      <p className="text-xs text-[#A1A1AA] line-clamp-2 mt-1">
                        <span className="text-[#71717A]">Accomplished:</span> {checkpoint.completed_work}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (soundEnabled) playGentleClick();
                      onReopenTask(task.id);
                    }}
                    className="shrink-0 bg-transparent hover:bg-[#1C1C1F] text-[#A1A1AA] hover:text-white border border-[#27272A] px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Re-open task to active state"
                  >
                    <RotateCcw size={12} />
                    <span>Reopen</span>
                  </button>
                </div>

                <div className="pt-2 mt-2 border-t border-[#27272A]/70 flex items-center justify-between text-xs text-[#71717A]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      <span className="text-white font-medium">{formatDuration(duration)}</span> total time
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      <span>Finished: {formatDate(task.completed_at)}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-[#71717A] hover:text-[#F87171] p-1 rounded hover:bg-[#1C1C1F] transition-colors cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
