import { describe, it, expect } from 'vitest'
import { CliService } from '../../src/services/cli.service.js'

describe('CLI parsing — --message-file', () => {
  it('parses send-message with only --message-file', () => {
    const cli = new CliService()
    const options = cli.parseArgs([
      'node',
      'main.js',
      'send-message',
      'C1234567890',
      '--message-file',
      'notes.md',
    ])
    expect(options.command).toBe('send-message')
    expect(options.channelId).toBe('C1234567890')
    expect(options.messageFile).toBe('notes.md')
    expect(options.message).toBeUndefined()
  })

  it('errors when both message and --message-file are provided (send-message)', () => {
    const cli = new CliService()
    const options = cli.parseArgs([
      'node',
      'main.js',
      'send-message',
      'C1234567890',
      'Hello',
      '--message-file',
      'notes.md',
    ])
    expect(options.validationErrors).toContain(
      'Provide either a message or --message-file, not both'
    )
  })

  it('parses broadcast with only --message-file', () => {
    const cli = new CliService()
    const options = cli.parseArgs([
      'node',
      'main.js',
      'broadcast',
      'all-teams',
      '--message-file',
      'notes.md',
    ])
    expect(options.command).toBe('broadcast')
    expect(options.channelList).toBe('all-teams')
    expect(options.messageFile).toBe('notes.md')
    expect(options.message).toBeUndefined()
  })
})
