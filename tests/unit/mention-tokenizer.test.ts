import { describe, it, expect } from 'vitest'

// @ts-expect-error extractTokens not implemented yet
import { extractTokens } from '../../src/services/mention-resolution.service'

describe('mention tokenizer', () => {
  it('detects brace and no-brace placeholders', () => {
    const text = 'Hello @{alice} and @team '
    const tokens = extractTokens(text)
    const names = tokens.map((t: any) => t.name).sort()
    expect(names).toEqual(['alice', 'team'])
  })

  it('skips inside fenced code, inline code, and block quotes', () => {
    const text = '`@one`\n> @{two}\n```\n@{three}\n```\n@four '
    const tokens = extractTokens(text)
    const names = tokens.map((t: any) => t.name)
    expect(names).toEqual(['four'])
  })

  it('ignores empty brace form', () => {
    const text = 'Hello @{} world'
    const tokens = extractTokens(text)
    expect(tokens).toHaveLength(0)
  })
})
