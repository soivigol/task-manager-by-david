/**
 * Import ClickUp CSV export into Dev Task (Supabase).
 *
 * Usage:
 *   npx tsx scripts/import-clickup.ts <path-to-csv>
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Uses the service role key to bypass RLS (runs as admin).
 *
 * What it does:
 *   1. Parses CSV with proper quote handling
 *   2. Filters tasks created in 2025+
 *   3. Maps ClickUp statuses → Dev Task statuses
 *   4. Maps ClickUp List Names → Dev Task clients
 *   5. Inserts parent tasks first, then subtasks
 *   6. Inserts time entries from Time Spent column
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── CSV Parser ──────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field.trim())
        field = ''
      } else if (c === '\n') {
        row.push(field.trim())
        rows.push(row)
        row = []
        field = ''
      } else if (c !== '\r') {
        field += c
      }
    }
  }
  if (field || row.length) {
    row.push(field.trim())
    rows.push(row)
  }
  return rows
}

// ── Status & Priority Mapping ───────────────────────────────

const STATUS_MAP: Record<string, { name: string; color: string; is_closed: boolean; sort: number }> = {
  'open':          { name: 'OPEN',        color: '#3b82f6', is_closed: false, sort: 0 },
  'today':         { name: 'TODAY',        color: '#f59e0b', is_closed: false, sort: 1 },
  'in progress':   { name: 'IN PROGRESS', color: '#8b5cf6', is_closed: false, sort: 2 },
  'in review':     { name: 'IN REVIEW',   color: '#06b6d4', is_closed: false, sort: 3 },
  'waiting/block': { name: 'BLOCKED',     color: '#ef4444', is_closed: false, sort: 4 },
  'done':          { name: 'DONE',        color: '#22c55e', is_closed: true,  sort: 5 },
  'closed':        { name: 'DONE',        color: '#22c55e', is_closed: true,  sort: 5 },
}

// ClickUp priority: 1=urgent, 2=high, 3=normal, 4=low, null=normal
function mapPriority(val: string): 'urgent' | 'high' | 'normal' | 'low' {
  switch (val) {
    case '1': return 'urgent'
    case '2': return 'high'
    case '3': return 'normal'
    case '4': return 'low'
    default: return 'normal'
  }
}

// ── Client colors (rotating palette) ────────────────────────

const CLIENT_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#d946ef', '#0ea5e9', '#84cc16', '#e11d48', '#a855f7',
]

// ── Main ────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/import-clickup.ts <path-to-csv>')
    process.exit(1)
  }

  console.log('Reading CSV...')
  const text = fs.readFileSync(csvPath, 'utf8')
  const allRows = parseCSV(text)
  const header = allRows[0]
  console.log(`Parsed ${allRows.length - 1} total rows, ${header.length} columns`)

  // Column indexes
  const COL = {
    taskId: 0,       // Task ID
    title: 1,        // Task Name
    content: 2,      // Task Content
    status: 3,       // Status
    dateCreated: 4,   // Date Created (unix ms)
    dueDate: 6,      // Due Date (unix ms)
    parentId: 10,    // Parent ID
    priority: 14,    // Priority
    listName: 15,    // List Name → Client
    spaceName: 17,   // Space Name
    timeSpent: 23,   // Time Spent (ms)
  }

  // Filter: created in 2025+
  const JAN_2025 = new Date('2025-01-01').getTime()
  const rows = allRows.slice(1).filter(r => {
    const ts = parseInt(r[COL.dateCreated])
    return !isNaN(ts) && ts >= JAN_2025
  })
  console.log(`Filtered to ${rows.length} tasks from 2025+`)

  // ── Get user ──────────────────────────────────────────────
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
  if (profileErr || !profiles?.length) {
    console.error('No user profile found. Create a user in Supabase Auth first.', profileErr)
    process.exit(1)
  }
  const userId = profiles[0].id
  console.log(`Using user: ${userId}`)

  // ── Create statuses ───────────────────────────────────────
  console.log('\nCreating statuses...')
  const statusIdMap: Record<string, string> = {}
  const uniqueStatuses = new Set(rows.map(r => (r[COL.status] || 'open').toLowerCase()))

  for (const rawStatus of uniqueStatuses) {
    const mapped = STATUS_MAP[rawStatus] ?? STATUS_MAP['open']
    // Skip if we already created this mapped status
    if (statusIdMap[mapped.name]) continue

    const { data, error } = await supabase
      .from('statuses')
      .insert({
        user_id: userId,
        name: mapped.name,
        color: mapped.color,
        is_closed: mapped.is_closed,
        sort_order: mapped.sort,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  Error creating status ${mapped.name}:`, error.message)
      continue
    }
    statusIdMap[mapped.name] = data.id
    console.log(`  Created: ${mapped.name} → ${data.id}`)
  }

  // ── Create clients from List Names ────────────────────────
  console.log('\nCreating clients...')
  const clientIdMap: Record<string, string> = {}
  const uniqueClients = new Set(rows.map(r => r[COL.listName]).filter(Boolean))

  let colorIdx = 0
  for (const clientName of uniqueClients) {
    const color = CLIENT_COLORS[colorIdx % CLIENT_COLORS.length]
    colorIdx++

    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        name: clientName,
        color,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  Error creating client ${clientName}:`, error.message)
      continue
    }
    clientIdMap[clientName] = data.id
    console.log(`  Created: ${clientName} → ${data.id}`)
  }

  // ── Helper: resolve status ID ─────────────────────────────
  function getStatusId(rawStatus: string): string {
    const mapped = STATUS_MAP[(rawStatus || 'open').toLowerCase()] ?? STATUS_MAP['open']
    return statusIdMap[mapped.name] ?? statusIdMap['OPEN']
  }

  // ── Helper: parse date from unix ms ───────────────────────
  function parseDate(ms: string): string | null {
    const n = parseInt(ms)
    if (isNaN(n) || n === 0) return null
    return new Date(n).toISOString().split('T')[0]
  }

  // ── Separate parents and subtasks ─────────────────────────
  const parents = rows.filter(r => !r[COL.parentId] || r[COL.parentId] === 'null')
  const subtasks = rows.filter(r => r[COL.parentId] && r[COL.parentId] !== 'null')
  console.log(`\nParent tasks: ${parents.length}, Subtasks: ${subtasks.length}`)

  // ── Insert parent tasks ───────────────────────────────────
  console.log('\nInserting parent tasks...')
  const clickupToDevTask: Record<string, string> = {} // clickup_id → dev_task_id
  let inserted = 0
  let errors = 0

  // Sort by creation date
  parents.sort((a, b) => parseInt(a[COL.dateCreated]) - parseInt(b[COL.dateCreated]))

  // Batch insert in chunks of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < parents.length; i += BATCH_SIZE) {
    const batch = parents.slice(i, i + BATCH_SIZE)
    const records = batch.map((r, idx) => ({
      user_id: userId,
      status_id: getStatusId(r[COL.status]),
      client_id: clientIdMap[r[COL.listName]] ?? null,
      title: r[COL.title] || 'Untitled',
      description: r[COL.content] && r[COL.content] !== 'null'
        ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: r[COL.content] }] }] }
        : null,
      due_date: parseDate(r[COL.dueDate]),
      priority: mapPriority(r[COL.priority]),
      sort_order: i + idx,
      total_tracked_minutes: 0, // Will be set by time entries trigger
    }))

    const { data, error } = await supabase
      .from('tasks')
      .insert(records)
      .select('id')

    if (error) {
      console.error(`  Batch error at ${i}:`, error.message)
      errors += batch.length
      continue
    }

    // Map clickup IDs to new IDs
    if (data) {
      batch.forEach((r, idx) => {
        if (data[idx]) {
          clickupToDevTask[r[COL.taskId]] = data[idx].id
        }
      })
      inserted += data.length
    }

    if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= parents.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, parents.length)}/${parents.length}`)
    }
  }
  console.log(`  Inserted: ${inserted}, Errors: ${errors}`)

  // ── Insert subtasks ───────────────────────────────────────
  console.log('\nInserting subtasks...')
  let subInserted = 0
  let subErrors = 0
  let subSkipped = 0

  subtasks.sort((a, b) => parseInt(a[COL.dateCreated]) - parseInt(b[COL.dateCreated]))

  for (let i = 0; i < subtasks.length; i += BATCH_SIZE) {
    const batch = subtasks.slice(i, i + BATCH_SIZE)
    const records = batch
      .filter(r => {
        const parentDevId = clickupToDevTask[r[COL.parentId]]
        if (!parentDevId) {
          subSkipped++
          return false
        }
        return true
      })
      .map((r, idx) => ({
        user_id: userId,
        parent_id: clickupToDevTask[r[COL.parentId]],
        status_id: getStatusId(r[COL.status]),
        client_id: clientIdMap[r[COL.listName]] ?? null,
        title: r[COL.title] || 'Untitled',
        description: r[COL.content] && r[COL.content] !== 'null'
          ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: r[COL.content] }] }] }
          : null,
        due_date: parseDate(r[COL.dueDate]),
        priority: mapPriority(r[COL.priority]),
        sort_order: idx,
        total_tracked_minutes: 0,
      }))

    if (records.length === 0) continue

    const { data, error } = await supabase
      .from('tasks')
      .insert(records)
      .select('id')

    if (error) {
      console.error(`  Subtask batch error at ${i}:`, error.message)
      subErrors += records.length
      continue
    }

    if (data) {
      // Map subtask clickup IDs too
      let dataIdx = 0
      batch.forEach(r => {
        if (clickupToDevTask[r[COL.parentId]] && data[dataIdx]) {
          clickupToDevTask[r[COL.taskId]] = data[dataIdx].id
          dataIdx++
        }
      })
      subInserted += data.length
    }
  }
  console.log(`  Inserted: ${subInserted}, Skipped (no parent): ${subSkipped}, Errors: ${subErrors}`)

  // ── Insert time entries ───────────────────────────────────
  console.log('\nInserting time entries...')
  let timeInserted = 0
  let timeSkipped = 0

  const timeRows = rows.filter(r => {
    const ms = parseInt(r[COL.timeSpent])
    return !isNaN(ms) && ms > 0
  })
  console.log(`  Tasks with time spent: ${timeRows.length}`)

  for (let i = 0; i < timeRows.length; i += BATCH_SIZE) {
    const batch = timeRows.slice(i, i + BATCH_SIZE)
    const records = batch
      .filter(r => {
        const devId = clickupToDevTask[r[COL.taskId]]
        if (!devId) {
          timeSkipped++
          return false
        }
        return true
      })
      .map(r => {
        const ms = parseInt(r[COL.timeSpent])
        const minutes = Math.round(ms / 60000)
        const createdDate = parseDate(r[COL.dateCreated]) ?? new Date().toISOString().split('T')[0]
        return {
          task_id: clickupToDevTask[r[COL.taskId]],
          user_id: userId,
          minutes,
          description: `Imported from ClickUp`,
          tracked_date: createdDate,
        }
      })

    if (records.length === 0) continue

    const { data, error } = await supabase
      .from('time_entries')
      .insert(records)
      .select('id')

    if (error) {
      console.error(`  Time entry batch error at ${i}:`, error.message)
      continue
    }
    if (data) timeInserted += data.length
  }
  console.log(`  Inserted: ${timeInserted}, Skipped: ${timeSkipped}`)

  // ── Summary ───────────────────────────────────────────────
  console.log('\n════════════════════════════════════════')
  console.log('Import complete!')
  console.log(`  Statuses: ${Object.keys(statusIdMap).length}`)
  console.log(`  Clients: ${Object.keys(clientIdMap).length}`)
  console.log(`  Parent tasks: ${inserted}`)
  console.log(`  Subtasks: ${subInserted}`)
  console.log(`  Time entries: ${timeInserted}`)
  console.log('════════════════════════════════════════')
}

main().catch(console.error)
