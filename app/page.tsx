import { SCHOOLS } from '@/lib/schools'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Classroom Check-In / Out</h1>
        <p className="mt-2 text-gray-500">Choose your school</p>
      </div>
      <div className="grid w-full max-w-md gap-4">
        {SCHOOLS.map((s) => (
          <a
            key={s.id}
            href={`/${s.id}`}
            className="rounded-2xl bg-purple-800 px-8 py-6 text-center text-xl font-bold text-white shadow-sm transition hover:bg-purple-900"
          >
            {s.label}
          </a>
        ))}
      </div>
    </div>
  )
}
