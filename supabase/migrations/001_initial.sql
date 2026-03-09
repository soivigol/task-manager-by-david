-- ============================================================
-- Dev Task — Initial Migration
-- All 5 tables, constraints, indexes, triggers, and RLS
-- ============================================================

-- ─── Profiles ───────────────────────────────────────────────
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─── Statuses ───────────────────────────────────────────────
CREATE TABLE statuses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_closed  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON statuses
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Clients ────────────────────────────────────────────────
CREATE TABLE clients (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  color                    text NOT NULL DEFAULT '#6b7280',
  prepaid_total_minutes    integer NOT NULL DEFAULT 0,
  prepaid_remaining_minutes integer NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON clients
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Tasks ──────────────────────────────────────────────────
CREATE TABLE tasks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id             uuid REFERENCES tasks(id) ON DELETE CASCADE,
  status_id             uuid NOT NULL REFERENCES statuses(id),
  client_id             uuid REFERENCES clients(id) ON DELETE SET NULL,
  title                 text NOT NULL,
  description           jsonb,
  due_date              date,
  priority              text NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  quick_notes           text,
  sort_order            integer NOT NULL DEFAULT 0,
  total_tracked_minutes integer NOT NULL DEFAULT 0,
  recurrence_type       text CHECK (recurrence_type IN ('weekly', 'monthly', 'custom_days', 'custom_weekdays')),
  recurrence_interval   integer DEFAULT 1,
  recurrence_days       integer,
  recurrence_weekdays   integer[],
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Max 1 level deep: parent_id must itself have no parent
ALTER TABLE tasks ADD CONSTRAINT tasks_max_depth CHECK (
  parent_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = tasks.parent_id AND t.parent_id IS NOT NULL
  )
);

CREATE INDEX idx_tasks_user_status ON tasks (user_id, status_id);
CREATE INDEX idx_tasks_parent ON tasks (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_tasks_sort ON tasks (user_id, status_id, sort_order);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON tasks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Time Entries ───────────────────────────────────────────
CREATE TABLE time_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  minutes      integer NOT NULL,
  description  text,
  tracked_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_task ON time_entries (task_id);
CREATE INDEX idx_time_entries_date ON time_entries (user_id, tracked_date);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON time_entries
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Trigger: update_task_tracked_minutes ───────────────────
CREATE OR REPLACE FUNCTION update_task_tracked_minutes()
RETURNS trigger AS $$
DECLARE
  target_task_id uuid;
BEGIN
  -- Determine which task to update
  IF TG_OP = 'DELETE' THEN
    target_task_id := OLD.task_id;
  ELSE
    target_task_id := NEW.task_id;
  END IF;

  -- Recalculate total from all entries
  UPDATE tasks
  SET total_tracked_minutes = COALESCE(
    (SELECT SUM(minutes) FROM time_entries WHERE task_id = target_task_id),
    0
  ),
  updated_at = now()
  WHERE id = target_task_id;

  -- If task_id changed on UPDATE, also recalculate old task
  IF TG_OP = 'UPDATE' AND OLD.task_id <> NEW.task_id THEN
    UPDATE tasks
    SET total_tracked_minutes = COALESCE(
      (SELECT SUM(minutes) FROM time_entries WHERE task_id = OLD.task_id),
      0
    ),
    updated_at = now()
    WHERE id = OLD.task_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_time_entry_change
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_task_tracked_minutes();

-- ─── Trigger: deduct_prepaid ────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_prepaid()
RETURNS trigger AS $$
DECLARE
  v_client_id uuid;
  v_prepaid_total integer;
BEGIN
  -- Get the client_id from the task
  SELECT client_id INTO v_client_id
  FROM tasks
  WHERE id = NEW.task_id;

  -- Only deduct if task has a client
  IF v_client_id IS NOT NULL THEN
    -- Check if client has a prepaid plan
    SELECT prepaid_total_minutes INTO v_prepaid_total
    FROM clients
    WHERE id = v_client_id;

    IF v_prepaid_total > 0 THEN
      UPDATE clients
      SET prepaid_remaining_minutes = prepaid_remaining_minutes - NEW.minutes,
          updated_at = now()
      WHERE id = v_client_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prepaid_deduct
  AFTER INSERT ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION deduct_prepaid();
