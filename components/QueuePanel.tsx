'use client'

import type { QueueEntry } from '@/lib/types'

function firstName(name: string) {
  return name.includes(',') ? name.split(',')[1]?.trim() ?? name : name
}

// Shows who's waiting for the Bathroom / Nurse. The person at the top of each
// list is "up next" — highlighted so they know to check out.
export default function QueuePanel({ queue, onLeave }: { queue: QueueEntry[]; onLeave?: (id: string) => void }) {
  if (!queue || queue.length === 0) return null

  const groups: { key: string; label: string; items: QueueEntry[] }[] = []
  for (const label of ['Bathroom', 'Nurse']) {
    for (const g of ['female', 'male', null]) {
      const items = queue.filter((q) => q.location === label && (label === 'Bathroom' ? q.gender === g : g === null))
      if (items.length === 0) continue
      const suffix = label === 'Bathroom' ? ` · ${g === 'male' ? 'Boys' : 'Girls'}` : ''
      groups.push({ key: `${label}-${g}`, label: `${label}${suffix}`, items })
    }
  }
  if (groups.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
        <span>⏳</span> Waiting Line
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((grp) => (
          <div key={grp.key}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">{grp.label}</p>
            <ol className="flex flex-col gap-1.5">
              {grp.items.map((q, i) => (
                <li key={q.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${i === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</span>
                    <span className="truncate font-semibold text-gray-900">{q.student ? firstName(q.student.name) : 'Student'}</span>
                    {i === 0 && <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">You&apos;re up</span>}
                  </span>
                  {onLeave && (
                    <button onClick={() => onLeave(q.id)} className="ml-2 shrink-0 text-xs font-semibold text-gray-400 hover:text-red-500">Leave</button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-amber-700">When it&apos;s your turn (top of the list), tap Check Out again to go.</p>
    </div>
  )
}
