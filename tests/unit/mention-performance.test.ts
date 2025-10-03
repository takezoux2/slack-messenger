import { describe, it, expect } from 'vitest'
import { applyMentions } from '../../src/services/mention-resolution.service.js'

describe('mention performance benchmark (T032)', () => {
  it('processes 500 placeholders within reasonable time (informational)', () => {
    const mapping: Record<string, any> = { user: { id: 'U1' } }
    const parts: string[] = []
    for (let i = 0; i < 500; i++) parts.push('@user ')
    const text = parts.join('')
    const start = performance.now()
    const { summary } = applyMentions(text, mapping)
    const duration = performance.now() - start
    expect(summary.totalReplacements).toBe(500)
    // Non-fatal assertion: allow generous limit due to CI variance
    expect(duration).toBeLessThan(50)
  })
})
