import { describe, it, expect } from 'vitest'

// NOTE: This test is added before implementation (will fail until service & types exist)
// Expected future API per plan: applyMentions(text: string, mapping: Record<string,string>) => { text, summary }
// If the actual exported names differ when implemented, adjust imports accordingly.
// Intentionally import the yet-to-be-created service to enforce TDD failure.
import { applyMentions } from '../../src/services/mention-resolution.service'

describe('mention resolution – Unicode (Japanese) placeholder names', () => {
  it('replaces Japanese brace and no-brace placeholders using global mapping', () => {
    const mapping = {
      佐藤: 'U123JP',
      開発: 'U456DEV',
    }
    const input = 'プロジェクト @{佐藤} さん、@開発 チームの成果を共有します。'
    const { text, summary } = applyMentions(input, mapping as any)
    expect(text).toContain('<@U123JP>')
    // No-brace form should preserve following space
    expect(text).toMatch(/<@U456DEV> チーム/)
    // Ensure brace form punctuation/spacing preserved around converted token
    expect(text).toMatch(/プロジェクト <@U123JP> さん/)
    expect(summary.replacements['佐藤']).toBe(1)
    expect(summary.replacements['開発']).toBe(1)
    expect(summary.totalReplacements).toBe(2)
    expect(summary.unresolved).toHaveLength(0)
  })

  it('does not replace no-brace placeholder followed by punctuation (boundary rule)', () => {
    const mapping = { 開発: 'U456DEV' }
    const input = '報告: @開発, 進捗確認。'
    const { text, summary } = applyMentions(input, mapping as any)
    // Should remain literal because followed by comma, not space or EOL
    expect(text).toContain('@開発,')
    expect(text).not.toContain('<@U456DEV>')
    expect(summary.totalReplacements).toBe(0)
    expect(
      Object.keys(summary.replacements).length === 0 ||
        summary.replacements['開発'] === undefined
    ).toBeTruthy()
  })
})
