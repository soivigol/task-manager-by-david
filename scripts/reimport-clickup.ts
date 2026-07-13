/**
 * Clean reimport: delete all data, then import:
 *   - All tasks created in 2026+
 *   - All tasks with status "today" (any year)
 *   - Subtasks of included parents
 *   - Time entries for included tasks
 *
 * Client mapping:
 *   Keep: Banks, Tareas ChavetasTech, AuraReels
 *   Merge anjoca/jorgejove/museo-mahi → Anjoca
 *   Everything else → Other
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

// ── CSV Parser ──────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { inQuotes = false }
      else { field += c }
    } else {
      if (c === '"') { inQuotes = true }
      else if (c === ',') { row.push(field.trim()); field = '' }
      else if (c === '\n') { row.push(field.trim()); rows.push(row); row = []; field = '' }
      else if (c !== '\r') { field += c }
    }
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row) }
  return rows
}

// ── Column indexes ──────────────────────────────────────────
const COL = {
  taskId: 0, title: 1, content: 2, status: 3, dateCreated: 4,
  dueDate: 6, parentId: 10, priority: 14, listName: 15, timeSpent: 23,
}

// ── Mappings ────────────────────────────────────────────────
const STATUS_MAP: Record<string, { name: string; color: string; is_closed: boolean; sort: number }> = {
  'open':          { name: 'OPEN',        color: '#3b82f6', is_closed: false, sort: 0 },
  'today':         { name: 'TODAY',        color: '#f59e0b', is_closed: false, sort: 1 },
  'in progress':   { name: 'IN PROGRESS', color: '#8b5cf6', is_closed: false, sort: 2 },
  'in review':     { name: 'IN REVIEW',   color: '#06b6d4', is_closed: false, sort: 3 },
  'waiting/block': { name: 'BLOCKED',     color: '#ef4444', is_closed: false, sort: 4 },
  'done':          { name: 'DONE',        color: '#22c55e', is_closed: true,  sort: 5 },
  'closed':        { name: 'DONE',        color: '#22c55e', is_closed: true,  sort: 5 },
}

const ANJOCA_MATCH = ['anjoca', 'jorgejove', 'museo-mahi']

const CLIENT_DEF: Record<string, string> = {
  'Banks': '#3b82f6',
  'Tareas ChavetasTech': '#8b5cf6',
  'AuraReels': '#ec4899',
  'Anjoca': '#0ea5e9',
  'Other': '#6b7280',
}

function mapClient(listName: string): string {
  const lower = listName.toLowerCase()
  if (lower === 'banks') return 'Banks'
  if (lower === 'tareas chavetastech') return 'Tareas ChavetasTech'
  if (lower === 'aurareels') return 'AuraReels'
  if (ANJOCA_MATCH.some(m => lower.includes(m))) return 'Anjoca'
  return 'Other'
}

function mapPriority(val: string): 'urgent' | 'high' | 'normal' | 'low' {
  switch (val) { case '1': return 'urgent'; case '2': return 'high'; case '3': return 'normal'; case '4': return 'low'; default: return 'normal' }
}

function parseDate(ms: string): string | null {
  const n = parseInt(ms)
  if (isNaN(n) || n === 0) return null
  return new Date(n).toISOString().split('T')[0]
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) { console.error('Usage: npx tsx scripts/reimport-clickup.ts <csv>'); process.exit(1) }

  // ── Get user ──────────────────────────────────────────────
  const { data: profiles } = await sb.from('profiles').select('id').limit(1)
  const userId = profiles?.[0]?.id
  if (!userId) { console.error('No user found'); process.exit(1) }
  console.log('User:', userId)

  // ── DELETE ALL EXISTING DATA ──────────────────────────────
  console.log('\nDeleting all existing data...')
  await sb.from('time_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('  Deleted time_entries')
  await sb.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('  Deleted tasks')
  await sb.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('  Deleted clients')
  await sb.from('statuses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('  Deleted statuses')

  // ── Parse CSV ─────────────────────────────────────────────
  console.log('\nParsing CSV...')
  const allRows = parseCSV(fs.readFileSync(csvPath, 'utf8'))
  console.log(`Total rows: ${allRows.length - 1}`)

  const JAN_2026 = new Date('2026-01-01').getTime()

  // Select parent tasks: created 2026+ OR status=today
  const allData = allRows.slice(1)
  const parentRows = allData.filter(r => {
    const isParent = !r[COL.parentId] || r[COL.parentId] === 'null'
    if (!isParent) return false
    const ts = parseInt(r[COL.dateCreated])
    const isFrom2026 = !isNaN(ts) && ts >= JAN_2026
    const isToday = (r[COL.status] || '').toLowerCase() === 'today'
    return isFrom2026 || isToday
  })

  // Collect parent clickup IDs to find their subtasks
  const parentClickupIds = new Set(parentRows.map(r => r[COL.taskId]))

  // Select subtasks whose parent is in our set
  const subtaskRows = allData.filter(r => {
    const pid = r[COL.parentId]
    return pid && pid !== 'null' && parentClickupIds.has(pid)
  })

  console.log(`Parents to import: ${parentRows.length}`)
  console.log(`Subtasks to import: ${subtaskRows.length}`)

  // ── Create statuses ───────────────────────────────────────
  console.log('\nCreating statuses...')
  const statusIdMap: Record<string, string> = {}
  const neededStatuses = new Set<string>()
  ;[...parentRows, ...subtaskRows].forEach(r => {
    const mapped = STATUS_MAP[(r[COL.status] || 'open').toLowerCase()] ?? STATUS_MAP['open']
    neededStatuses.add(mapped.name)
  })

  for (const [raw, def] of Object.entries(STATUS_MAP)) {
    if (!neededStatuses.has(def.name) || statusIdMap[def.name]) continue
    const { data } = await sb.from('statuses').insert({
      user_id: userId, name: def.name, color: def.color, is_closed: def.is_closed, sort_order: def.sort,
    }).select('id').single()
    if (data) { statusIdMap[def.name] = data.id; console.log(`  ${def.name} → ${data.id}`) }
  }

  // ── Create clients ────────────────────────────────────────
  console.log('\nCreating clients...')
  const clientIdMap: Record<string, string> = {}
  const neededClients = new Set<string>()
  ;[...parentRows, ...subtaskRows].forEach(r => {
    if (r[COL.listName]) neededClients.add(mapClient(r[COL.listName]))
  })

  for (const name of neededClients) {
    const color = CLIENT_DEF[name] || '#6b7280'
    const { data } = await sb.from('clients').insert({
      user_id: userId, name, color,
    }).select('id').single()
    if (data) { clientIdMap[name] = data.id; console.log(`  ${name} → ${data.id}`) }
  }

  // ── Helpers ───────────────────────────────────────────────
  function getStatusId(raw: string): string {
    const mapped = STATUS_MAP[(raw || 'open').toLowerCase()] ?? STATUS_MAP['open']
    return statusIdMap[mapped.name] ?? statusIdMap['OPEN']
  }
  function getClientId(listName: string): string | null {
    if (!listName) return null
    return clientIdMap[mapClient(listName)] ?? null
  }

  // ── Insert parents ────────────────────────────────────────
  console.log('\nInserting parent tasks...')
  const clickupToNew: Record<string, string> = {}
  parentRows.sort((a, b) => parseInt(a[COL.dateCreated]) - parseInt(b[COL.dateCreated]))

  const BATCH = 50
  let pCount = 0
  for (let i = 0; i < parentRows.length; i += BATCH) {
    const batch = parentRows.slice(i, i + BATCH)
    const records = batch.map((r, idx) => ({
      user_id: userId,
      status_id: getStatusId(r[COL.status]),
      client_id: getClientId(r[COL.listName]),
      title: r[COL.title] || 'Untitled',
      description: r[COL.content] && r[COL.content] !== 'null'
        ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: r[COL.content] }] }] }
        : null,
      due_date: parseDate(r[COL.dueDate]),
      priority: mapPriority(r[COL.priority]),
      sort_order: i + idx,
      total_tracked_minutes: 0,
    }))
    const { data, error } = await sb.from('tasks').insert(records).select('id')
    if (error) { console.error(`  Error at ${i}:`, error.message); continue }
    if (data) {
      batch.forEach((r, idx) => { if (data[idx]) clickupToNew[r[COL.taskId]] = data[idx].id })
      pCount += data.length
    }
  }
  console.log(`  Inserted: ${pCount}`)

  // ── Insert subtasks ───────────────────────────────────────
  console.log('\nInserting subtasks...')
  subtaskRows.sort((a, b) => parseInt(a[COL.dateCreated]) - parseInt(b[COL.dateCreated]))
  let sCount = 0, sSkip = 0
  for (let i = 0; i < subtaskRows.length; i += BATCH) {
    const batch = subtaskRows.slice(i, i + BATCH)
    const records = batch.filter(r => {
      if (!clickupToNew[r[COL.parentId]]) { sSkip++; return false }
      return true
    }).map((r, idx) => ({
      user_id: userId,
      parent_id: clickupToNew[r[COL.parentId]],
      status_id: getStatusId(r[COL.status]),
      client_id: getClientId(r[COL.listName]),
      title: r[COL.title] || 'Untitled',
      description: r[COL.content] && r[COL.content] !== 'null'
        ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: r[COL.content] }] }] }
        : null,
      due_date: parseDate(r[COL.dueDate]),
      priority: mapPriority(r[COL.priority]),
      sort_order: idx,
      total_tracked_minutes: 0,
    }))
    if (!records.length) continue
    const { data, error } = await sb.from('tasks').insert(records).select('id')
    if (error) { console.error(`  Subtask error at ${i}:`, error.message); continue }
    if (data) {
      let di = 0
      batch.forEach(r => { if (clickupToNew[r[COL.parentId]] && data[di]) { clickupToNew[r[COL.taskId]] = data[di].id; di++ } })
      sCount += data.length
    }
  }
  console.log(`  Inserted: ${sCount}, Skipped: ${sSkip}`)

  // ── Insert time entries ───────────────────────────────────
  console.log('\nInserting time entries...')
  const allImported = [...parentRows, ...subtaskRows]
  const timeRows = allImported.filter(r => {
    const ms = parseInt(r[COL.timeSpent])
    return !isNaN(ms) && ms > 0 && clickupToNew[r[COL.taskId]]
  })
  let tCount = 0
  for (let i = 0; i < timeRows.length; i += BATCH) {
    const batch = timeRows.slice(i, i + BATCH)
    const records = batch.map(r => ({
      task_id: clickupToNew[r[COL.taskId]],
      user_id: userId,
      minutes: Math.round(parseInt(r[COL.timeSpent]) / 60000),
      description: 'Imported from ClickUp',
      tracked_date: parseDate(r[COL.dateCreated]) ?? '2026-01-01',
    }))
    const { data, error } = await sb.from('time_entries').insert(records).select('id')
    if (error) { console.error(`  Time error at ${i}:`, error.message); continue }
    if (data) tCount += data.length
  }
  console.log(`  Inserted: ${tCount}`)

  // ── Summary ───────────────────────────────────────────────
  console.log('\n════════════════════════════════════════')
  console.log('Reimport complete!')
  console.log(`  Statuses: ${Object.keys(statusIdMap).length}`)
  console.log(`  Clients: ${Object.keys(clientIdMap).length}`)
  console.log(`  Parent tasks: ${pCount}`)
  console.log(`  Subtasks: ${sCount}`)
  console.log(`  Time entries: ${tCount}`)
  console.log('════════════════════════════════════════')
}

main().catch(console.error)
