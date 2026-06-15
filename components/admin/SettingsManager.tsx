'use client'

import { useState } from 'react'

interface SettingRow {
  key: string
  value: string
  label: string
  description: string
}

interface Props {
  settings: SettingRow[]
  token: string
  onRefresh: () => void
}

export default function SettingsManager({ settings, token, onRefresh }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    const updates = Object.entries(values).map(([key, value]) => ({ key, value }))
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setSaved(true)
    onRefresh()
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const groups = [
    {
      title: 'Display',
      keys: ['page_title', 'girls_section_title', 'boys_section_title'],
    },
    {
      title: 'Bathroom Limits',
      keys: [
        'max_bathroom_per_room_boys',
        'max_bathroom_per_room_girls',
        'max_bathroom_total_boys',
        'max_bathroom_total_girls',
        'time_limit_minutes',
      ],
    },
    {
      title: 'Locations',
      keys: ['locations'],
    },
  ]

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Settings</h2>

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.title} className="rounded-xl border border-white/20 p-5">
            <h3 className="mb-4 font-bold text-forest-300">{group.title}</h3>
            <div className="space-y-4">
              {group.keys.map((key) => {
                const setting = settings.find((s) => s.key === key)
                if (!setting) return null
                return (
                  <div key={key}>
                    <label className="mb-1 block font-semibold text-white">{setting.label}</label>
                    {setting.description && (
                      <p className="mb-2 text-sm text-white/50">{setting.description}</p>
                    )}
                    <input
                      type={key.includes('minutes') || key.includes('max') ? 'number' : 'text'}
                      min={key.includes('max') || key.includes('minutes') ? '0' : undefined}
                      value={values[key] ?? setting.value}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      className="w-full max-w-md rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:border-forest-300"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-forest-500 px-8 py-3 font-bold text-white hover:bg-forest-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="font-semibold text-green-400">Settings saved!</span>}
        {error && <span className="text-sm text-red-300">{error}</span>}
      </div>
    </div>
  )
}
