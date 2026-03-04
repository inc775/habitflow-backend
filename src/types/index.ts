/**
 * TypeScript Types and Interfaces
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  device_id?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  is_active: boolean;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  frequency: string;
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;
  sync_version: number;
  is_deleted: boolean;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completion_date: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  sync_version: number;
}

export interface SyncMetadata {
  id: string;
  user_id: string;
  device_id?: string;
  last_sync_at?: Date;
  last_sync_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface PushToken {
  id: string;
  user_id: string;
  device_id?: string;
  token: string;
  platform: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  enabled: boolean;
  reminder_time: string;
  habit_ids: string[];
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Request/Response types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, "password_hash">;
  accessToken: string;
  refreshToken: string;
}

export interface CreateHabitRequest {
  name: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  frequency: string;
}

export interface UpdateHabitRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  frequency?: string;
}

export interface SyncRequest {
  device_id: string;
  habits: Habit[];
  completions: HabitCompletion[];
  last_sync_version: number;
}

export interface SyncResponse {
  habits: Habit[];
  completions: HabitCompletion[];
  sync_version: number;
  timestamp: Date;
}

export interface AnalyticsData {
  total_habits: number;
  active_habits: number;
  total_completions: number;
  completion_rate: number;
  average_daily_completions: number;
  best_streak: number;
  habits: Array<{
    id: string;
    name: string;
    streak: number;
    longest_streak: number;
    completion_rate_7d: number;
    completion_rate_30d: number;
  }>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  deviceId?: string;
  iat: number;
  exp: number;
}
