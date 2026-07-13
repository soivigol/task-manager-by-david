/**
 * Reset a user's password via Supabase Admin API (service role).
 *
 * Usage:
 *   npx tsx scripts/reset-password.ts <email> [new-password]
 *
 * If new-password is omitted, a random one is generated and printed.
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('Usage: npx tsx scripts/reset-password.ts <email> [new-password]')
  process.exit(1)
}

const newPassword = process.argv[3] ?? randomBytes(16).toString('base64url')

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function findUserByEmail(targetEmail: string) {
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const user = data.users.find((u) => u.email?.toLowerCase() === targetEmail)
    if (user) return user

    if (data.users.length < perPage) return null
    page += 1
  }
}

async function main() {
  const user = await findUserByEmail(email)
  if (!user) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  const { error } = await sb.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (error) {
    console.error('Failed to update password:', error.message)
    process.exit(1)
  }

  console.log(`Password reset for ${email}`)
  console.log(`New password: ${newPassword}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
