import { createClient } from '@/lib/supabase/server'
import { TaskListClient } from '@/components/tasks/TaskListClient'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Load tasks (all including subtasks)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

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

  return (
    <TaskListClient
      initialTasks={tasks ?? []}
      initialStatuses={statuses ?? []}
      initialClients={clients ?? []}
    />
  )
}
