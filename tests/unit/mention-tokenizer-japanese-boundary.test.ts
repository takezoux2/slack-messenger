import { describe, it, expect } from 'vitest'
import { applyMentions } from '../../src/services/mention-resolution.service'

// New tests verifying Japanese punctuation treated as boundary enabling replacement

describe('mention tokenizer Japanese punctuation boundary', () => {
  it('replaces before Japanese comma (、)', () => {
    const mapping = { 開発: { id: 'U456' } }
    const input = '進捗 @開発、確認お願いします'
    const { text, summary } = applyMentions(input, mapping as any)
    expect(text).toContain('<@U456>、')
    expect(summary.totalReplacements).toBe(1)
  })
  it('replaces before Japanese full stop (。)', () => {
    const mapping = { 佐藤: { id: 'U123' } }
    const input = '報告 @佐藤。'
    const { text, summary } = applyMentions(input, mapping as any)
    expect(text).toContain('<@U123>。')
    expect(summary.totalReplacements).toBe(1)
  })
})
