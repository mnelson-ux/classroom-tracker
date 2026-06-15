/**
 * Seeds teacher accounts. Edit passwords before running.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-teachers.js
 */

const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Edit passwords here before running!
const teachers = [
  { name: 'Hernandez', username: 'hernandez', password: 'changeme1' },
  { name: 'Walls', username: 'walls', password: 'changeme2' },
  { name: 'Shoemaker', username: 'shoemaker', password: 'changeme3' },
  { name: 'Bailey', username: 'bailey', password: 'changeme4' },
  { name: 'Nelson', username: 'nelson', password: 'changeme5' },
  { name: 'Lopez', username: 'lopez', password: 'changeme6' },
  { name: 'Rivera', username: 'rivera', password: 'changeme7' },
  { name: 'Swaggart', username: 'swaggart', password: 'changeme8' },
]

async function main() {
  // Get rooms to match by name
  const { data: rooms } = await supabase.from('rooms').select('id, name')
  const roomMap = Object.fromEntries(rooms.map((r) => [r.name.toLowerCase(), r.id]))

  for (const teacher of teachers) {
    const password_hash = await bcrypt.hash(teacher.password, 10)
    const room_id = roomMap[teacher.name.toLowerCase()] ?? null

    const { error } = await supabase
      .from('teachers')
      .upsert({ name: teacher.name, username: teacher.username, password_hash, room_id }, { onConflict: 'username' })

    if (error) {
      console.error(`Error inserting ${teacher.name}:`, error.message)
    } else {
      console.log(`✓ ${teacher.name} (username: ${teacher.username})`)
    }
  }

  console.log('\nDone! Remember to have teachers change their passwords.')
}

main().catch(console.error)
