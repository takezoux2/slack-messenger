import { describe, it, expect } from 'vitest'
// @ts-expect-error applyMentions not implemented yet
import { applyMentions } from '../../src/services/mention-resolution.service'

describe('mention tokenizer boundary (punctuation)', () => {
  it('does not replace no-brace placeholder followed by comma', () => {
    const mapping = { name: { id: 'U1' } }
    const input = 'Hello @name, world' // comma adjacency means no replacement for no-brace form
    const { text, summary } = applyMentions(input, mapping)
    expect(text).toContain('@name,')
    expect(summary.totalReplacements).toBe(0)
  })

  it('replaces no-brace placeholder at end-of-line', () => {
    const mapping = { name: { id: 'U1' } }
    const input = 'Hello @name' // end-of-line boundary OK
    const { text, summary } = applyMentions(input, mapping)
    expect(text).toContain('<@U1>')
    expect(summary.totalReplacements).toBe(1)
  })
})
