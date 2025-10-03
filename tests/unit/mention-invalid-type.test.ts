import { describe, it, expect } from 'vitest'
// @ts-expect-error applyMentions not implemented yet
import { applyMentions } from '../../src/services/mention-resolution.service'

describe('invalid type fallback', () => {
  it('falls back to user when type missing or invalid', () => {
    const mapping = {
      a: { id: 'U1', type: 'x' },
      b: { id: 'U2' },
    } as any
    const input = 'Test @{a} @{b} '
    const { text } = applyMentions(input, mapping)
    expect(text).toContain('<@U1>')
    expect(text).toContain('<@U2>')
  })
})
