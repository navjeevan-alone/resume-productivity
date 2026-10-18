/**
 * Resume — A Minimal Windows Productivity Utility
 * Built with Tauri 2 + React + TypeScript + Local-First Persistence
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Checkpoint, WorkSession, AppSettings, AppView, InterruptedSessionInfo } from './types.ts';
import {
  getTasks,
  getTask,
  createTask,
  completeTask,
  reopenTask,
  deleteTask,
  getLatestIncompleteTask,
  getCheckpoints,
  getLatestCheckpoint,
  createCheckpoint,
  getActiveSession,
  startSession,
  pauseSession,
  resumeSession,
  finishSession,
  recordSessionHeartbeat,
  checkForInterruptedSession,
  resolveInterruptedSession,
  getTotalSessionTimeForTask,
  getSettings,
  saveSettings,
} from './lib/storage.ts';
import { TitleBar } from './components/TitleBar.tsx';
import { WelcomeView } from './components/WelcomeView.tsx';
import { ActiveWorkView } from './components/ActiveWorkView.tsx';
import { TaskListModal } from './components/TaskListModal.tsx';
import { CheckpointModal } from './components/CheckpointModal.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { InterruptionModal } from './components/InterruptionModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [currentView, setCurrentView] = useState<AppView>('welcome');

  // Active Session & Task State
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [latestCheckpoint, setLatestCheckpoint] = useState<Checkpoint | null>(null);
  const [checkpointHistory, setCheckpointHistory] = useState<Checkpoint[]>([]);

  // Interruption Alert
  const [interruptedInfo, setInterruptedInfo] = useState<InterruptedSessionInfo | null>(null);

  // Modals
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(settings.compact_mode);

  // Load all repository data
  const loadData = useCallback(() => {
    const allTasks = getTasks();
    setTasks(allTasks);

    const session = getActiveSession();
    setActiveSession(session);

    if (session) {
      const task = getTask(session.task_id);
      setActiveTask(task);
      if (task) {
        const latest = getLatestCheckpoint(task.id);
        setLatestCheckpoint(latest);
        setCheckpointHistory(getCheckpoints(task.id));
      }
    } else {
      setActiveTask(null);
      setLatestCheckpoint(null);
      setCheckpointHistory([]);
    }

    // Check for sleep / interruption recovery
    const interruption = checkForInterruptedSession();
    if (interruption) {
      setInterruptedInfo(interruption);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived maps for rapid access
  const checkpointsMap = useMemo(() => {
    const map: Record<string, Checkpoint | null> = {};
    for (const t of tasks) {
      map[t.id] = getLatestCheckpoint(t.id);
    }
    return map;
  }, [tasks]);

  const totalTimeMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      map[t.id] = getTotalSessionTimeForTask(t.id);
    }
    return map;
  }, [tasks]);

  const incompleteTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'incomplete')
      .sort((a, b) => {
        const timeA = a.last_worked_at ? new Date(a.last_worked_at).getTime() : new Date(a.created_at).getTime();
        const timeB = b.last_worked_at ? new Date(b.last_worked_at).getTime() : new Date(b.created_at).getTime();
        return timeB - timeA;
      });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'completed')
      .sort((a, b) => {
        const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [tasks]);

  // Most recent incomplete task for the welcome view
  const lastIncompleteTask = useMemo(() => {
    return getLatestIncompleteTask();
  }, [tasks]);

  // Actions
  const handleStartOrResumeTask = (taskId: string) => {
    const session = startSession(taskId);
    setActiveSession(session);
    const task = getTask(taskId);
    setActiveTask(task);
    if (task) {
      setLatestCheckpoint(getLatestCheckpoint(task.id));
      setCheckpointHistory(getCheckpoints(task.id));
    }
    setCurrentView('active');
    loadData();
  };

  const handleCreateTask = (title: string) => {
    const newTask = createTask(title);
    handleStartOrResumeTask(newTask.id);
  };

  const handlePauseSession = () => {
    if (!activeSession) return;
    const paused = pauseSession(activeSession.id);
    setActiveSession(paused);
    loadData();
  };

  const handleResumeActiveSession = () => {
    if (!activeSession) return;
    const resumed = resumeSession(activeSession.id);
    setActiveSession(resumed);
    loadData();
  };

  const handleFinishTask = () => {
    if (!activeTask || !activeSession) return;
    completeTask(activeTask.id);
    setActiveSession(null);
    setActiveTask(null);
    setCurrentView('welcome');
    loadData();
  };

  const handleReopenTask = (taskId: string) => {
    reopenTask(taskId);
    loadData();
  };

  const handleDeleteTask = (taskId: string) => {
    if (activeTask?.id === taskId) {
      if (activeSession) finishSession(activeSession.id);
      setActiveSession(null);
      setActiveTask(null);
    }
    deleteTask(taskId);
    loadData();
  };

  const handleSaveCheckpoint = (completedWork: string, remainingWork: string, nextAction: string) => {
    if (!activeTask) return;
    const cp = createCheckpoint(activeTask.id, completedWork, remainingWork, nextAction);
    setLatestCheckpoint(cp);
    setCheckpointHistory(getCheckpoints(activeTask.id));
    setIsCheckpointModalOpen(false);
    loadData();
  };

  const handleQuickUpdateNextAction = (actionText: string) => {
    if (!activeTask) return;
    const existing = latestCheckpoint;
    const cp = createCheckpoint(
      activeTask.id,
      existing?.completed_work || '',
      existing?.remaining_work || '',
      actionText
    );
    setLatestCheckpoint(cp);
    setCheckpointHistory(getCheckpoints(activeTask.id));
    loadData();
  };

  const handleHeartbeat = (currentTotalSeconds: number) => {
    if (!activeSession) return;
    recordSessionHeartbeat(activeSession.id, currentTotalSeconds);
  };

  const handleResolveInterruption = (decision: 'conservative' | 'include_all' | 'discard_interval') => {
    if (!interruptedInfo) return;
    resolveInterruptedSession(interruptedInfo.session.id, decision);
    setInterruptedInfo(null);
    loadData();
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setIsCompact(newSettings.compact_mode);
    saveSettings(newSettings);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Space: toggle pause/resume or resume task
      if (e.code === 'Space') {
        e.preventDefault();
        if (currentView === 'active' && activeSession) {
          if (activeSession.status === 'paused') {
            handleResumeActiveSession();
          } else {
            handlePauseSession();
          }
        } else if (currentView === 'welcome' && lastIncompleteTask) {
          handleStartOrResumeTask(lastIncompleteTask.id);
        }
      }

      // Ctrl/Cmd + S: Save Checkpoint
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentView === 'active') {
          setIsCheckpointModalOpen(true);
        }
      }

      // Escape: Dismiss or back to welcome
      if (e.key === 'Escape') {
        if (isCheckpointModalOpen) {
          setIsCheckpointModalOpen(false);
        } else if (isSettingsModalOpen) {
          setIsSettingsModalOpen(false);
        } else if (currentView !== 'welcome' && currentView !== 'active') {
          setCurrentView(activeSession ? 'active' : 'welcome');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, activeSession, lastIncompleteTask, isCheckpointModalOpen, isSettingsModalOpen]);

  return (
    <div className="min-h-screen bg-[#0C0C0D] text-white flex flex-col items-center justify-start antialiased select-none font-sans">
      {/* Windows Desktop Container */}
      <div
        className={`w-full h-screen flex flex-col bg-[#0C0C0D] border-x border-b border-[#27272A] transition-all duration-200 ${
          isCompact ? 'max-w-md' : 'max-w-3xl'
        }`}
      >
        {/* TitleBar with Windows Controls */}
        <TitleBar
          currentView={currentView}
          setCurrentView={setCurrentView}
          isCompact={isCompact}
          setIsCompact={(val) => {
            setIsCompact(val);
            handleUpdateSettings({ ...settings, compact_mode: val });
          }}
          hasActiveSession={Boolean(activeSession && activeSession.status !== 'completed')}
          activeTaskTitle={activeTask?.title}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto flex flex-col justify-center relative">
          {/* View A: Welcome / Startup State */}
          {currentView === 'welcome' && (
            <WelcomeView
              lastTask={lastIncompleteTask}
              lastCheckpoint={lastIncompleteTask ? checkpointsMap[lastIncompleteTask.id] : null}
              totalTaskDuration={lastIncompleteTask ? totalTimeMap[lastIncompleteTask.id] || 0 : 0}
              onResume={handleStartOrResumeTask}
              onChooseAnother={() => setCurrentView('task_list')}
              onCreateTask={handleCreateTask}
              onDismiss={() => {
                if (activeSession) {
                  setCurrentView('active');
                }
              }}
              soundEnabled={settings.sound_enabled}
            />
          )}

          {/* View B: Active Work State */}
          {currentView === 'active' && activeTask && activeSession && (
            <ActiveWorkView
              task={activeTask}
              session={activeSession}
              latestCheckpoint={latestCheckpoint}
              checkpointHistory={checkpointHistory}
              onPause={handlePauseSession}
              onResume={handleResumeActiveSession}
              onOpenCheckpointModal={() => setIsCheckpointModalOpen(true)}
              onFinishTask={handleFinishTask}
              onSwitchTask={() => setCurrentView('task_list')}
              onQuickUpdateNextAction={handleQuickUpdateNextAction}
              onHeartbeat={handleHeartbeat}
              soundEnabled={settings.sound_enabled}
            />
          )}

          {/* View D: Task Selection (All Incomplete Tasks) */}
          {currentView === 'task_list' && (
            <TaskListModal
              tasks={incompleteTasks}
              checkpointsMap={checkpointsMap}
              totalTimeMap={totalTimeMap}
              activeTaskId={activeTask?.id}
              onResumeTask={handleStartOrResumeTask}
              onCreateTask={handleCreateTask}
              onCompleteTask={completeTask}
              onDeleteTask={handleDeleteTask}
              onClose={() => setCurrentView(activeSession ? 'active' : 'welcome')}
              soundEnabled={settings.sound_enabled}
            />
          )}

          {/* View E: Minimal History (Completed Tasks) */}
          {currentView === 'history' && (
            <HistoryModal
              completedTasks={completedTasks}
              checkpointsMap={checkpointsMap}
              totalTimeMap={totalTimeMap}
              onReopenTask={handleReopenTask}
              onDeleteTask={handleDeleteTask}
              onClose={() => setCurrentView(activeSession ? 'active' : 'welcome')}
              soundEnabled={settings.sound_enabled}
            />
          )}
        </main>
      </div>

      {/* Checkpoint Modal */}
      {isCheckpointModalOpen && activeTask && (
        <CheckpointModal
          taskTitle={activeTask.title}
          previousCheckpoint={latestCheckpoint}
          onSave={handleSaveCheckpoint}
          onCancel={() => setIsCheckpointModalOpen(false)}
          soundEnabled={settings.sound_enabled}
        />
      )}

      {/* Interrupted Session Recovery Modal (Part 2, Req 4) */}
      {interruptedInfo && (
        <InterruptionModal
          info={interruptedInfo}
          onResolve={handleResolveInterruption}
          soundEnabled={settings.sound_enabled}
        />
      )}

      {/* Settings & Self-Tests Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsModalOpen(false)}
          onDataReload={loadData}
        />
      )}
    </div>
  );
}
