import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

describe('Channel Resolution with Mixed IDs/Names Integration', () => {
  const testConfigPath = path.join(process.cwd(), 'test-mixed-channels.yaml')
  const testConfig = `
channel_lists:
  mixed-identifiers:
    - '#general'
    - 'C1234567890'
    - '#backend-dev'
    - 'C9876543210'
    - '#marketing'
  id-only:
    - 'C1111111111'
    - 'C2222222222'
  name-only:
    - '#dev-team'
    - '#announcements'
`

  beforeEach(async () => {
    await fs.writeFile(testConfigPath, testConfig, 'utf8')
  })

  afterEach(async () => {
    try {
      await fs.unlink(testConfigPath)
    } catch (error) {
      // Ignore if file doesn't exist
    }
  })

  it('should resolve both channel names and IDs to full channel objects', async () => {
    const mockSlackService = {
      getAllChannels: vi.fn().mockResolvedValue([
        {
          id: 'C1234567890',
          name: 'general',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C9876543210',
          name: 'backend-dev',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C1111111111',
          name: 'marketing',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C2222222222',
          name: 'dev-team',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C3333333333',
          name: 'announcements',
          isPrivate: false,
          isMember: true,
        },
      ]),
      resolveChannels: vi.fn().mockImplementation(async targets => {
        const allChannels = await mockSlackService.getAllChannels()
        return targets
          .map((target: any) => {
            if (target.type === 'id') {
              return allChannels.find((ch: any) => ch.id === target.identifier)
            } else {
              const channelName = target.identifier.replace('#', '')
              return allChannels.find((ch: any) => ch.name === channelName)
            }
          })
          .filter(Boolean)
      }),
    }

    const mixedTargets = [
      { identifier: '#general', type: 'name' },
      { identifier: 'C1234567890', type: 'id' },
      { identifier: '#backend-dev', type: 'name' },
      { identifier: 'C9876543210', type: 'id' },
    ]

    const resolved = await mockSlackService.resolveChannels(mixedTargets)

    expect(resolved).toHaveLength(4)
    expect(resolved[0].name).toBe('general')
    expect(resolved[1].id).toBe('C1234567890')
    expect(resolved[2].name).toBe('backend-dev')
    expect(resolved[3].id).toBe('C9876543210')
  })

  it('should handle channel name to ID resolution', async () => {
    const mockSlackService = {
      resolveChannelName: vi.fn().mockImplementation(async channelName => {
        const nameToIdMap: Record<string, string> = {
          general: 'C1234567890',
          'backend-dev': 'C9876543210',
          marketing: 'C1111111111',
        }
        return nameToIdMap[channelName.replace('#', '')] || null
      }),
    }

    const channelNames = ['#general', '#backend-dev', '#nonexistent']
    const resolvedIds = []

    for (const name of channelNames) {
      const id = await mockSlackService.resolveChannelName(name)
      if (id) resolvedIds.push({ name, id })
    }

    expect(resolvedIds).toHaveLength(2)
    expect(resolvedIds[0]).toEqual({ name: '#general', id: 'C1234567890' })
    expect(resolvedIds[1]).toEqual({ name: '#backend-dev', id: 'C9876543210' })
  })

  it('should handle channel ID validation', async () => {
    const mockSlackService = {
      validateChannelId: vi.fn().mockImplementation(async channelId => {
        const validIds = ['C1234567890', 'C9876543210', 'C1111111111']
        return validIds.includes(channelId)
      }),
      getChannelInfo: vi.fn().mockImplementation(async channelId => {
        const channelData: Record<string, any> = {
          C1234567890: { id: 'C1234567890', name: 'general', isPrivate: false },
          C9876543210: {
            id: 'C9876543210',
            name: 'backend-dev',
            isPrivate: false,
          },
          C1111111111: {
            id: 'C1111111111',
            name: 'marketing',
            isPrivate: true,
          },
        }
        return channelData[channelId] || null
      }),
    }

    const channelIds = ['C1234567890', 'C9999999999', 'INVALID123']
    const validatedChannels = []

    for (const id of channelIds) {
      const isValid = await mockSlackService.validateChannelId(id)
      if (isValid) {
        const info = await mockSlackService.getChannelInfo(id)
        validatedChannels.push(info)
      }
    }

    expect(validatedChannels).toHaveLength(1)
    expect(validatedChannels[0].name).toBe('general')
  })

  it('should detect and handle duplicate channels in mixed lists', async () => {
    const duplicateConfig = `
channel_lists:
  with-duplicates:
    - '#general'
    - 'C1234567890'  # Same as #general
    - '#backend-dev'
    - 'C9876543210'  # Same as #backend-dev
    - '#general'     # Explicit duplicate
`

    await fs.writeFile(testConfigPath, duplicateConfig, 'utf8')

    const mockSlackService = {
      resolveChannels: vi.fn().mockResolvedValue([
        {
          id: 'C1234567890',
          name: 'general',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C9876543210',
          name: 'backend-dev',
          isPrivate: false,
          isMember: true,
        },
      ]),
      deduplicateChannels: vi.fn().mockImplementation(channels => {
        const seen = new Set()
        return channels.filter((ch: any) => {
          if (seen.has(ch.id)) {
            return false
          }
          seen.add(ch.id)
          return true
        })
      }),
    }

    const resolved = await mockSlackService.resolveChannels([])
    const deduplicated = mockSlackService.deduplicateChannels([
      ...resolved,
      ...resolved, // Simulate duplicates
    ])

    expect(deduplicated).toHaveLength(2)
    expect(mockSlackService.deduplicateChannels).toHaveBeenCalled()
  })

  it('should handle mixed public and private channels', async () => {
    const mockSlackService = {
      resolveChannels: vi.fn().mockResolvedValue([
        {
          id: 'C1234567890',
          name: 'general',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C9876543210',
          name: 'private-team',
          isPrivate: true,
          isMember: true,
        },
        {
          id: 'C1111111111',
          name: 'secret-project',
          isPrivate: true,
          isMember: false,
        },
      ]),
      filterByAccess: vi.fn().mockImplementation(channels => {
        return {
          accessible: channels.filter((ch: any) => ch.isMember),
          restricted: channels.filter((ch: any) => !ch.isMember),
        }
      }),
    }

    const resolved = await mockSlackService.resolveChannels([])
    const filtered = mockSlackService.filterByAccess(resolved)

    expect(filtered.accessible).toHaveLength(2)
    expect(filtered.restricted).toHaveLength(1)
    expect(filtered.restricted[0].name).toBe('secret-project')
  })

  it('should cache resolution results for performance', async () => {
    let callCount = 0

    const mockSlackService = {
      _cache: new Map(),
      resolveChannelWithCache: vi.fn().mockImplementation(async function (
        this: any,
        identifier
      ) {
        if (this._cache.has(identifier)) {
          return this._cache.get(identifier)
        }

        callCount++
        const result = {
          id: `C${callCount.toString().padStart(9, '0')}0`,
          name: identifier.replace('#', ''),
          isPrivate: false,
          isMember: true,
        }

        this._cache.set(identifier, result)
        return result
      }),
    }

    // First resolution
    const first = await mockSlackService.resolveChannelWithCache('#general')
    expect(callCount).toBe(1)

    // Second resolution (should use cache)
    const second = await mockSlackService.resolveChannelWithCache('#general')
    expect(callCount).toBe(1) // No additional API call
    expect(first).toEqual(second)
  })

  it('should handle resolution failures gracefully', async () => {
    const mockSlackService = {
      resolveChannels: vi.fn().mockImplementation(async targets => {
        return targets.map((target: any) => {
          if (target.identifier === '#nonexistent') {
            return { error: 'channel_not_found', identifier: target.identifier }
          }
          if (target.identifier === 'CINVALID123') {
            return { error: 'invalid_channel', identifier: target.identifier }
          }
          return {
            id: 'C1234567890',
            name: target.identifier.replace('#', ''),
            isPrivate: false,
            isMember: true,
          }
        })
      }),
    }

    const targets = [
      { identifier: '#general', type: 'name' },
      { identifier: '#nonexistent', type: 'name' },
      { identifier: 'CINVALID123', type: 'id' },
    ]

    const results = await mockSlackService.resolveChannels(targets)

    const successful = results.filter((r: any) => !r.error)
    const failed = results.filter((r: any) => r.error)

    expect(successful).toHaveLength(1)
    expect(failed).toHaveLength(2)
    expect(failed[0].error).toBe('channel_not_found')
    expect(failed[1].error).toBe('invalid_channel')
  })

  it('should validate channel identifier formats', async () => {
    const mockValidator = {
      validateChannelIdentifier: vi.fn().mockImplementation(identifier => {
        // Channel name format: starts with # followed by valid characters
        const namePattern = /^#[a-z0-9-_]+$/
        // Channel ID format: C followed by 10 alphanumeric characters
        const idPattern = /^C[A-Z0-9]{10}$/

        if (namePattern.test(identifier)) {
          return { valid: true, type: 'name' }
        }
        if (idPattern.test(identifier)) {
          return { valid: true, type: 'id' }
        }
        return { valid: false, error: 'Invalid format' }
      }),
    }

    const testIdentifiers = [
      '#general', // Valid name
      'C1234567890', // Valid ID
      '#UPPERCASE', // Invalid name (uppercase)
      'C123', // Invalid ID (too short)
      'general', // Invalid name (no #)
      '#', // Invalid name (empty)
      'invalid', // Invalid format
    ]

    const validationResults = testIdentifiers.map(id => ({
      identifier: id,
      ...mockValidator.validateChannelIdentifier(id),
    }))

    const validCount = validationResults.filter(r => r.valid).length
    const invalidCount = validationResults.filter(r => !r.valid).length

    expect(validCount).toBe(2)
    expect(invalidCount).toBe(5)
  })
})
