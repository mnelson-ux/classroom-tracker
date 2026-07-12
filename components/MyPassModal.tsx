'use client'

import { useMemo, useState } from 'react'
import PinModal from './PinModal'
import { nameMatches } from '@/lib/search'
import type { Student, Checkout } from '@/lib/types'

// Lets a student look up and display their own active pass by name + PIN.
export default function MyPassModal({
  students, onFound, onClose,
}: {
  students: Student[]
  onFound: (checkout: Checkout, student: Student) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const selected = students.find((s) => s.id === studentId)

  const filtered = useMemo(() => {
    const q = search.trim()
    return students.filter((s) => !q || nameMatches(s.name, q))
  }, [students, search])

  const submit = async (pin: string): Promise<string | null> => {
    const res = await fetch('/api/my-pass', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, pin }),
    })
    const data = await res.json()
    if (!res.ok) return data.error ?? 'Something went wrong'
    if (!data.pass) return 'You have no active pass right now.'
    if (selected) onFound(data.pass, selected)
    return null
  }

  if (studentId && selected) {
    const first = selected.name.split(',')[1]?.trim() ?? selected.name
    return <PinModal title={`Show pass — ${first}`} onSubmit={submit} onClose={() => setStudentId('')} />
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-xl font-bold text-gray-900">Show My Pass</h2>
        <p className="mb-4 text-sm text-gray-500">Find your name, then enter your PIN.</p>
        <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your name…"
          className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" />
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200">
          {filtered.slice(0, 50).map((s) => (
            <button key={s.id} onClick={() => setStudentId(s.id)}
              className="block w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-purple-50">{s.name}</button>
          ))}
          {filtered.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No match</p>}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  )
}
