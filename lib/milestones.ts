/** Pure milestone rules. The network writes live in milestone-store.ts. */
export type Milestone = { name: string; description: string; timing: string }

export const MAX_MILESTONES = 30
const NAME_LIMIT = 200
const DESCRIPTION_LIMIT = 2000
const TIMING_LIMIT = 120

const clean = (value: unknown, limit: number) => String(value ?? '').trim().slice(0, limit)

/** Drops empty rows. A row with a description or timing but no name is an error the seeker must fix. */
export function sanitizeMilestones(input: unknown): { milestones: Milestone[]; error: string | null } {
  if (input === undefined || input === null || input === '') return { milestones: [], error: null }
  if (!Array.isArray(input)) return { milestones: [], error: 'Milestones could not be read. Please try again.' }
  const milestones: Milestone[] = []
  for (const row of input) {
    const source = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
    const item = {
      name: clean(source.name, NAME_LIMIT),
      description: clean(source.description, DESCRIPTION_LIMIT),
      timing: clean(source.timing, TIMING_LIMIT),
    }
    if (!item.name && !item.description && !item.timing) continue
    if (!item.name) return { milestones: [], error: 'Every milestone needs a name.' }
    milestones.push(item)
  }
  if (milestones.length > MAX_MILESTONES) return { milestones: [], error: `Please list at most ${MAX_MILESTONES} milestones.` }
  return { milestones, error: null }
}
