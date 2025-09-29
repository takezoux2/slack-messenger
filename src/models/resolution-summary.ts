/**
 * Aggregated summary after applying mention placeholder resolution.
 */
export interface ResolutionSummary {
  /** Counts by placeholder key (sorted alphabetically for output formatting) */
  replacements: Record<string, number>
  /** Unresolved token literals in order of first appearance */
  unresolved: string[]
  /** Total number of replacements (sum of replacement counts) */
  totalReplacements: number
  /** True if any placeholder patterns (resolved or unresolved) were detected */
  hadPlaceholders: boolean
}
