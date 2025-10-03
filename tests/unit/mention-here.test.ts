import { describe, it, expect } from 'vitest'
// @ts-expect-error applyMentions not implemented yet
import { applyMentions } from '../../src/services/mention-resolution.service'

describe('built-in here token', () => {
  it('replaces @here and @{here} even without mapping entry', () => {
    const input = 'Attention @here and also @{here} '
    const { text, summary } = applyMentions(input, {})
    expect(text).toMatch(/<!here>.*<!here>/)
    expect(summary.replacements.here).toBe(2)
  })
})
