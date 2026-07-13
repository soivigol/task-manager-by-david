import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function main() {
  const { data: clients } = await sb.from('clients').select('id, name')
  if (!clients) return

  const { data: profiles } = await sb.from('profiles').select('id').limit(1)
  const userId = profiles?.[0]?.id
  if (!userId) { console.error('No user'); return }

  // Keep these (case-insensitive match)
  const KEEP = ['banks', 'tareas chavetastech', 'aurareels']
  // Merge into "Anjoca" (case-insensitive partial match)
  const ANJOCA_MATCH = ['anjoca', 'jorgejove', 'museo-mahi']

  const keepClients = clients.filter(c => KEEP.includes(c.name.toLowerCase()))
  const anjocoClients = clients.filter(c => ANJOCA_MATCH.some(m => c.name.toLowerCase().includes(m)))
  const removeClients = clients.filter(c =>
    !KEEP.includes(c.name.toLowerCase()) &&
    !ANJOCA_MATCH.some(m => c.name.toLowerCase().includes(m))
  )

  console.log('Keeping:', keepClients.map(c => c.name))
  console.log('Merging into Anjoca:', anjocoClients.map(c => c.name))
  console.log('Moving to Other:', removeClients.map(c => c.name))

  // Create "Anjoca" client
  const { data: anjoca } = await sb.from('clients').insert({
    user_id: userId, name: 'Anjoca', color: '#0ea5e9'
  }).select('id').single()
  console.log('\nCreated Anjoca:', anjoca?.id)

  // Create "Other" client
  const { data: other } = await sb.from('clients').insert({
    user_id: userId, name: 'Other', color: '#6b7280'
  }).select('id').single()
  console.log('Created Other:', other?.id)

  // Reassign anjoca-related tasks
  for (const c of anjocoClients) {
    const { count } = await sb.from('tasks').update({ client_id: anjoca?.id }).eq('client_id', c.id).select('id', { count: 'exact', head: true })
    console.log(`  Moved ${count ?? 0} tasks from "${c.name}" → Anjoca`)
  }

  // Reassign other tasks
  for (const c of removeClients) {
    const { count } = await sb.from('tasks').update({ client_id: other?.id }).eq('client_id', c.id).select('id', { count: 'exact', head: true })
    console.log(`  Moved ${count ?? 0} tasks from "${c.name}" → Other`)
  }

  // Delete old clients (FK is SET NULL but we already reassigned)
  const idsToDelete = [...anjocoClients, ...removeClients].map(c => c.id)
  const { error } = await sb.from('clients').delete().in('id', idsToDelete)
  if (error) console.error('Delete error:', error.message)
  else console.log(`\nDeleted ${idsToDelete.length} old clients`)

  // Final state
  const { data: final } = await sb.from('clients').select('id, name')
  console.log('\nFinal clients:', final?.map(c => c.name))
}

main().catch(console.error)
