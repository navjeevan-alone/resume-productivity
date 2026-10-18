export type TaskStatus = 'incomplete' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string; // ISO 8601 UTC
  updated_at: string;
  last_worked_at: string | null;
  completed_at: string | null;
}

export interface Checkpoint {
  id: string;
  task_id: string;
  completed_work: string;
  remaining_work: string;
  next_action: string;
  created_at: string; // ISO 8601 UTC
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'interrupted';

export interface WorkSession {
  id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number; // accumulated active seconds (persisted)
  status: SessionStatus;
  last_resumed_at: string | null; // null if paused
}

export interface AppSettings {
  start_at_signin: boolean;
  sound_enabled: boolean;
  compact_mode: boolean;
  last_heartbeat: string | null;
  last_active_task_id: string | null;
}

export interface InterruptedSessionInfo {
  session: WorkSession;
  task: Task;
  lastCheckpoint: Checkpoint | null;
  unrecordedSeconds: number;
  lastHeartbeatTime: string;
}

export type AppView = 'welcome' | 'active' | 'task_list' | 'history' | 'settings';
