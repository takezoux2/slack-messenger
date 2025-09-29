/**
 * Unit Tests: Channel Resolution
 *
 * Tests the channel resolution logic that converts channel names to IDs
 * and validates channel access for broadcast operations. Covers API
 * interaction patterns, caching, and error handling.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from 'vitest'
import { SlackService } from '../../src/services/slack.service.js'
import { AuthenticationCredentials } from '../../src/models/authentication-credentials.js'
import type { ChannelTarget } from '../../src/models/channel-target'
import type { ResolvedChannel } from '../../src/models/resolved-channel'

// Mock the Slack WebClient
// Ensure a single shared mock client instance so spies are consistent
const sharedMockClient = {
  conversations: {
    list: vi.fn().mockResolvedValue({
      ok: true,
      channels: [],
    }),
    info: vi.fn().mockResolvedValue({
      ok: true,
      channel: { id: 'C1234567890', name: 'test-channel' },
    }),
  },
  auth: {
    test: vi.fn().mockResolvedValue({
      ok: true,
      user_id: 'U123456',
      team_id: 'T123456',
    }),
  },
  chat: {
    postMessage: vi.fn().mockResolvedValue({
      ok: true,
      ts: '1234567890.123456',
    }),
  },
}

vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn().mockImplementation(() => sharedMockClient),
  LogLevel: {
    INFO: 'info',
    DEBUG: 'debug',
    ERROR: 'error',
  },
}))

describe('Channel Resolution', () => {
  let slackService: SlackService
  let mockWebClient: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create service with test credentials
    const credentials = AuthenticationCredentials.forBotToken('xoxb-test-token')
    slackService = new SlackService({ credentials })

    // Get reference to mocked WebClient
    mockWebClient = sharedMockClient
  })

  describe('resolveChannels', () => {
    it('should resolve channel names to IDs', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
        {
          id: 'C0987654321',
          name: 'announcements',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#general', type: 'name' },
        { identifier: '#announcements', type: 'name' },
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(2)
      expect(resolved[0]).toEqual({
        id: 'C1234567890',
        name: 'general',
        isPrivate: false,
        isMember: true,
        isArchived: false,
      })
      expect(resolved[1]).toEqual({
        id: 'C0987654321',
        name: 'announcements',
        isPrivate: false,
        isMember: true,
        isArchived: false,
      })
    })

    it('should resolve channel IDs directly', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: 'C1234567890', type: 'id' },
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(1)
      expect(resolved[0].id).toBe('C1234567890')
      expect(resolved[0].name).toBe('general')
    })

    it('should handle mixed channel names and IDs', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
        {
          id: 'C0987654321',
          name: 'announcements',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#general', type: 'name' },
        { identifier: 'C0987654321', type: 'id' },
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(2)
      expect(resolved.find(r => r.name === 'general')).toBeDefined()
      expect(resolved.find(r => r.id === 'C0987654321')).toBeDefined()
    })

    it('should skip channels that cannot be found', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#general', type: 'name' }, // Exists
        { identifier: '#nonexistent', type: 'name' }, // Does not exist
        { identifier: 'C1234567890', type: 'id' }, // Exists
        { identifier: 'C9999999999', type: 'id' }, // Does not exist
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(2) // Only the found channels
      expect(resolved.every(r => r.id === 'C1234567890')).toBe(false) // Should not be duplicated
    })

    it('should handle channels with # prefix in names', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#general', type: 'name' }, // With #
        { identifier: 'general', type: 'name' }, // Without #
      ]

      const resolved = await slackService.resolveChannels(targets)

      // Should resolve both but return the same channel (not duplicated)
      expect(resolved).toHaveLength(1)
      expect(resolved[0].name).toBe('general')
    })

    it('should handle private channels', async () => {
      const mockChannels = [
        {
          id: 'G1234567890',
          name: 'private-group',
          is_private: true,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#private-group', type: 'name' },
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(1)
      expect(resolved[0].isPrivate).toBe(true)
      expect(resolved[0].isMember).toBe(true)
    })

    it('should handle archived channels', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'archived-channel',
          is_private: false,
          is_member: false,
          is_archived: true,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#archived-channel', type: 'name' },
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(1)
      expect(resolved[0].isArchived).toBe(true)
    })
  })

  describe('getAllChannels', () => {
    it('should fetch all channels from Slack API', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
        {
          id: 'G0987654321',
          name: 'private-group',
          is_private: true,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const channels = await slackService.getAllChannels()

      expect(channels).toHaveLength(2)
      expect(mockWebClient.conversations.list).toHaveBeenCalledWith({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000,
      })
    })

    it('should handle pagination', async () => {
      const firstPageChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      const secondPageChannels = [
        {
          id: 'C0987654321',
          name: 'announcements',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list
        .mockResolvedValueOnce({
          ok: true,
          channels: firstPageChannels,
          response_metadata: { next_cursor: 'cursor123' },
        })
        .mockResolvedValueOnce({
          ok: true,
          channels: secondPageChannels,
          response_metadata: {},
        })

      const channels = await slackService.getAllChannels()

      expect(channels).toHaveLength(2)
      expect(mockWebClient.conversations.list).toHaveBeenCalledTimes(2)
      expect(mockWebClient.conversations.list).toHaveBeenNthCalledWith(2, {
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000,
        cursor: 'cursor123',
      })
    })

    it('should handle API errors gracefully', async () => {
      mockWebClient.conversations.list.mockRejectedValue(
        new Error('API Error: rate_limited')
      )

      await expect(slackService.getAllChannels()).rejects.toThrow(
        /Failed to fetch channels/
      )
    })

    it('should handle invalid API responses', async () => {
      mockWebClient.conversations.list.mockResolvedValue({
        ok: false,
        error: 'invalid_auth',
      })

      await expect(slackService.getAllChannels()).rejects.toThrow(
        /Failed to fetch channels/
      )
    })
  })

  describe('validateChannelAccess', () => {
    it('should return true for accessible channels', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_member: true,
        },
      })

      const hasAccess = await slackService.validateChannelAccess('C1234567890')

      expect(hasAccess).toBe(true)
      expect(mockWebClient.conversations.info).toHaveBeenCalledWith({
        channel: 'C1234567890',
      })
    })

    it('should return false for inaccessible channels', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'private-channel',
          is_member: false,
        },
      })

      const hasAccess = await slackService.validateChannelAccess('C1234567890')

      expect(hasAccess).toBe(false)
    })

    it('should return false for non-existent channels', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
      })

      const hasAccess = await slackService.validateChannelAccess('C9999999999')

      expect(hasAccess).toBe(false)
    })

    it('should handle API errors gracefully', async () => {
      mockWebClient.conversations.info.mockRejectedValue(
        new Error('Network error')
      )

      const hasAccess = await slackService.validateChannelAccess('C1234567890')

      expect(hasAccess).toBe(false)
    })
  })

  describe('Performance and Caching', () => {
    it('should efficiently handle large channel lists', async () => {
      // Generate 50 mock channels
      const mockChannels = Array.from({ length: 50 }, (_, i) => ({
        id: `C${String(i).padStart(10, '0')}`,
        name: `channel-${i}`,
        is_private: false,
        is_member: true,
        is_archived: false,
      }))

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = mockChannels.map(ch => ({
        identifier: `#${ch.name}`,
        type: 'name',
      }))

      const startTime = Date.now()
      const resolved = await slackService.resolveChannels(targets)
      const endTime = Date.now()

      expect(resolved).toHaveLength(50)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(mockWebClient.conversations.list).toHaveBeenCalledTimes(1) // Should only call API once
    })

    it('should avoid duplicate API calls for same channels', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#general', type: 'name' },
        { identifier: 'C1234567890', type: 'id' },
        { identifier: '#general', type: 'name' }, // Duplicate
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(1) // Should deduplicate
      expect(mockWebClient.conversations.list).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should continue processing valid channels when some fail', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      // First call succeeds, second call fails
      mockWebClient.conversations.list.mockResolvedValueOnce({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#general', type: 'name' }, // Will be found
        { identifier: '#nonexistent', type: 'name' }, // Will not be found
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(1) // Should return the valid one
      expect(resolved[0].name).toBe('general')
    })

    it('should handle malformed channel identifiers gracefully', async () => {
      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: [],
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '', type: 'name' }, // Empty
        { identifier: 'invalid-format', type: 'id' }, // Invalid ID
        { identifier: '###multiple-hashes', type: 'name' }, // Malformed name
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(0) // Should handle gracefully
    })

    it('should provide meaningful error messages', async () => {
      mockWebClient.conversations.list.mockRejectedValue(
        new Error('invalid_auth')
      )

      await expect(slackService.getAllChannels()).rejects.toThrow(
        /Failed to fetch channels.*invalid_auth/
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty channel lists', async () => {
      const targets: ChannelTarget[] = []

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(0)
      expect(mockWebClient.conversations.list).not.toHaveBeenCalled()
    })

    it('should handle channels with special characters in names', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'special-chars_123',
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: '#special-chars_123', type: 'name' },
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(1)
      expect(resolved[0].name).toBe('special-chars_123')
    })

    it('should handle very long channel names', async () => {
      const longName = 'a'.repeat(21) // Slack limit is 21 characters

      const mockChannels = [
        {
          id: 'C1234567890',
          name: longName,
          is_private: false,
          is_member: true,
          is_archived: false,
        },
      ]

      mockWebClient.conversations.list.mockResolvedValue({
        ok: true,
        channels: mockChannels,
        response_metadata: {},
      })

      const targets: ChannelTarget[] = [
        { identifier: `#${longName}`, type: 'name' },
      ]

      const resolved = await slackService.resolveChannels(targets)

      expect(resolved).toHaveLength(1)
      expect(resolved[0].name).toBe(longName)
    })
  })
})
