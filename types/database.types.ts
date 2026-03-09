export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      statuses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          sort_order: number;
          is_closed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          sort_order?: number;
          is_closed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          sort_order?: number;
          is_closed?: boolean;
        };
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          prepaid_total_minutes: number;
          prepaid_remaining_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          prepaid_total_minutes?: number;
          prepaid_remaining_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          prepaid_total_minutes?: number;
          prepaid_remaining_minutes?: number;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          parent_id: string | null;
          status_id: string;
          client_id: string | null;
          title: string;
          description: Json | null;
          due_date: string | null;
          priority: string;
          quick_notes: string | null;
          sort_order: number;
          total_tracked_minutes: number;
          recurrence_type: string | null;
          recurrence_interval: number | null;
          recurrence_days: number | null;
          recurrence_weekdays: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          parent_id?: string | null;
          status_id: string;
          client_id?: string | null;
          title: string;
          description?: Json | null;
          due_date?: string | null;
          priority?: string;
          quick_notes?: string | null;
          sort_order?: number;
          total_tracked_minutes?: number;
          recurrence_type?: string | null;
          recurrence_interval?: number | null;
          recurrence_days?: number | null;
          recurrence_weekdays?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          parent_id?: string | null;
          status_id?: string;
          client_id?: string | null;
          title?: string;
          description?: Json | null;
          due_date?: string | null;
          priority?: string;
          quick_notes?: string | null;
          sort_order?: number;
          total_tracked_minutes?: number;
          recurrence_type?: string | null;
          recurrence_interval?: number | null;
          recurrence_days?: number | null;
          recurrence_weekdays?: number[] | null;
          updated_at?: string;
        };
      };
      time_entries: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          minutes: number;
          description: string | null;
          tracked_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          minutes: number;
          description?: string | null;
          tracked_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          minutes?: number;
          description?: string | null;
          tracked_date?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
