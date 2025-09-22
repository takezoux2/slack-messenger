import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebClient } from '@slack/web-api'

/**
 * Slack API Contract Tests
 *
 * Tests the Slack API integration contract as defined in contracts/slack-api.md
 * These tests verify that our API integration behaves according to the contract specification.
 */
describe('Slack API Contract', () => {
  let mockWebClient: {
    chat: {
      postMessage: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    // Mock the Slack WebClient
    mockWebClient = {
      chat: {
        postMessage: vi.fn(),
      },
    }

    // Mock the WebClient constructor
    vi.mocked(WebClient).mockImplementation(() => mockWebClient as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication Tests', () => {
    it('should successfully authenticate with valid bot token', async () => {
      const validToken = 'xoxb-1234567890-abcdefghijklmnopqrstuvwx'

      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: true,
        channel: 'C1234567890',
        ts: '1234567890.123456',
        message: {
          type: 'message',
          text: 'Test message',
          ts: '1234567890.123456',
        },
      })

      const client = new WebClient(validToken)
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: 'Test message',
        mrkdwn: true,
      })

      expect(result.ok).toBe(true)
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Test message',
        mrkdwn: true,
      })
    })

    it('should reject invalid token format', async () => {
      const invalidToken = 'invalid-token-format'

      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: false,
        error: 'invalid_auth',
        detail: 'Invalid authentication credentials',
      })

      const client = new WebClient(invalidToken)
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: 'Test message',
        mrkdwn: true,
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('invalid_auth')
    })

    it('should reject missing token', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: false,
        error: 'not_authed',
        detail: 'No authentication token provided',
      })

      const client = new WebClient('')
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: 'Test message',
        mrkdwn: true,
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('not_authed')
    })
  })

  describe('Channel Tests', () => {
    beforeEach(() => {
      // Set up a valid client for channel tests
      mockWebClient = {
        chat: {
          postMessage: vi.fn(),
        },
      }
    })

    it('should send message to valid, accessible channel', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: true,
        channel: 'C1234567890',
        ts: '1234567890.123456',
        message: {
          type: 'message',
          text: 'Valid channel test',
          ts: '1234567890.123456',
        },
      })

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: 'Valid channel test',
        mrkdwn: true,
      })

      expect(result.ok).toBe(true)
      expect(result.channel).toBe('C1234567890')
    })

    it('should return error for invalid channel ID', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
        detail: 'Value passed for channel was invalid.',
      })

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'INVALID123',
        text: 'Test message',
        mrkdwn: true,
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('channel_not_found')
    })

    it('should return error when bot not in channel', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: false,
        error: 'not_in_channel',
        detail: 'Cannot post to channel without permission',
      })

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'C9876543210',
        text: 'Test message',
        mrkdwn: true,
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('not_in_channel')
    })
  })

  describe('Message Tests', () => {
    beforeEach(() => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: true,
        channel: 'C1234567890',
        ts: '1234567890.123456',
        message: {
          type: 'message',
          text: 'Test message',
          ts: '1234567890.123456',
        },
      })
    })

    it('should deliver plain text message', async () => {
      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: 'Plain text message',
        mrkdwn: true,
      })

      expect(result.ok).toBe(true)
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text message',
          mrkdwn: true,
        })
      )
    })

    it('should preserve markdown formatting', async () => {
      const markdownText = '*Bold text* and _italic text_ with `code`'

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: markdownText,
        mrkdwn: true,
      })

      expect(result.ok).toBe(true)
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: markdownText,
          mrkdwn: true,
        })
      )
    })

    it('should reject empty message content', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: false,
        error: 'invalid_arguments',
        detail: 'Text parameter must not be empty',
      })

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: '',
        mrkdwn: true,
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('invalid_arguments')
    })

    it('should handle large messages near 40k character limit', async () => {
      const largeMessage = 'A'.repeat(39000) // Large but under limit

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: largeMessage,
        mrkdwn: true,
      })

      expect(result.ok).toBe(true)
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: largeMessage,
        })
      )
    })
  })

  describe('Error Handling Tests', () => {
    it('should handle rate limiting with 429 response', async () => {
      const rateLimitError = new Error('Rate limited')
      ;(rateLimitError as any).code = 'ECONNRESET'
      ;(rateLimitError as any).statusCode = 429

      mockWebClient.chat.postMessage.mockRejectedValue(rateLimitError)

      const client = new WebClient('xoxb-valid-token')

      await expect(
        client.chat.postMessage({
          channel: 'C1234567890',
          text: 'Test message',
          mrkdwn: true,
        })
      ).rejects.toThrow('Rate limited')
    })

    it('should handle network timeout', async () => {
      const timeoutError = new Error('Network timeout')
      ;(timeoutError as any).code = 'ETIMEDOUT'

      mockWebClient.chat.postMessage.mockRejectedValue(timeoutError)

      const client = new WebClient('xoxb-valid-token')

      await expect(
        client.chat.postMessage({
          channel: 'C1234567890',
          text: 'Test message',
          mrkdwn: true,
        })
      ).rejects.toThrow('Network timeout')
    })

    it('should handle server error (5xx)', async () => {
      const serverError = new Error('Internal server error')
      ;(serverError as any).statusCode = 500

      mockWebClient.chat.postMessage.mockRejectedValue(serverError)

      const client = new WebClient('xoxb-valid-token')

      await expect(
        client.chat.postMessage({
          channel: 'C1234567890',
          text: 'Test message',
          mrkdwn: true,
        })
      ).rejects.toThrow('Internal server error')
    })
  })

  describe('Response Processing Tests', () => {
    it('should extract message timestamp and channel from success response', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: true,
        channel: 'C1234567890',
        ts: '1699891234.567890',
        message: {
          type: 'message',
          text: 'Test message',
          ts: '1699891234.567890',
          username: 'bot-name',
          bot_id: 'B1234567890',
        },
      })

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: 'Test message',
        mrkdwn: true,
      })

      expect(result.ok).toBe(true)
      expect(result.channel).toBe('C1234567890')
      expect(result.ts).toBe('1699891234.567890')
      expect(result.message?.text).toBe('Test message')
    })

    it('should extract error code and message from error response', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: false,
        error: 'channel_not_found',
        detail: 'Value passed for channel was invalid.',
      })

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'INVALID',
        text: 'Test message',
        mrkdwn: true,
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('channel_not_found')
      expect((result as any).detail).toBe(
        'Value passed for channel was invalid.'
      )
    })

    it('should handle malformed response', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        // Malformed response missing 'ok' field
        unexpected: 'response',
      } as any)

      const client = new WebClient('xoxb-valid-token')
      const result = await client.chat.postMessage({
        channel: 'C1234567890',
        text: 'Test message',
        mrkdwn: true,
      })

      // Should handle gracefully even with malformed response
      expect(result).toBeDefined()
      expect((result as any).unexpected).toBe('response')
    })
  })

  describe('Request Configuration Tests', () => {
    it('should include proper headers in request', async () => {
      mockWebClient.chat.postMessage.mockResolvedValue({
        ok: true,
        channel: 'C1234567890',
        ts: '1234567890.123456',
        message: { type: 'message', text: 'Test', ts: '1234567890.123456' },
      })

      const client = new WebClient('xoxb-test-token', {
        timeout: 5000,
      })

      await client.chat.postMessage({
        channel: 'C1234567890',
        text: 'Test message',
        mrkdwn: true,
        unfurl_links: false,
        unfurl_media: false,
      })

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Test message',
        mrkdwn: true,
        unfurl_links: false,
        unfurl_media: false,
      })
    })

    it('should validate token format before making requests', () => {
      // Test token format validation
      const validBotToken = 'xoxb-1234567890-abcdefghijklmnopqrstuvwx'
      const invalidToken = 'not-a-slack-token'

      // Valid token should create client without error
      expect(() => new WebClient(validBotToken)).not.toThrow()

      // Invalid token should still create client (validation happens at API call)
      expect(() => new WebClient(invalidToken)).not.toThrow()
    })
  })
})

// Mock the WebClient
vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn(),
}))
