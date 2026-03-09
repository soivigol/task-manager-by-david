export interface Status {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_closed: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  color: string;
  prepaid_total_minutes: number;
  prepaid_remaining_minutes: number;
  created_at: string;
  updated_at: string;
}

export type Priority = "urgent" | "high" | "normal" | "low";
export type RecurrenceType = "weekly" | "monthly" | "custom_days" | "custom_weekdays";

export interface Task {
  id: string;
  user_id: string;
  parent_id: string | null;
  status_id: string;
  client_id: string | null;
  title: string;
  description: Record<string, unknown> | null;
  due_date: string | null;
  priority: Priority;
  quick_notes: string | null;
  sort_order: number;
  total_tracked_minutes: number;
  recurrence_type: RecurrenceType | null;
  recurrence_interval: number | null;
  recurrence_days: number | null;
  recurrence_weekdays: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  minutes: number;
  description: string | null;
  tracked_date: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
