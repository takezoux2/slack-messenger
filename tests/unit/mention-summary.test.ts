import { describe, it, expect } from 'vitest'

// @ts-expect-error applyMentions not implemented yet
import { applyMentions } from '../../src/services/mention-resolution.service'

describe('mention summary generation', () => {
  it('produces alphabetical ordering for replacement keys', () => {
    const mapping = {
      zebra: { id: 'U3' },
      apple: { id: 'U1' },
      mango: { id: 'U2' },
    }
    const input = 'Test @{zebra} @{apple} @{mango} '
    const { summary } = applyMentions(input, mapping)
    expect(Object.keys(summary.replacements)).toEqual([
      'apple',
      'mango',
      'zebra',
    ])
  })

  it('none case yields Placeholders: none via format helper', () => {
    const mapping = {} as any
    const input = 'Plain message with no tokens.'
    const { summary } = applyMentions(input, mapping)
    expect(summary.hadPlaceholders).toBe(false)
  })
})
