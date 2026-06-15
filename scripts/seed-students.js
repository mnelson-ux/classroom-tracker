/**
 * Run this once after deploying to import all students with hashed PINs.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-students.js
 */

const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const students = [
  // Girls
  { name: 'Avalos-Orozco, Brenda', gender: 'female', pin: '1188' },
  { name: 'Benitez-Ramirez, Anahi', gender: 'female', pin: '2861' },
  { name: 'Borja, Yulissa', gender: 'female', pin: '1119' },
  { name: 'Castellanos, Laylani', gender: 'female', pin: '2650' },
  { name: 'Chavez Aguilera, Luz', gender: 'female', pin: '0799' },
  { name: 'Contreras, Amira', gender: 'female', pin: '0968' },
  { name: 'Cuellar, Laila', gender: 'female', pin: '3453' },
  { name: 'Diaz, Alexia', gender: 'female', pin: '1183' },
  { name: 'Flores Cruz, Glendy', gender: 'female', pin: '1122' },
  { name: 'Godfrey, Annabelle', gender: 'female', pin: '2399' },
  { name: 'Hacker, Emma', gender: 'female', pin: '1776' },
  { name: 'Hernandez, Azucena', gender: 'female', pin: '2440' },
  { name: 'Hernandez, Genesis', gender: 'female', pin: '0802' },
  { name: 'Hernandez, Olivia', gender: 'female', pin: '2722' },
  { name: 'Jeffries, Harlee', gender: 'female', pin: '1154' },
  { name: 'Jimenez, Milanya', gender: 'female', pin: '1124' },
  { name: 'Longest, Mariah', gender: 'female', pin: '0808' },
  { name: 'Luna, Audrey Leeilah Eve', gender: 'female', pin: '0984' },
  { name: 'Marcial, Jasmyne', gender: 'female', pin: '2695' },
  { name: 'Martinez, Melanie', gender: 'female', pin: '0810' },
  { name: 'Moran, Alice', gender: 'female', pin: '1827' },
  { name: 'Pena, Daisy', gender: 'female', pin: '1162' },
  { name: 'Perales, Jaelynn', gender: 'female', pin: '4892' },
  { name: 'Raymundo, Daijah', gender: 'female', pin: '1660' },
  { name: 'Ruth, Lauren', gender: 'female', pin: '2649' },
  { name: 'Torres Acevedo, Natalia', gender: 'female', pin: '1745' },
  { name: 'Upson, Joshalyn', gender: 'female', pin: '1165' },
  { name: 'Vega, Nancy', gender: 'female', pin: '0993' },
  { name: 'Villegas Flores, Luzmila', gender: 'female', pin: '0429' },
  { name: 'Villegas Flores, Melina', gender: 'female', pin: '1034' },
  { name: 'Vivanco, Erika', gender: 'female', pin: '2864' },
  { name: 'Woodland, Abbygail', gender: 'female', pin: '1267' },
  { name: 'Yocum, Ava', gender: 'female', pin: '2270' },

  // Boys
  { name: 'Adcock, Christopher', gender: 'male', pin: '0372' },
  { name: 'Aguilar Lombera, Brayan', gender: 'male', pin: '0794' },
  { name: 'Andrade, Anthony', gender: 'male', pin: '1270' },
  { name: 'Andrade, Jesus', gender: 'male', pin: '1271' },
  { name: 'Anguiano-Aguilar, Oscar', gender: 'male', pin: '1148' },
  { name: 'Araujo, Angel', gender: 'male', pin: '1898' },
  { name: 'Barboza, Omar', gender: 'male', pin: '3461' },
  { name: 'Bastida Ontiveros, Joshua', gender: 'male', pin: '1150' },
  { name: 'Bryce, Lance', gender: 'male', pin: '2687' },
  { name: 'Cabrera, Rene', gender: 'male', pin: '1166' },
  { name: 'Chavez-Aguilera, Gustavo', gender: 'male', pin: '0376' },
  { name: 'Clack, Jason', gender: 'male', pin: '3017' },
  { name: 'Contreras, Antonio', gender: 'male', pin: '0968' },
  { name: 'Cortes Gonzalez, Ismael', gender: 'male', pin: '1899' },
  { name: 'Diaz, Homar', gender: 'male', pin: '0829' },
  { name: 'Edwards, Micheal', gender: 'male', pin: '2000' },
  { name: 'Flores Galvez, Christopher', gender: 'male', pin: '1215' },
  { name: 'Flores Galvez, Mario', gender: 'male', pin: '1214' },
  { name: 'Ford, Torren', gender: 'male', pin: '2001' },
  { name: 'Guerrero Tapia, Michael', gender: 'male', pin: '0437' },
  { name: 'Gutierrez-Gonzalez, Salvador', gender: 'male', pin: '0801' },
  { name: 'Hurtado-Cortes, Rolando', gender: 'male', pin: '1153' },
  { name: 'Jeffries, Logan', gender: 'male', pin: '0385' },
  { name: 'Kemp, Jakota', gender: 'male', pin: '1767' },
  { name: 'Leon, Pablo', gender: 'male', pin: '2002' },
  { name: 'Lopez, Dominic', gender: 'male', pin: '3114' },
  { name: 'Manzanares, Jesus', gender: 'male', pin: '2325' },
  { name: 'Martinez Flores, Fabian', gender: 'male', pin: '2878' },
  { name: 'Martinez, Gelacio', gender: 'male', pin: '0828' },
  { name: 'Mendoza, Mario', gender: 'male', pin: '1529' },
  { name: 'Monter Juarez, Angel', gender: 'male', pin: '1031' },
  { name: 'Morales, Jesse', gender: 'male', pin: '0384' },
  { name: 'Murphy Cowger, Cameron', gender: 'male', pin: '0761' },
  { name: 'Murray, Robert', gender: 'male', pin: '1033' },
  { name: 'Neri, Raul', gender: 'male', pin: '1274' },
  { name: 'Ortiz Garcia, Jose', gender: 'male', pin: '1006' },
  { name: 'Pina, Johnathon', gender: 'male', pin: '1646' },
  { name: 'Puga, Jonas', gender: 'male', pin: '0393' },
  { name: 'Ramirez Jimenez, Horacio', gender: 'male', pin: '1158' },
  { name: 'Raymundo, Chamillionaire', gender: 'male', pin: '1661' },
  { name: 'Renaud, Reese', gender: 'male', pin: '2003' },
  { name: 'Richter, Damien', gender: 'male', pin: '3254' },
  { name: 'Romero, Bryan', gender: 'male', pin: '0995' },
  { name: 'Ross, Gunner', gender: 'male', pin: '1023' },
  { name: 'Ross, Taylor', gender: 'male', pin: '0442' },
  { name: 'Smallwood, Conner', gender: 'male', pin: '0967' },
  { name: 'Torres Andrade, Angel', gender: 'male', pin: '1159' },
  { name: 'Vega Vega, Angel', gender: 'male', pin: '1161' },
  { name: 'Velazquez, Markus', gender: 'male', pin: '1139' },
  { name: 'Villicana Tapia, Denis', gender: 'male', pin: '1792' },
  { name: 'Vivanco, Anthony', gender: 'male', pin: '2865' },
]

async function main() {
  console.log(`Seeding ${students.length} students...`)

  for (const student of students) {
    const pin_hash = await bcrypt.hash(student.pin, 10)
    const { error } = await supabase
      .from('students')
      .upsert({ name: student.name, gender: student.gender, pin_hash }, { onConflict: 'name' })

    if (error) {
      console.error(`Error inserting ${student.name}:`, error.message)
    } else {
      console.log(`✓ ${student.name}`)
    }
  }

  console.log('\nDone! All students imported.')
}

main().catch(console.error)
