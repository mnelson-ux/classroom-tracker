// The two schools this app serves. `id` is used in URLs (/hs, /ms) and the
// `school` column in the database; `label` is what admins/teachers see.
export const SCHOOLS = [
  { id: 'hs', label: 'High School' },
  { id: 'ms', label: 'Middle School' },
] as const

export type SchoolId = (typeof SCHOOLS)[number]['id']

export function isSchool(v: string | null | undefined): v is SchoolId {
  return v === 'hs' || v === 'ms'
}

export function schoolLabel(id: string | null | undefined): string {
  return SCHOOLS.find((s) => s.id === id)?.label ?? 'High School'
}
