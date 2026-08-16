// Input guards for values that get interpolated into PostgREST filter strings
// (e.g. `.or(...)`). Rejecting anything that isn't a plain UUID/enum closes the
// door on filter-injection via crafted request bodies or query params.

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}
