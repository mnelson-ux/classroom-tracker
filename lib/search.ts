// Match a "Last, First" name against a free-form query.
// Ignores comma/order so "john", "smith", "john smith", and "smith john"
// all match "Smith, John".
export function nameMatches(name: string, query: string): boolean {
  const haystack = name.toLowerCase().replace(/,/g, ' ')
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  return tokens.every((t) => haystack.includes(t))
}
