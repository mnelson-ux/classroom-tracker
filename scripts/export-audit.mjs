#!/usr/bin/env node
// Exports the full audit trail + checkout history from Supabase to timestamped
// local CSV files, for FERPA/COPPA audit retention. Complete snapshots (no row
// cap), kept offline. Run manually or on a schedule (see scripts/README-export.md).
//
//   node scripts/export-audit.mjs
//
// Files land in ./exports/ (git-ignored — they contain student PII).

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Load Supabase credentials from .env.local (no extra dependency needed).
function loadEnv() {
  const env = {}
  const file = path.join(root, '.env.local')
  if (!fs.existsSync(file)) { console.error('Missing .env.local'); process.exit(1) }
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}
const env = loadEnv()
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const csvCell = (v) => {
  if (v == null) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCsv = (rows, cols) =>
  [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n'

// Pull every row of a table/query in pages of 1000 (no cap).
async function fetchAll(build) {
  const all = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1)
    if (error) { console.error('Query error:', error.message); process.exit(1) }
    all.push(...data)
    if (data.length < size) break
  }
  return all
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

async function main() {
  const outDir = path.join(root, 'exports')
  fs.mkdirSync(outDir, { recursive: true })
  const tag = stamp()

  // 1. Audit trail — who did what, when (the FERPA/COPPA access log).
  const audit = await fetchAll(() =>
    db.from('audit_log').select('*').order('created_at', { ascending: true }))
  const auditCols = ['created_at', 'actor_type', 'actor_name', 'actor_id', 'action', 'entity', 'entity_id', 'detail', 'school', 'ip']
  const auditFile = path.join(outDir, `audit-log_${tag}.csv`)
  fs.writeFileSync(auditFile, toCsv(audit, auditCols))

  // 2. Checkout history — the hall-pass records themselves (flattened w/ names).
  const rows = await fetchAll(() =>
    db.from('checkouts')
      .select('check_out_time, check_in_time, duration_minutes, location, pass_type, school, student:students(name, gender), teacher:teachers!checkouts_teacher_id_fkey(name)')
      .order('check_out_time', { ascending: true }))
  const flat = rows.map((r) => ({
    check_out_time: r.check_out_time, check_in_time: r.check_in_time, duration_minutes: r.duration_minutes,
    student: r.student?.name ?? '', gender: r.student?.gender ?? '', teacher: r.teacher?.name ?? '',
    location: r.location, pass_type: r.pass_type, school: r.school,
  }))
  const coCols = ['check_out_time', 'check_in_time', 'duration_minutes', 'student', 'gender', 'teacher', 'location', 'pass_type', 'school']
  const coFile = path.join(outDir, `checkout-history_${tag}.csv`)
  fs.writeFileSync(coFile, toCsv(flat, coCols))

  console.log('✓ Export complete')
  console.log(`  ${auditFile}  (${audit.length} audit events)`)
  console.log(`  ${coFile}  (${flat.length} checkout records)`)
}
main()
