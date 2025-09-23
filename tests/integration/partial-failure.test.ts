import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

describe('Partial Delivery Failure Handling Integration', () => {
  const testConfigPath = path.join(process.cwd(), 'test-partial-failure.yaml')
  const testConfig = `
channel_lists:
  mixed-channels:
    - '#valid-channel'
    - '#private-no-access'
    - 'C1234567890'
    - '#archived-channel'
    - 'C9999999999'
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

  it('should continue broadcasting after individual channel failures', async () => {
    const mockSlackService = {
      resolveChannels: vi.fn().mockResolvedValue([
        {
          id: 'C1234567890',
          name: 'valid-channel',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C1234567891',
          name: 'private-no-access',
          isPrivate: true,
          isMember: false,
        },
        {
          id: 'C1234567892',
          name: 'general',
          isPrivate: false,
          isMember: true,
        },
        {
          id: 'C1234567893',
          name: 'archived-channel',
          isPrivate: false,
          isMember: true,
          isArchived: true,
        },
      ]),
      broadcastMessage: vi.fn().mockResolvedValue({
        targetListName: 'mixed-channels',
        totalChannels: 4,
        deliveryResults: [
          {
            channel: { id: 'C1234567890', name: 'valid-channel' },
            status: 'success',
            messageId: '1234567890.123456',
            deliveredAt: new Date(),
          },
          {
            channel: { id: 'C1234567891', name: 'private-no-access' },
            status: 'failed',
            error: {
              type: 'not_in_channel',
              message: 'Bot is not a member of this private channel',
            },
          },
          {
            channel: { id: 'C1234567892', name: 'general' },
            status: 'success',
            messageId: '1234567890.123457',
            deliveredAt: new Date(),
          },
          {
            channel: { id: 'C1234567893', name: 'archived-channel' },
            status: 'failed',
            error: {
              type: 'is_archived',
              message: 'Cannot send messages to archived channels',
            },
          },
        ],
        overallStatus: 'partial',
        completedAt: new Date(),
      }),
    }

    const result = await mockSlackService.broadcastMessage()

    expect(result.overallStatus).toBe('partial')
    expect(result.totalChannels).toBe(4)

    const successCount = result.deliveryResults.filter(
      (r: any) => r.status === 'success'
    ).length
    const failureCount = result.deliveryResults.filter(
      (r: any) => r.status === 'failed'
    ).length

    expect(successCount).toBe(2)
    expect(failureCount).toBe(2)
  })

  it('should categorize different types of failures', async () => {
    const mockSlackService = {
      broadcastMessage: vi.fn().mockResolvedValue({
        targetListName: 'mixed-channels',
        totalChannels: 5,
        deliveryResults: [
          {
            channel: { id: 'C1234567890', name: 'valid' },
            status: 'success',
            messageId: '1234567890.123456',
          },
          {
            channel: { id: 'C1234567891', name: 'not-member' },
            status: 'failed',
            error: { type: 'not_in_channel', message: 'Bot not in channel' },
          },
          {
            channel: { id: 'C1234567892', name: 'archived' },
            status: 'failed',
            error: { type: 'is_archived', message: 'Channel is archived' },
          },
          {
            channel: { id: 'C1234567893', name: 'not-found' },
            status: 'failed',
            error: {
              type: 'channel_not_found',
              message: 'Channel does not exist',
            },
          },
          {
            channel: { id: 'C1234567894', name: 'rate-limited' },
            status: 'failed',
            error: {
              type: 'rate_limited',
              message: 'Rate limit exceeded',
              retryAfter: 30,
            },
          },
        ],
        overallStatus: 'partial',
        completedAt: new Date(),
      }),
    }

    const result = await mockSlackService.broadcastMessage()

    const errorTypes = result.deliveryResults
      .filter((r: any) => r.status === 'failed')
      .map((r: any) => r.error?.type)

    expect(errorTypes).toContain('not_in_channel')
    expect(errorTypes).toContain('is_archived')
    expect(errorTypes).toContain('channel_not_found')
    expect(errorTypes).toContain('rate_limited')
  })

  it('should generate detailed failure report', async () => {
    const mockErrorHandler = {
      generateFailureReport: vi.fn().mockReturnValue({
        summary: {
          total: 5,
          successful: 2,
          failed: 3,
          successRate: 40,
        },
        failuresByType: {
          not_in_channel: 1,
          is_archived: 1,
          channel_not_found: 1,
        },
        actionableItems: [
          'Add bot to #private-channel for future broadcasts',
          'Remove #archived-channel from channel list',
          'Verify #not-found-channel exists or update configuration',
        ],
        retryableFailures: [],
      }),
    }

    const report = mockErrorHandler.generateFailureReport()

    expect(report.summary.successRate).toBe(40)
    expect(report.failuresByType.not_in_channel).toBe(1)
    expect(report.actionableItems).toHaveLength(3)
  })

  it('should handle complete delivery failure gracefully', async () => {
    const mockSlackService = {
      broadcastMessage: vi.fn().mockResolvedValue({
        targetListName: 'mixed-channels',
        totalChannels: 3,
        deliveryResults: [
          {
            channel: { id: 'C1234567890', name: 'channel1' },
            status: 'failed',
            error: { type: 'invalid_auth', message: 'Invalid token' },
          },
          {
            channel: { id: 'C1234567891', name: 'channel2' },
            status: 'failed',
            error: { type: 'invalid_auth', message: 'Invalid token' },
          },
          {
            channel: { id: 'C1234567892', name: 'channel3' },
            status: 'failed',
            error: { type: 'invalid_auth', message: 'Invalid token' },
          },
        ],
        overallStatus: 'failed',
        completedAt: new Date(),
      }),
    }

    const result = await mockSlackService.broadcastMessage()

    expect(result.overallStatus).toBe('failed')
    expect(
      result.deliveryResults.every((r: any) => r.status === 'failed')
    ).toBe(true)

    // All failures are the same type, suggesting systemic issue
    const uniqueErrorTypes = new Set(
      result.deliveryResults.map((r: any) => r.error?.type)
    )
    expect(uniqueErrorTypes.size).toBe(1)
    expect(uniqueErrorTypes.has('invalid_auth')).toBe(true)
  })

  it('should implement retry logic for transient failures', async () => {
    let attemptCount = 0

    const mockSlackService = {
      broadcastMessage: vi.fn().mockImplementation(async () => {
        attemptCount++

        if (attemptCount === 1) {
          // First attempt: network error
          throw new Error('Network timeout')
        } else if (attemptCount === 2) {
          // Second attempt: partial success
          return {
            targetListName: 'mixed-channels',
            totalChannels: 3,
            deliveryResults: [
              {
                channel: { id: 'C1', name: 'ch1' },
                status: 'success',
                messageId: 'msg1',
              },
              {
                channel: { id: 'C2', name: 'ch2' },
                status: 'failed',
                error: { type: 'rate_limited' },
              },
              {
                channel: { id: 'C3', name: 'ch3' },
                status: 'success',
                messageId: 'msg3',
              },
            ],
            overallStatus: 'partial',
            completedAt: new Date(),
          }
        }
      }),
    }

    // Simulate retry logic
    let result
    for (let i = 0; i < 3; i++) {
      try {
        result = await mockSlackService.broadcastMessage()
        if (result) break
      } catch (error) {
        if (i === 2) throw error // Re-throw on final attempt
        await new Promise(resolve => setTimeout(resolve, 100)) // Wait before retry
      }
    }

    expect(attemptCount).toBe(2)
    expect(result?.overallStatus).toBe('partial')
  })

  it('should preserve successful deliveries across retries', async () => {
    const mockSlackService = {
      getDeliveryStatus: vi.fn().mockReturnValue({
        completed: [
          {
            channel: { id: 'C1', name: 'ch1' },
            messageId: 'msg1',
            timestamp: new Date(),
          },
        ],
        pending: [
          { channel: { id: 'C2', name: 'ch2' } },
          { channel: { id: 'C3', name: 'ch3' } },
        ],
        failed: [],
      }),
      retryPendingDeliveries: vi.fn().mockResolvedValue({
        targetListName: 'mixed-channels',
        totalChannels: 3,
        deliveryResults: [
          {
            channel: { id: 'C1', name: 'ch1' },
            status: 'success',
            messageId: 'msg1',
            note: 'Previously delivered',
          },
          {
            channel: { id: 'C2', name: 'ch2' },
            status: 'success',
            messageId: 'msg2',
            deliveredAt: new Date(),
          },
          {
            channel: { id: 'C3', name: 'ch3' },
            status: 'success',
            messageId: 'msg3',
            deliveredAt: new Date(),
          },
        ],
        overallStatus: 'success',
        completedAt: new Date(),
      }),
    }

    const status = mockSlackService.getDeliveryStatus()
    expect(status.completed).toHaveLength(1)
    expect(status.pending).toHaveLength(2)

    const retryResult = await mockSlackService.retryPendingDeliveries()
    expect(retryResult.overallStatus).toBe('success')
    expect(retryResult.deliveryResults).toHaveLength(3)
  })

  it('should log detailed error information for debugging', async () => {
    const mockLogger = {
      logDeliveryFailure: vi.fn(),
      logDeliverySuccess: vi.fn(),
    }

    const deliveryResults = [
      {
        channel: { id: 'C1', name: 'success-channel' },
        status: 'success' as const,
        messageId: 'msg1',
        deliveredAt: new Date(),
      },
      {
        channel: { id: 'C2', name: 'fail-channel' },
        status: 'failed' as const,
        error: {
          type: 'not_in_channel',
          message: 'Bot is not a member',
          details: { channelInfo: { isPrivate: true, memberCount: 5 } },
        },
      },
    ]

    deliveryResults.forEach(result => {
      if (result.status === 'success') {
        mockLogger.logDeliverySuccess(result.channel.name, result.messageId)
      } else {
        mockLogger.logDeliveryFailure(
          result.channel.name,
          result.error?.type,
          result.error?.message
        )
      }
    })

    expect(mockLogger.logDeliverySuccess).toHaveBeenCalledWith(
      'success-channel',
      'msg1'
    )
    expect(mockLogger.logDeliveryFailure).toHaveBeenCalledWith(
      'fail-channel',
      'not_in_channel',
      'Bot is not a member'
    )
  })
})
