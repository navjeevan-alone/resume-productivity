import React from 'react';
import { Minus, Square, X, PlayCircle, History, ListTodo, Settings, Monitor, Shrink, Expand } from 'lucide-react';
import { AppView } from '../types.ts';
import { minimizeWindow, maximizeWindow, closeWindow } from '../lib/desktop.ts';

interface TitleBarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  isCompact: boolean;
  setIsCompact: (compact: boolean) => void;
  hasActiveSession: boolean;
  activeTaskTitle?: string;
  onOpenSettings: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentView,
  setCurrentView,
  isCompact,
  setIsCompact,
  hasActiveSession,
  activeTaskTitle,
  onOpenSettings,
}) => {
  return (
    <header className="h-10 bg-[#0C0C0D] border-b border-[#27272A] flex items-center justify-between px-3 select-none z-50 text-xs text-[#A1A1AA]">
      {/* App brand & icon */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-[#1C1C1F] border border-[#27272A] flex items-center justify-center text-[#A78BFA] font-bold text-[11px] shadow-sm">
          R
        </div>
        <span className="font-semibold text-white tracking-tight">Resume</span>
        
        {/* Active task pill */}
        {hasActiveSession && activeTaskTitle && (
          <button
            onClick={() => setCurrentView('active')}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1C1C1F] border border-[#27272A] text-xs text-white max-w-[200px] truncate hover:border-[#A78BFA] transition-colors"
            title="Jump to active session"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse"></span>
            <span className="truncate">{activeTaskTitle}</span>
          </button>
        )}
      </div>

      {/* Center navigation shortcuts */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentView(hasActiveSession ? 'active' : 'welcome')}
          className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
            currentView === 'welcome' || currentView === 'active'
              ? 'bg-[#1C1C1F] text-white border border-[#27272A]'
              : 'hover:text-white hover:bg-[#151517]'
          }`}
          title="Startup & Session view"
        >
          <PlayCircle size={14} className={hasActiveSession ? "text-[#4ADE80]" : "text-[#A78BFA]"} />
          <span className="hidden md:inline">{hasActiveSession ? 'Active Session' : 'Startup'}</span>
        </button>

        <button
          onClick={() => setCurrentView('task_list')}
          className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
            currentView === 'task_list'
              ? 'bg-[#1C1C1F] text-white border border-[#27272A]'
              : 'hover:text-white hover:bg-[#151517]'
          }`}
          title="All incomplete tasks"
        >
          <ListTodo size={14} />
          <span className="hidden md:inline">Tasks</span>
        </button>

        <button
          onClick={() => setCurrentView('history')}
          className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
            currentView === 'history'
              ? 'bg-[#1C1C1F] text-white border border-[#27272A]'
              : 'hover:text-white hover:bg-[#151517]'
          }`}
          title="Completed tasks history"
        >
          <History size={14} />
          <span className="hidden md:inline">History</span>
        </button>
      </div>

      {/* Right controls: Compact toggle, Settings, Windows buttons */}
      <div className="flex items-center gap-1">
     
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded hover:bg-[#1C1C1F] hover:text-white text-[#71717A] transition-colors"
          title="Settings & Diagnostics"
        >
          <Settings size={13} />
        </button>
 
      </div>
    </header>
  );
};
