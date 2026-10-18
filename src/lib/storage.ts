import { Task, Checkpoint, WorkSession, AppSettings, InterruptedSessionInfo } from '../types.ts';

const STORAGE_KEYS = {
  TASKS: 'resume_db_tasks',
  CHECKPOINTS: 'resume_db_checkpoints',
  SESSIONS: 'resume_db_sessions',
  SETTINGS: 'resume_db_settings',
};

// Default fallback settings
const DEFAULT_SETTINGS: AppSettings = {
  start_at_signin: true,
  sound_enabled: true,
  compact_mode: false,
  last_heartbeat: null,
  last_active_task_id: null,
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// Low-level safe storage access
function readJSON<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[Storage] Failed to read key: ${key}`, err);
    return defaultValue;
  }
}

function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[Storage] Failed to write key: ${key}`, err);
  }
}

// ==========================================
// TASKS REPOSITORY
// ==========================================

export function getTasks(): Task[] {
  initializeDatabaseIfEmpty();
  return readJSON<Task[]>(STORAGE_KEYS.TASKS, []);
}

export function getTask(id: string): Task | null {
  const tasks = getTasks();
  return tasks.find(t => t.id === id) || null;
}

export function createTask(title: string): Task {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error('Task title cannot be empty.');
  }

  const now = new Date().toISOString();
  const newTask: Task = {
    id: generateId(),
    title: trimmedTitle,
    status: 'incomplete',
    created_at: now,
    updated_at: now,
    last_worked_at: null,
    completed_at: null,
  };

  const tasks = getTasks();
  tasks.unshift(newTask);
  writeJSON(STORAGE_KEYS.TASKS, tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error(`Task with id ${id} not found.`);
  }

  if (updates.title !== undefined && !updates.title.trim()) {
    throw new Error('Task title cannot be empty or whitespace.');
  }

  const updated: Task = {
    ...tasks[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  tasks[index] = updated;
  writeJSON(STORAGE_KEYS.TASKS, tasks);
  return updated;
}

export function completeTask(id: string): Task {
  // If an active session exists for this task, finish it first
  const activeSession = getActiveSession();
  if (activeSession && activeSession.task_id === id) {
    finishSession(activeSession.id);
  }

  const now = new Date().toISOString();
  return updateTask(id, {
    status: 'completed',
    completed_at: now,
  });
}

export function reopenTask(id: string): Task {
  return updateTask(id, {
    status: 'incomplete',
    completed_at: null,
  });
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter(t => t.id !== id);
  writeJSON(STORAGE_KEYS.TASKS, tasks);

  // Clean up associated checkpoints and sessions
  const checkpoints = getCheckpoints().filter(c => c.task_id !== id);
  writeJSON(STORAGE_KEYS.CHECKPOINTS, checkpoints);

  const sessions = getSessions().filter(s => s.task_id !== id);
  writeJSON(STORAGE_KEYS.SESSIONS, sessions);
}

/**
 * Returns the most recently active incomplete task
 */
export function getLatestIncompleteTask(): Task | null {
  const tasks = getTasks().filter(t => t.status === 'incomplete');
  if (tasks.length === 0) return null;

  // Sort by last_worked_at desc, then updated_at desc
  return tasks.sort((a, b) => {
    const timeA = a.last_worked_at ? new Date(a.last_worked_at).getTime() : new Date(a.created_at).getTime();
    const timeB = b.last_worked_at ? new Date(b.last_worked_at).getTime() : new Date(b.created_at).getTime();
    return timeB - timeA;
  })[0];
}

// ==========================================
// CHECKPOINTS REPOSITORY
// ==========================================

export function getCheckpoints(taskId?: string): Checkpoint[] {
  const all = readJSON<Checkpoint[]>(STORAGE_KEYS.CHECKPOINTS, []);
  if (!taskId) return all;
  return all
    .filter(c => c.task_id === taskId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getLatestCheckpoint(taskId: string): Checkpoint | null {
  const forTask = getCheckpoints(taskId);
  return forTask.length > 0 ? forTask[0] : null;
}

export function createCheckpoint(
  taskId: string,
  completedWork: string,
  remainingWork: string,
  nextAction: string
): Checkpoint {
  const task = getTask(taskId);
  if (!task) {
    throw new Error(`Cannot create checkpoint for non-existent task ${taskId}`);
  }

  const now = new Date().toISOString();
  const checkpoint: Checkpoint = {
    id: generateId(),
    task_id: taskId,
    completed_work: completedWork.trim(),
    remaining_work: remainingWork.trim(),
    next_action: nextAction.trim(),
    created_at: now,
  };

  const all = getCheckpoints();
  all.unshift(checkpoint);
  writeJSON(STORAGE_KEYS.CHECKPOINTS, all);

  // Also update task's updated_at
  updateTask(taskId, {});

  return checkpoint;
}

// ==========================================
// SESSIONS & TIMER REPOSITORY
// ==========================================

export function getSessions(): WorkSession[] {
  return readJSON<WorkSession[]>(STORAGE_KEYS.SESSIONS, []);
}

export function getActiveSession(): WorkSession | null {
  const sessions = getSessions();
  return sessions.find(s => s.status === 'active' || s.status === 'paused') || null;
}

export function startSession(taskId: string): WorkSession {
  const task = getTask(taskId);
  if (!task) {
    throw new Error(`Cannot start session for non-existent task ${taskId}`);
  }
  if (task.status === 'completed') {
    throw new Error('Cannot start a session on a completed task.');
  }

  // Enforce invariant: only one active work session at a time
  const currentActive = getActiveSession();
  if (currentActive) {
    if (currentActive.task_id === taskId && currentActive.status === 'active') {
      return currentActive;
    }
    // Automatically preserve and pause or finish the previous session
    pauseSession(currentActive.id);
  }

  const now = new Date().toISOString();
  const newSession: WorkSession = {
    id: generateId(),
    task_id: taskId,
    started_at: now,
    ended_at: null,
    duration_seconds: 0,
    status: 'active',
    last_resumed_at: now,
  };

  const sessions = getSessions();
  sessions.unshift(newSession);
  writeJSON(STORAGE_KEYS.SESSIONS, sessions);

  // Update task's last_worked_at
  updateTask(taskId, { last_worked_at: now });

  // Update settings heartbeat
  const settings = getSettings();
  settings.last_heartbeat = now;
  settings.last_active_task_id = taskId;
  saveSettings(settings);

  return newSession;
}

export function pauseSession(sessionId: string): WorkSession {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (session.status !== 'active') {
    return session;
  }

  const now = new Date();
  let additionalSeconds = 0;
  if (session.last_resumed_at) {
    const elapsed = Math.floor((now.getTime() - new Date(session.last_resumed_at).getTime()) / 1000);
    if (elapsed > 0) {
      additionalSeconds = elapsed;
    }
  }

  session.duration_seconds += additionalSeconds;
  session.status = 'paused';
  session.last_resumed_at = null;

  writeJSON(STORAGE_KEYS.SESSIONS, sessions);

  // Update heartbeat
  const settings = getSettings();
  settings.last_heartbeat = now.toISOString();
  saveSettings(settings);

  return session;
}

export function resumeSession(sessionId: string): WorkSession {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Ensure no other session is active
  const otherActive = sessions.find(s => s.id !== sessionId && s.status === 'active');
  if (otherActive) {
    pauseSession(otherActive.id);
  }

  const now = new Date().toISOString();
  session.status = 'active';
  session.last_resumed_at = now;

  writeJSON(STORAGE_KEYS.SESSIONS, sessions);

  // Update task's last_worked_at
  updateTask(session.task_id, { last_worked_at: now });

  // Update heartbeat
  const settings = getSettings();
  settings.last_heartbeat = now;
  settings.last_active_task_id = session.task_id;
  saveSettings(settings);

  return session;
}

export function finishSession(sessionId: string): WorkSession {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const now = new Date();
  if (session.status === 'active' && session.last_resumed_at) {
    const elapsed = Math.floor((now.getTime() - new Date(session.last_resumed_at).getTime()) / 1000);
    if (elapsed > 0) {
      session.duration_seconds += elapsed;
    }
  }

  session.status = 'completed';
  session.ended_at = now.toISOString();
  session.last_resumed_at = null;

  writeJSON(STORAGE_KEYS.SESSIONS, sessions);

  // Reset active session in settings
  const settings = getSettings();
  settings.last_heartbeat = null;
  saveSettings(settings);

  return session;
}

/**
 * Periodically updates the active session accumulated seconds in storage
 * for crash resilience and sleep detection.
 */
export function recordSessionHeartbeat(sessionId: string, currentTotalSeconds: number): void {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session && session.status === 'active') {
    session.duration_seconds = currentTotalSeconds;
    session.last_resumed_at = new Date().toISOString();
    writeJSON(STORAGE_KEYS.SESSIONS, sessions);

    const settings = getSettings();
    settings.last_heartbeat = new Date().toISOString();
    saveSettings(settings);
  }
}

/**
 * Checks if the last session was abruptly interrupted (e.g., PC sleep, power outage, browser close)
 */
export function checkForInterruptedSession(): InterruptedSessionInfo | null {
  const sessions = getSessions();
  const activeSession = sessions.find(s => s.status === 'active');
  if (!activeSession) return null;

  const settings = getSettings();
  const lastHeartbeat = settings.last_heartbeat || activeSession.last_resumed_at || activeSession.started_at;
  const lastHeartbeatTime = new Date(lastHeartbeat).getTime();
  const now = Date.now();
  const gapSeconds = Math.floor((now - lastHeartbeatTime) / 1000);

  // If more than 90 seconds elapsed since the last heartbeat, the session was interrupted by sleep/crash
  if (gapSeconds > 90) {
    const task = getTask(activeSession.task_id);
    if (!task) return null;
    const lastCheckpoint = getLatestCheckpoint(task.id);

    return {
      session: activeSession,
      task,
      lastCheckpoint,
      unrecordedSeconds: gapSeconds,
      lastHeartbeatTime: new Date(lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return null;
}

export function resolveInterruptedSession(
  sessionId: string,
  decision: 'conservative' | 'include_all' | 'discard_interval'
): WorkSession {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const settings = getSettings();
  const now = new Date();

  if (decision === 'conservative' || decision === 'discard_interval') {
    // Keep declared time only up to last known heartbeat; do NOT add uncertain sleep/off time
    session.status = 'paused';
    session.last_resumed_at = null;
  } else if (decision === 'include_all') {
    // User verified they were working the whole interval
    const lastHeartbeat = settings.last_heartbeat ? new Date(settings.last_heartbeat).getTime() : now.getTime();
    const gap = Math.floor((now.getTime() - lastHeartbeat) / 1000);
    if (gap > 0) {
      session.duration_seconds += gap;
    }
    session.status = 'paused';
    session.last_resumed_at = null;
  }

  writeJSON(STORAGE_KEYS.SESSIONS, sessions);
  settings.last_heartbeat = now.toISOString();
  saveSettings(settings);

  return session;
}

export function getTotalSessionTimeForTask(taskId: string): number {
  const sessions = getSessions().filter(s => s.task_id === taskId);
  return sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
}

// ==========================================
// SETTINGS REPOSITORY
// ==========================================

export function getSettings(): AppSettings {
  return readJSON<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  writeJSON(STORAGE_KEYS.SETTINGS, settings);
}

// ==========================================
// INITIAL DATABASE SEED
// ==========================================

function initializeDatabaseIfEmpty(): void {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (existing !== null) return;

    // Seed initial introductory task matching the prompt's realistic example
    const taskId = generateId();
    const now = new Date();
    const pastTime = new Date(now.getTime() - 45 * 60 * 1000).toISOString();

    const initialTask: Task = {
      id: taskId,
      title: 'Build AI learning app',
      status: 'incomplete',
      created_at: pastTime,
      updated_at: pastTime,
      last_worked_at: pastTime,
      completed_at: null,
    };

    const initialCheckpoint: Checkpoint = {
      id: generateId(),
      task_id: taskId,
      completed_work: 'Implemented the signup form UI and basic layout structure.',
      remaining_work: 'Input validation, error message tooltips, and state persistence.',
      next_action: 'Complete input validation on email and password fields.',
      created_at: pastTime,
    };

    const initialSession: WorkSession = {
      id: generateId(),
      task_id: taskId,
      started_at: pastTime,
      ended_at: pastTime,
      duration_seconds: 1458, // 24m 18s
      status: 'completed',
      last_resumed_at: null,
    };

    writeJSON(STORAGE_KEYS.TASKS, [initialTask]);
    writeJSON(STORAGE_KEYS.CHECKPOINTS, [initialCheckpoint]);
    writeJSON(STORAGE_KEYS.SESSIONS, [initialSession]);
    writeJSON(STORAGE_KEYS.SETTINGS, {
      ...DEFAULT_SETTINGS,
      last_active_task_id: taskId,
    });
  } catch (e) {
    console.error('Failed to initialize local database:', e);
  }
}

// ==========================================
// EXPORT / IMPORT / BACKUP
// ==========================================

export function exportDatabaseBackup(): string {
  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    tasks: getTasks(),
    checkpoints: getCheckpoints(),
    sessions: getSessions(),
    settings: getSettings(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importDatabaseBackup(jsonContent: string): boolean {
  try {
    const data = JSON.parse(jsonContent);
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('Invalid backup file format: missing tasks array');
    }
    writeJSON(STORAGE_KEYS.TASKS, data.tasks);
    writeJSON(STORAGE_KEYS.CHECKPOINTS, data.checkpoints || []);
    writeJSON(STORAGE_KEYS.SESSIONS, data.sessions || []);
    if (data.settings) {
      writeJSON(STORAGE_KEYS.SETTINGS, data.settings);
    }
    return true;
  } catch (err) {
    console.error('Backup import error:', err);
    throw err;
  }
}

export function clearDatabase(): void {
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.CHECKPOINTS);
  localStorage.removeItem(STORAGE_KEYS.SESSIONS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  initializeDatabaseIfEmpty();
}
