import { createClient } from '@/lib/supabase/server'
import { SettingsTabs } from '@/components/settings/SettingsTabs'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Load statuses
  const { data: statuses } = await supabase
    .from('statuses')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  // Load clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  // Count tasks per status for delete-guard
  const { data: taskCounts } = await supabase
    .from('tasks')
    .select('status_id')
    .eq('user_id', user.id)

  const taskCountByStatus: Record<string, number> = {}
  if (taskCounts) {
    for (const row of taskCounts) {
      taskCountByStatus[row.status_id] = (taskCountByStatus[row.status_id] ?? 0) + 1
    }
  }

  return (
    <div className="p-4">
      <SettingsTabs
        statuses={statuses ?? []}
        clients={clients ?? []}
        taskCountByStatus={taskCountByStatus}
      />
    </div>
  )
}
