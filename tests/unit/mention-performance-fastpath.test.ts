import { describe, it, expect } from 'vitest'
import { applyMentions } from '../../src/services/mention-resolution.service.js'

describe('mention fast path (T025)', () => {
  it('skips work when no @ present', () => {
    const text = 'This message has no placeholders and should be untouched.'
    const spyStart = performance.now()
    const result = applyMentions(text, { alice: { id: 'U1' } })
    const duration = performance.now() - spyStart
    expect(result.text).toBe(text)
    expect(result.summary.hadPlaceholders).toBe(false)
    // Should run extremely fast (<0.5ms on typical dev machine, allow some headroom)
    expect(duration).toBeLessThan(5)
  })

  it('processes when @ present', () => {
    const text = 'Ping @{alice}'
    const result = applyMentions(text, { alice: { id: 'U1' } })
    expect(result.text).toContain('<@U1>')
    expect(result.summary.hadPlaceholders).toBe(true)
    expect(result.summary.totalReplacements).toBe(1)
  })
})
