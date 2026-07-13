/**
 * Diagnose auth issues for a user email.
 * Usage: npx tsx scripts/debug-auth.ts <email> [password-to-test]
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const email = process.argv[2]?.trim().toLowerCase()
const testPassword = process.argv[3]

async function findUserByEmail(
  sb: ReturnType<typeof createClient>,
  targetEmail: string
) {
  let page = 1
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data.users.find((u) => u.email?.toLowerCase() === targetEmail)
    if (user) return user
    if (data.users.length < 1000) return null
    page += 1
  }
}

async function main() {
  console.log('Supabase URL:', SUPABASE_URL)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const user = await findUserByEmail(admin, email ?? '')

  if (!user) {
    console.log('User NOT found. All users:')
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of data.users) {
      console.log(`  - ${u.email} (id: ${u.id})`)
    }
    return
  }

  console.log('\nUser found:')
  console.log('  id:', user.id)
  console.log('  email:', user.email)
  console.log('  email_confirmed_at:', user.email_confirmed_at ?? '(null)')
  console.log('  banned_until:', user.banned_until ?? '(null)')
  console.log('  created_at:', user.created_at)
  console.log('  last_sign_in_at:', user.last_sign_in_at ?? '(never)')
  console.log('  providers:', user.app_metadata?.providers ?? user.identities?.map((i) => i.provider))
  console.log('  identities:', user.identities?.map((i) => ({ provider: i.provider, id: i.id })))

  if (testPassword) {
    const anon = createClient(SUPABASE_URL, ANON_KEY)
    const { data, error } = await anon.auth.signInWithPassword({
      email: user.email!,
      password: testPassword,
    })
    console.log('\nSign-in test:')
    if (error) {
      console.log('  FAILED:', error.message, error)
    } else {
      console.log('  SUCCESS — session user:', data.user?.email)
    }
  }
}

main().catch(console.error)
