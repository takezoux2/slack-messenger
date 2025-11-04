import { describe, it, expect } from 'vitest'
import { ConfigValidationService } from '../../src/services/config-validation.service.js'
import type { ChannelConfiguration } from '../../src/models/channel-configuration'

function baseConfig(): ChannelConfiguration {
  return {
    filePath: 'channels.yaml',
    channelLists: [
      {
        name: 'default',
        channels: [{ identifier: 'C1234567890', type: 'id' }],
      },
    ],
  }
}

describe('mentions config validation (T026)', () => {
  const service = new ConfigValidationService()

  it('accepts valid mentions mapping with user/team types', () => {
    const config: ChannelConfiguration = {
      ...baseConfig(),
      mentions: {
        alice: { id: 'U111' },
        lead: { id: 'S222', type: 'team' },
      },
    }
    const result = service.validateChannelConfiguration(config)
    expect(result.isValid).toBe(true)
  })

  it('flags empty id and invalid type', () => {
    const config: ChannelConfiguration = {
      ...baseConfig(),
      mentions: {
        bad1: { id: '' },
        bad2: { id: 'U333', type: 'x' as any },
      },
    }
    const result = service.validateChannelConfiguration(config)
    expect(result.isValid).toBe(false)
    const fields = result.errors.map(e => e.field)
    expect(fields).toContain('mentions.bad1.id')
    expect(fields).toContain('mentions.bad2.type')
  })

  it('flags non-object mentions root', () => {
    const config: ChannelConfiguration = {
      ...baseConfig(),
      mentions: 123 as any,
    }
    const result = service.validateChannelConfiguration(config)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'mentions')).toBe(true)
  })
})

describe('sender identity validation', () => {
  const service = new ConfigValidationService()

  it('accepts valid sender identity configuration', () => {
    const config: ChannelConfiguration = {
      ...baseConfig(),
      senderIdentity: {
        name: 'Deploy Bot',
        iconEmoji: ':rocket:',
      },
    }

    const result = service.validateChannelConfiguration(config)
    expect(result.isValid).toBe(true)
  })

  it('rejects missing icon values', () => {
    const config: ChannelConfiguration = {
      ...baseConfig(),
      senderIdentity: {
        name: 'Deploy Bot',
      },
    }

    const result = service.validateChannelConfiguration(config)
    expect(result.isValid).toBe(false)
    expect(result.errors.map(e => e.field)).toContain('senderIdentity.icon')
  })

  it('rejects simultaneous emoji and URL icons', () => {
    const config: ChannelConfiguration = {
      ...baseConfig(),
      senderIdentity: {
        name: 'Deploy Bot',
        iconEmoji: ':rocket:',
        iconUrl: 'https://example.com/icon.png',
      },
    }

    const result = service.validateChannelConfiguration(config)
    expect(result.isValid).toBe(false)
    expect(result.errors.map(e => e.field)).toContain(
      'senderIdentity.iconEmoji'
    )
  })

  it('rejects invalid icon emoji format', () => {
    const config: ChannelConfiguration = {
      ...baseConfig(),
      senderIdentity: {
        name: 'Deploy Bot',
        iconEmoji: 'rocket',
      },
    }

    const result = service.validateChannelConfiguration(config)
    expect(result.isValid).toBe(false)
    expect(result.errors.map(e => e.field)).toContain(
      'senderIdentity.iconEmoji'
    )
  })

  it('rejects non-https icon URLs', () => {
    const config: ChannelConfiguration = {
      ...baseConfig(),
      senderIdentity: {
        name: 'Deploy Bot',
        iconUrl: 'http://example.com/icon.png',
      },
    }

    const result = service.validateChannelConfiguration(config)
    expect(result.isValid).toBe(false)
    expect(result.errors.map(e => e.field)).toContain(
      'senderIdentity.iconUrl'
    )
  })
})
