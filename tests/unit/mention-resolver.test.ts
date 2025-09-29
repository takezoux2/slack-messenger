import { describe, it, expect } from 'vitest'

// @ts-expect-error applyMentions not implemented yet
import { applyMentions } from '../../src/services/mention-resolution.service'

describe('mention resolver', () => {
  it('applies mapping object entries with id and optional type', () => {
    const mapping = {
      alice: { id: 'U111AAA' },
      team: { id: 'S999TEAM', type: 'team' },
    }
    const input = 'Hi @{alice} and @team '
    const { text, summary } = applyMentions(input, mapping)
    expect(text).toContain('<@U111AAA>')
    expect(text).toContain('<!subteam^S999TEAM>')
    expect(summary.replacements.alice).toBe(1)
    expect(summary.replacements.team).toBe(1)
    expect(summary.totalReplacements).toBe(2)
  })

  it('keeps unmapped placeholders literal & tracks unresolved order', () => {
    const mapping = { alice: { id: 'U111AAA' } }
    const input = 'Hi @{alice} @{ghost} @unknown '
    const { text, summary } = applyMentions(input, mapping)
    expect(text).toContain('<@U111AAA>')
    expect(text).toContain('@{ghost}')
    expect(text).toContain('@unknown ')
    expect(summary.unresolved).toEqual(['@{ghost}', '@unknown'])
  })

  it('is case-sensitive and last duplicate key wins', () => {
    const mapping: any = {
      alice: { id: 'U111OLD' },
      ALICE: { id: 'U222UPPER' },
    }
    // Simulate later overwrite
    mapping.alice = { id: 'U333NEW' }
    const input = 'Test @{alice} @{ALICE} '
    const { text } = applyMentions(input, mapping)
    expect(text).toContain('<@U333NEW>')
    expect(text).toContain('<@U222UPPER>')
  })
})
