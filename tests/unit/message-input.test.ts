import { describe, it, expect } from 'vitest'
import { MessageInput } from '../../src/models/message-input.js'

describe('MessageInput', () => {
  it('rstrip should remove trailing whitespace and newlines only', () => {
    const text = '  start\nline\n\n  '
    const trimmed = MessageInput.rstrip(text)
    expect(trimmed).toBe('  start\nline')
  })

  it('preview200 should cap length to 200 chars', () => {
    const long = 'a'.repeat(500)
    expect(MessageInput.preview200(long)).toHaveLength(200)
  })

  it('fromFileContent enforces 1..2000 after rstrip', () => {
    expect(() =>
      MessageInput.fromFileContent('  \n\n', 'C:/tmp/msg.md')
    ).toThrow(/cannot be empty|empty message/i)

    const ok = 'a'.repeat(2000)
    const mi = MessageInput.fromFileContent(ok + '\n\n', 'C:/tmp/msg.md')
    expect(mi.content).toHaveLength(2000)
    expect(mi.isTooLong()).toBe(false)

    const tooLong = 'a'.repeat(2001)
    expect(() =>
      MessageInput.fromFileContent(tooLong, 'C:/tmp/msg.md')
    ).toThrow(/2000/i)
  })

  it('fromInline preserves existing 40k behavior (no 2k cap)', () => {
    const inline = MessageInput.fromInline('a'.repeat(40000))
    expect(inline.content.length).toBe(40000)
    expect(inline.isTooLong(40000)).toBe(false)
  })
})
