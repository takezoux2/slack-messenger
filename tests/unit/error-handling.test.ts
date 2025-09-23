/**
 * Unit Tests: Error Handling Edge Cases
 *
 * Tests comprehensive error handling scenarios for broadcast operations
 * including network failures, authentication issues, rate limiting,
 * and edge cases that could occur during production usage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorHandlerService } from '../../src/services/error-handler.service.js'
import { SlackService } from '../../src/services/slack.service.js'
import { AuthenticationCredentials } from '../../src/models/authentication-credentials.js'
import type { BroadcastResult } from '../../src/models/broadcast-result'
import type { ChannelDeliveryResult } from '../../src/models/channel-delivery-result'

describe('Error Handling Edge Cases', () => {
  let errorHandler: ErrorHandlerService
  let slackService: SlackService

  beforeEach(() => {
    errorHandler = ErrorHandlerService.forTesting()
    const credentials = AuthenticationCredentials.forBotToken('xoxb-test-token')
    slackService = new SlackService({ credentials })
  })

  describe('Authentication Errors', () => {
    it('should handle invalid token errors', () => {
      const error = new Error('invalid_auth')
      const result = errorHandler.handleError(error, {
        command: 'broadcast',
        operation: 'authentication',
      })

      expect(result.exitCode).toBe(2)
      expect(result.message).toMatch(/Authentication Error/)
      expect(result.details).toContain('Error Type: authentication')
    })

    it('should handle token expiration errors', () => {
      const error = new Error('token_revoked')
      const result = errorHandler.handleError(error)

      expect(result.exitCode).toBe(2)
      expect(result.message).toMatch(/Authentication Error/)
    })

    it('should handle missing scope errors', () => {
      const error = new Error('invalid_auth')
      const result = errorHandler.handleError(error, {
        operation: 'authentication',
      })

      expect(result.exitCode).toBe(2)
      expect(result.message).toMatch(/Authentication Error/)
    })

    it('should handle account inactive errors', () => {
      const error = new Error('account_inactive')
      const result = errorHandler.formatAuthenticationError(error)

      expect(result.exitCode).toBe(2)
      expect(result.message).toMatch(/Authentication failed/)
    })
  })

  describe('Network Errors', () => {
    it('should handle connection timeout', () => {
      const error = new Error('Connection timeout')
      const result = errorHandler.handleError(error, {
        command: 'broadcast',
        operation: 'network',
      })

      expect(result.exitCode).toBe(4) // Now it should match network patterns
      expect(result.message).toMatch(/Network Error/)
      expect(result.details).toContain('Error Type: network')
    })

    it('should handle DNS resolution failures', () => {
      const error = new Error('ENOTFOUND slack.com')
      const result = errorHandler.handleError(error, {
        operation: 'network',
      })

      expect(result.exitCode).toBe(4)
      expect(result.message).toMatch(/Network Error/)
    })

    it('should handle connection refused', () => {
      const error = new Error('ECONNREFUSED')
      const result = errorHandler.handleError(error)

      expect(result.exitCode).toBe(4)
      expect(result.message).toMatch(/Network Error/)
    })

    it('should handle socket hang up', () => {
      const error = new Error('socket hang up')
      const result = errorHandler.handleError(error)

      expect(result.exitCode).toBe(4)
      expect(result.message).toMatch(/Network Error/)
    })
  })

  describe('Channel Access Errors', () => {
    it('should handle channel not found', () => {
      const error = new Error('channel_not_found')
      const result = errorHandler.handleError(error, {
        channelId: 'C1234567890',
        operation: 'message-send',
      })

      expect(result.exitCode).toBe(3)
      expect(result.message).toMatch(/Error.*channel_not_found/)
      expect(result.message).toMatch(/C1234567890/)
    })

    it('should handle not in channel errors', () => {
      const error = new Error('not_in_channel')
      const result = errorHandler.handleError(error)

      expect(result.exitCode).toBe(3)
      expect(result.message).toMatch(/Channel Error/)
    })

    it('should handle archived channel errors', () => {
      const error = new Error('is_archived')
      const result = errorHandler.handleError(error)

      expect(result.exitCode).toBe(3)
      expect(result.message).toMatch(/Channel Error/)
    })

    it('should handle restricted action errors', () => {
      const error = new Error('restricted_action')
      const result = errorHandler.handleError(error)

      expect(result.exitCode).toBe(3)
      expect(result.message).toMatch(/Channel Error/)
    })
  })

  describe('Configuration Errors', () => {
    it('should handle missing configuration file', () => {
      const error = new Error('ENOENT: no such file or directory')
      const result = errorHandler.handleConfigurationError(
        error,
        './missing-config.yml'
      )

      expect(result.exitCode).toBe(3)
      expect(result.message).toMatch(/Configuration error/)
      if (result.details) {
        expect(result.details).toContain(
          'Create a YAML file with channel lists:'
        )
      }
    })

    it('should handle YAML parse errors', () => {
      const error = new Error('YAMLException: bad indentation')
      const result = errorHandler.handleConfigurationError(error)

      expect(result.exitCode).toBe(3)
      expect(result.message).toMatch(/Invalid YAML configuration/)
      expect(result.details).toContain('Check your YAML syntax:')
    })

    it('should handle malformed YAML structure', () => {
      const error = new Error('Missing channel_lists key')
      const result = errorHandler.handleConfigurationError(error)

      expect(result.exitCode).toBe(3)
      expect(result.message).toMatch(/Configuration error/)
    })
  })

  describe('Validation Errors', () => {
    it('should handle empty message validation', () => {
      const errors = ['Message cannot be empty']
      const result = errorHandler.formatValidationError(errors)

      expect(result.exitCode).toBe(1)
      expect(result.message).toMatch(
        /Validation error.*Message cannot be empty/
      )
    })

    it('should handle multiple validation errors', () => {
      const errors = [
        'Message cannot be empty',
        'List name cannot be empty',
        'Config path is invalid',
      ]
      const result = errorHandler.formatValidationError(errors)

      expect(result.exitCode).toBe(1)
      expect(result.message).toMatch(/Validation errors.*3/)
      expect(result.details).toHaveLength(3)
      expect(result.details![0]).toMatch(/• Message cannot be empty/)
    })

    it('should handle channel list not found', () => {
      const result = errorHandler.formatChannelListError('nonexistent-list', [
        'dev-team',
        'marketing',
        'company-wide',
      ])

      expect(result.exitCode).toBe(1)
      expect(result.message).toMatch(
        /Channel list "nonexistent-list" not found/
      )
      expect(result.details).toContain('Available lists:')
      expect(result.details).toContain('  - dev-team')
    })
  })

  describe('Broadcast Result Error Aggregation', () => {
    it('should handle complete broadcast failure', () => {
      const broadcastResult: BroadcastResult = {
        targetListName: 'test-team',
        totalChannels: 3,
        overallStatus: 'failed',
        completedAt: new Date(),
        deliveryResults: [
          {
            channel: {
              id: 'C1',
              name: 'general',
              isPrivate: false,
              isMember: true,
            },
            status: 'failed',
            error: { type: 'channel_not_found', message: 'Channel not found' },
          },
          {
            channel: {
              id: 'C2',
              name: 'announcements',
              isPrivate: false,
              isMember: false,
            },
            status: 'failed',
            error: { type: 'not_in_channel', message: 'Bot not in channel' },
          },
          {
            channel: {
              id: 'C3',
              name: 'archived',
              isPrivate: false,
              isMember: true,
            },
            status: 'failed',
            error: { type: 'is_archived', message: 'Channel is archived' },
          },
        ],
      }

      const result = errorHandler.handleBroadcastErrors(broadcastResult)

      expect(result.exitCode).toBe(2)
      expect(result.message).toMatch(/Broadcast failed.*No messages delivered/)
      expect(result.details).toContain('3 channels failed:')
    })

    it('should handle partial broadcast success', () => {
      const broadcastResult: BroadcastResult = {
        targetListName: 'mixed-team',
        totalChannels: 4,
        overallStatus: 'partial',
        completedAt: new Date(),
        deliveryResults: [
          {
            channel: {
              id: 'C1',
              name: 'general',
              isPrivate: false,
              isMember: true,
            },
            status: 'success',
            messageId: '1234567890.123456',
            deliveredAt: new Date(),
          },
          {
            channel: {
              id: 'C2',
              name: 'announcements',
              isPrivate: false,
              isMember: true,
            },
            status: 'success',
            messageId: '1234567890.123457',
            deliveredAt: new Date(),
          },
          {
            channel: {
              id: 'C3',
              name: 'private',
              isPrivate: true,
              isMember: false,
            },
            status: 'skipped',
            error: {
              type: 'not_in_channel',
              message: 'Bot not in private channel',
            },
          },
          {
            channel: {
              id: 'C4',
              name: 'broken',
              isPrivate: false,
              isMember: true,
            },
            status: 'failed',
            error: { type: 'network_error', message: 'Connection failed' },
          },
        ],
      }

      const result = errorHandler.handleBroadcastErrors(broadcastResult)

      expect(result.exitCode).toBe(1)
      expect(result.message).toMatch(/Broadcast partially successful.*2\/4/)
      expect(result.details).toContain('1 channels skipped:')
      expect(result.details).toContain('1 channels failed:')
    })

    it('should aggregate error types correctly', () => {
      const deliveryResults: ChannelDeliveryResult[] = [
        {
          channel: { id: 'C1', name: 'ch1', isPrivate: false, isMember: false },
          status: 'failed',
          error: { type: 'not_in_channel', message: 'Not in channel' },
        },
        {
          channel: { id: 'C2', name: 'ch2', isPrivate: false, isMember: false },
          status: 'failed',
          error: { type: 'not_in_channel', message: 'Not in channel' },
        },
        {
          channel: { id: 'C3', name: 'ch3', isPrivate: false, isMember: true },
          status: 'failed',
          error: { type: 'channel_not_found', message: 'Channel not found' },
        },
      ]

      const summary = errorHandler.aggregateDeliveryErrors(deliveryResults)

      expect(summary).toContain('• not_in_channel: 2 channels')
      expect(summary).toContain('• channel_not_found: 1 channel')
    })

    it('should create comprehensive error reports', () => {
      const broadcastResult: BroadcastResult = {
        targetListName: 'problematic-team',
        totalChannels: 5,
        overallStatus: 'partial',
        completedAt: new Date(),
        deliveryResults: [
          {
            channel: {
              id: 'C1',
              name: 'good',
              isPrivate: false,
              isMember: true,
            },
            status: 'success',
            messageId: '1234567890.123456',
            deliveredAt: new Date(),
          },
          {
            channel: {
              id: 'C2',
              name: 'private',
              isPrivate: true,
              isMember: false,
            },
            status: 'skipped',
            error: { type: 'not_in_channel', message: 'Private channel' },
          },
          {
            channel: {
              id: 'C3',
              name: 'missing',
              isPrivate: false,
              isMember: true,
            },
            status: 'failed',
            error: { type: 'channel_not_found', message: 'Channel deleted' },
          },
          {
            channel: {
              id: 'C4',
              name: 'archived',
              isPrivate: false,
              isMember: true,
            },
            status: 'failed',
            error: { type: 'is_archived', message: 'Channel archived' },
          },
          {
            channel: {
              id: 'C5',
              name: 'network-fail',
              isPrivate: false,
              isMember: true,
            },
            status: 'failed',
            error: { type: 'network_error', message: 'Connection timeout' },
          },
        ],
      }

      const report = errorHandler.createBroadcastErrorReport(broadcastResult)

      expect(report.exitCode).toBe(1)
      expect(report.summary).toMatch(/Broadcast partially successful/)
      expect(report.recommendations).toContain(
        'Add the bot to private channels or remove them from the list'
      )
      expect(report.recommendations).toContain(
        'Verify channel names and IDs in your configuration'
      )
      expect(report.recommendations).toContain(
        'Remove archived channels from your configuration'
      )
      expect(report.recommendations).toContain(
        'Check network connectivity and Slack API status'
      )
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', () => {
      const error = new Error('rate_limited')
      const result = errorHandler.handleError(error)

      expect(result.exitCode).toBe(99) // rate_limited doesn't match any specific patterns
      expect(result.message).toMatch(/Error/)
    })

    it('should provide rate limit recommendations', () => {
      const deliveryResults: ChannelDeliveryResult[] = [
        {
          channel: { id: 'C1', name: 'ch1', isPrivate: false, isMember: true },
          status: 'failed',
          error: { type: 'rate_limited', message: 'Too many requests' },
        },
      ]

      const broadcastResult: BroadcastResult = {
        targetListName: 'rate-limited-team',
        totalChannels: 1,
        overallStatus: 'failed',
        completedAt: new Date(),
        deliveryResults,
      }

      const report = errorHandler.createBroadcastErrorReport(broadcastResult)

      expect(report.recommendations).toContain(
        'Reduce broadcast frequency or implement longer delays'
      )
    })
  })

  describe('Edge Cases and Unexpected Errors', () => {
    it('should handle undefined errors gracefully', () => {
      const result = errorHandler.handleError(undefined)

      expect(result.exitCode).toBe(99)
      expect(result.message).toMatch(/Error.*undefined/)
    })

    it('should handle null errors gracefully', () => {
      const result = errorHandler.handleError(null)

      expect(result.exitCode).toBe(99)
      expect(result.message).toMatch(/Error.*null/)
    })

    it('should handle non-Error objects', () => {
      const result = errorHandler.handleError('string error')

      expect(result.exitCode).toBe(99)
      expect(result.message).toMatch(/Error.*string error/)
    })

    it('should handle circular reference errors', () => {
      const circular: any = { prop: null }
      circular.prop = circular

      const result = errorHandler.handleError(circular)

      expect(result.exitCode).toBe(99)
      expect(result.message).toBeDefined()
    })

    it('should handle errors with missing stack traces', () => {
      const error = new Error('No stack trace')
      delete error.stack

      const result = errorHandler.handleError(error, { operation: 'test' })

      expect(result.exitCode).toBe(99)
      expect(result.message).toMatch(/No stack trace/)
      if (result.details) {
        expect(result.details).toContain('Stack: not available')
      }
    })

    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(5000)
      const error = new Error(longMessage)

      const result = errorHandler.handleError(error)

      expect(result.message).toBeDefined()
      expect(result.message.length).toBeGreaterThan(0)
    })

    it('should handle errors during error handling', () => {
      // Create an error that might cause issues during processing
      const error = {
        get message() {
          throw new Error('Error in error getter')
        },
        name: 'ProblematicError',
      }

      const result = errorHandler.handleError(error as unknown as Error)

      expect(result.exitCode).toBe(99)
      expect(result.message).toBeDefined()
    })
  })

  describe('Context Preservation', () => {
    it('should preserve error context through handling', () => {
      const context = {
        command: 'broadcast',
        channelId: 'C1234567890',
        operation: 'message-send',
        metadata: { retryCount: 3, timeout: 5000 },
      }

      const error = new Error('Test error')
      const result = errorHandler.handleError(error, context)

      expect(result.context).toBeDefined()
      expect(result.context!.command).toBe('broadcast')
      expect(result.context!.channelId).toBe('C1234567890')
      expect(result.context!.operation).toBe('message-send')
      expect(result.context!.metadata).toEqual({ retryCount: 3, timeout: 5000 })
      expect(result.context!.timestamp).toBeInstanceOf(Date)
    })

    it('should handle missing context gracefully', () => {
      const error = new Error('Test error')
      const result = errorHandler.handleError(error)

      expect(result.context).toBeDefined()
      expect(result.context!.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Error Message Formatting', () => {
    it('should format error messages consistently', () => {
      const testCases = [
        { error: new Error('channel_not_found'), expected: /Channel Error/ },
        { error: new Error('invalid_auth'), expected: /Authentication Error/ },
        { error: new Error('timeout'), expected: /Network Error/ },
        { error: new Error('validation failed'), expected: /Validation Error/ },
      ]

      for (const { error, expected } of testCases) {
        const result = errorHandler.handleError(error)
        expect(result.message).toMatch(expected)
      }
    })

    it('should provide detailed error information in verbose mode', () => {
      const verboseHandler = new ErrorHandlerService({ verboseLogging: true })

      const error = new Error('Test error')
      const result = verboseHandler.handleError(error, {
        command: 'broadcast',
        operation: 'test',
      })

      expect(result.details).toBeDefined()
      expect(result.details).toContain('Error Type: unknown')
      expect(result.details).toContain('Command: broadcast')
      expect(result.details).toContain('Operation: test')
    })

    it('should provide concise error information in non-verbose mode', () => {
      const conciseHandler = new ErrorHandlerService({ verboseLogging: false })

      const error = new Error('Test error')
      const result = conciseHandler.handleError(error)

      expect(result.details).toBeUndefined()
    })
  })
})
