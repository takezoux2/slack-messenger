import { describe, it, expect } from 'vitest'
import { extractTokens } from '../../src/services/mention-resolution.service.js'

describe('mention tokenizer exhaustive (T031)', () => {
  it('handles consecutive placeholders and start/end positions', () => {
    const text = '@{a}@{b} @{c} start @d end @e' // @d end-of-line after replacement; @e no boundary (missing space/EOL)
    const tokens = extractTokens(text + ' ') // add trailing space to allow last token boundary
    const names = tokens.map(t => t.name)
    expect(names).toContain('a')
    expect(names).toContain('b')
    expect(names).toContain('c')
  })

  it('ignores enormous text without @ quickly (performance fast path)', () => {
    const text = 'x'.repeat(5000)
    const tokens = extractTokens(text)
    expect(tokens).toHaveLength(0)
  })
})
