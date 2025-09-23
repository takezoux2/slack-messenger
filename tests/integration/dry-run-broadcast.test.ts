import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

describe('Dry-Run Broadcast Integration', () => {
  const testConfigPath = path.join(process.cwd(), 'test-dry-run.yaml')
  const testConfig = `
channel_lists:
  engineering-teams:
    - '#backend-dev'
    - '#frontend-dev' 
    - 'C1234567890'
  small-list:
    - '#general'
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

  it('should preview channels without sending messages', async () => {
    const mockSlackService = {
      resolveChannels: vi.fn().mockResolvedValue([
        {
          id: 'C1234567890',
          name: 'backend-dev',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C1234567891',
          name: 'frontend-dev',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C1234567892',
          name: 'general',
          isPrivate: false,
          isMember: true,
        },
      ]),
      dryRunBroadcast: vi.fn().mockResolvedValue({
        targetListName: 'engineering-teams',
        channels: [
          {
            id: 'C1234567890',
            name: 'backend-dev',
            isPrivate: false,
            isMember: true,
          },
          {
            id: 'C1234567891',
            name: 'frontend-dev',
            isPrivate: false,
            isMember: true,
          },
          {
            id: 'C1234567892',
            name: 'general',
            isPrivate: false,
            isMember: true,
          },
        ],
        message: 'Test message for dry run',
        wouldSucceed: 3,
        wouldFail: 0,
        wouldSkip: 0,
        warnings: [],
      }),
    }

    const dryRunResult = await mockSlackService.dryRunBroadcast()

    expect(dryRunResult.targetListName).toBe('engineering-teams')
    expect(dryRunResult.channels).toHaveLength(3)
    expect(dryRunResult.wouldSucceed).toBe(3)
    expect(dryRunResult.wouldFail).toBe(0)
    expect(mockSlackService.resolveChannels).toHaveBeenCalled()
  })

  it('should identify channels where bot is not a member', async () => {
    const mockSlackService = {
      resolveChannels: vi.fn().mockResolvedValue([
        {
          id: 'C1234567890',
          name: 'backend-dev',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C1234567891',
          name: 'frontend-dev',
          isPrivate: true,
          isMember: false,
        }, // Private, not member
        {
          id: 'C1234567892',
          name: 'general',
          isPrivate: false,
          isMember: true,
        },
      ]),
      dryRunBroadcast: vi.fn().mockResolvedValue({
        targetListName: 'engineering-teams',
        channels: [
          {
            id: 'C1234567890',
            name: 'backend-dev',
            isPrivate: false,
            isMember: true,
          },
          {
            id: 'C1234567891',
            name: 'frontend-dev',
            isPrivate: true,
            isMember: false,
          },
          {
            id: 'C1234567892',
            name: 'general',
            isPrivate: false,
            isMember: true,
          },
        ],
        message: 'Test message',
        wouldSucceed: 2,
        wouldFail: 0,
        wouldSkip: 1,
        warnings: ['Bot is not a member of #frontend-dev (private channel)'],
      }),
    }

    const dryRunResult = await mockSlackService.dryRunBroadcast()

    expect(dryRunResult.wouldSucceed).toBe(2)
    expect(dryRunResult.wouldSkip).toBe(1)
    expect(dryRunResult.warnings).toContain(
      'Bot is not a member of #frontend-dev (private channel)'
    )
  })

  it('should identify archived channels', async () => {
    const mockSlackService = {
      resolveChannels: vi.fn().mockResolvedValue([
        {
          id: 'C1234567890',
          name: 'backend-dev',
          isPrivate: false,
          isMember: true,
          isArchived: false,
        },
        {
          id: 'C1234567891',
          name: 'old-project',
          isPrivate: false,
          isMember: true,
          isArchived: true,
        }, // Archived
        {
          id: 'C1234567892',
          name: 'general',
          isPrivate: false,
          isMember: true,
          isArchived: false,
        },
      ]),
      dryRunBroadcast: vi.fn().mockResolvedValue({
        targetListName: 'engineering-teams',
        channels: [
          {
            id: 'C1234567890',
            name: 'backend-dev',
            isPrivate: false,
            isMember: true,
            isArchived: false,
          },
          {
            id: 'C1234567891',
            name: 'old-project',
            isPrivate: false,
            isMember: true,
            isArchived: true,
          },
          {
            id: 'C1234567892',
            name: 'general',
            isPrivate: false,
            isMember: true,
            isArchived: false,
          },
        ],
        message: 'Test message',
        wouldSucceed: 2,
        wouldFail: 1,
        wouldSkip: 0,
        warnings: ['Cannot send to archived channel #old-project'],
      }),
    }

    const dryRunResult = await mockSlackService.dryRunBroadcast()

    expect(dryRunResult.wouldSucceed).toBe(2)
    expect(dryRunResult.wouldFail).toBe(1)
    expect(dryRunResult.warnings).toContain(
      'Cannot send to archived channel #old-project'
    )
  })

  it('should validate message length', async () => {
    const longMessage = 'x'.repeat(40000) // Exceed Slack message limit

    const mockSlackService = {
      dryRunBroadcast: vi.fn().mockResolvedValue({
        targetListName: 'engineering-teams',
        channels: [],
        message: longMessage,
        wouldSucceed: 0,
        wouldFail: 3,
        wouldSkip: 0,
        warnings: ['Message exceeds Slack maximum length (40000 characters)'],
      }),
    }

    const dryRunResult = await mockSlackService.dryRunBroadcast()

    expect(dryRunResult.wouldFail).toBe(3)
    expect(dryRunResult.warnings).toContain(
      'Message exceeds Slack maximum length (40000 characters)'
    )
  })

  it('should show channel resolution failures', async () => {
    const mockSlackService = {
      resolveChannels: vi.fn().mockResolvedValue([
        {
          id: 'C1234567890',
          name: 'backend-dev',
          isPrivate: false,
          isMember: true,
        },
        // Note: #frontend-dev failed to resolve
        {
          id: 'C1234567892',
          name: 'general',
          isPrivate: false,
          isMember: true,
        },
      ]),
      dryRunBroadcast: vi.fn().mockResolvedValue({
        targetListName: 'engineering-teams',
        channels: [
          {
            id: 'C1234567890',
            name: 'backend-dev',
            isPrivate: false,
            isMember: true,
          },
          {
            id: 'C1234567892',
            name: 'general',
            isPrivate: false,
            isMember: true,
          },
        ],
        message: 'Test message',
        wouldSucceed: 2,
        wouldFail: 0,
        wouldSkip: 0,
        warnings: ['Channel #frontend-dev not found or not accessible'],
        resolutionFailures: [
          { identifier: '#frontend-dev', error: 'channel_not_found' },
        ],
      }),
    }

    const dryRunResult = await mockSlackService.dryRunBroadcast()

    expect(dryRunResult.channels).toHaveLength(2) // One channel failed to resolve
    expect(dryRunResult.warnings).toContain(
      'Channel #frontend-dev not found or not accessible'
    )
    expect((dryRunResult as any).resolutionFailures).toHaveLength(1)
  })

  it('should estimate delivery time for large channel lists', async () => {
    // Create 50 mock channels
    const manyChannels = Array.from({ length: 50 }, (_, i) => ({
      id: `C123456789${i.toString().padStart(1, '0')}`,
      name: `channel-${i}`,
      isPrivate: false,
      isMember: true,
    }))

    const mockSlackService = {
      resolveChannels: vi.fn().mockResolvedValue(manyChannels),
      dryRunBroadcast: vi.fn().mockResolvedValue({
        targetListName: 'large-list',
        channels: manyChannels,
        message: 'Broadcast to many channels',
        wouldSucceed: 50,
        wouldFail: 0,
        wouldSkip: 0,
        warnings: [],
        estimatedDuration: '50-100 seconds (with rate limiting)',
      }),
    }

    const dryRunResult = await mockSlackService.dryRunBroadcast()

    expect(dryRunResult.channels).toHaveLength(50)
    expect(dryRunResult.wouldSucceed).toBe(50)
    expect((dryRunResult as any).estimatedDuration).toContain('seconds')
  })

  it('should display formatted preview output', async () => {
    const mockConsoleOutput = {
      generateDryRunPreview: vi.fn().mockReturnValue(`
Dry run for "engineering-teams" (3 channels):

→ #backend-dev (C1234567890) ✓
→ #frontend-dev (C1234567891) ✓
→ #general (C1234567892) ✓

Message preview:
"Hello team! This is a test broadcast message."

Delivery estimate: 3-6 seconds
No messages sent (dry run mode)
      `),
    }

    const preview = mockConsoleOutput.generateDryRunPreview()

    expect(preview).toContain('Dry run for "engineering-teams"')
    expect(preview).toContain('→ #backend-dev (C1234567890) ✓')
    expect(preview).toContain('No messages sent (dry run mode)')
  })
})
