import { describe, it, expect } from 'vitest'

// Contract test for summary output formatting.
// Intentionally imports (future) API that does not yet exist to enforce failure until implemented.
// Expected future exported helper (can be implemented in mention-resolution service or console service layer):
//   formatResolutionSummary(summary: ResolutionSummary): string[]
// We design the test around deterministic ordering & wording per contract spec.

// @ts-expect-error - not implemented yet
import { formatResolutionSummary } from '../../src/services/mention-resolution.service'

describe('CLI Mention Resolution Contract', () => {
  it('formats replacements + none unresolved', () => {
    const summary = {
      replacements: { alice: 2, 'team-lead': 1 },
      unresolved: [],
      totalReplacements: 3,
      hadPlaceholders: true,
    }
    const lines = formatResolutionSummary(summary)
    expect(lines[0]).toBe('Replacements: alice=2, team-lead=1 (total=3)')
    expect(lines[1]).toBe('Unresolved: none')
  })

  it('formats unresolved list preserving order of appearance', () => {
    const summary = {
      replacements: { alice: 1 },
      unresolved: ['@{ghost}', '@unknown'],
      totalReplacements: 1,
      hadPlaceholders: true,
    }
    const lines = formatResolutionSummary(summary)
    expect(lines[0]).toBe('Replacements: alice=1 (total=1)')
    expect(lines[1]).toBe('Unresolved: @{ghost}, @unknown')
  })

  it('formats none case (no placeholders at all)', () => {
    const summary = {
      replacements: {},
      unresolved: [],
      totalReplacements: 0,
      hadPlaceholders: false,
    }
    const lines = formatResolutionSummary(summary)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('Placeholders: none')
  })
})
