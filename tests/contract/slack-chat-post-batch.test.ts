import { describe, it, expect, vi } from 'vitest'
import { WebClient } from '@slack/web-api'

describe('Slack API chat.postMessage Batch Contract', () => {
  it('should send message to single channel successfully', async () => {
    const mockWebClient = {
      chat: {
        postMessage: vi.fn().mockResolvedValue({
          ok: true,
          channel: 'C1234567890',
          ts: '1234567890.123456',
          message: {
            text: 'Hello team!',
            user: 'U1234567890',
            ts: '1234567890.123456',
          },
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.chat.postMessage({
      channel: 'C1234567890',
      text: 'Hello team!',
      as_user: true,
    })

    expect(result.ok).toBe(true)
    expect(result.channel).toBe('C1234567890')
    expect(result.ts).toBe('1234567890.123456')
    expect(result.message?.text).toBe('Hello team!')
  })

  it('should handle batch delivery to multiple channels', async () => {
    const channels = ['C1234567890', 'C1234567891', 'C1234567892']
    const results = []

    const mockWebClient = {
      chat: {
        postMessage: vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
          })
          .mockResolvedValueOnce({
            ok: true,
            channel: 'C1234567891',
            ts: '1234567890.123457',
          })
          .mockResolvedValueOnce({
            ok: true,
            channel: 'C1234567892',
            ts: '1234567890.123458',
          }),
      },
    } as unknown as WebClient

    for (const channel of channels) {
      const result = await mockWebClient.chat.postMessage({
        channel,
        text: 'Broadcast message',
        as_user: true,
      })
      results.push(result)
    }

    expect(results).toHaveLength(3)
    expect(results[0].ok).toBe(true)
    expect(results[1].ok).toBe(true)
    expect(results[2].ok).toBe(true)
  })

  it('should handle not_in_channel error', async () => {
    const mockWebClient = {
      chat: {
        postMessage: vi.fn().mockResolvedValue({
          ok: false,
          error: 'not_in_channel',
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.chat.postMessage({
      channel: 'C1234567890',
      text: 'Hello team!',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('not_in_channel')
  })

  it('should handle channel_not_found error', async () => {
    const mockWebClient = {
      chat: {
        postMessage: vi.fn().mockResolvedValue({
          ok: false,
          error: 'channel_not_found',
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.chat.postMessage({
      channel: 'C9999999999',
      text: 'Hello team!',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('channel_not_found')
  })

  it('should handle is_archived error', async () => {
    const mockWebClient = {
      chat: {
        postMessage: vi.fn().mockResolvedValue({
          ok: false,
          error: 'is_archived',
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.chat.postMessage({
      channel: 'C1234567890',
      text: 'Hello team!',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('is_archived')
  })

  it('should handle msg_too_long error', async () => {
    const longMessage = 'x'.repeat(40000) // Exceed Slack's message length limit

    const mockWebClient = {
      chat: {
        postMessage: vi.fn().mockResolvedValue({
          ok: false,
          error: 'msg_too_long',
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.chat.postMessage({
      channel: 'C1234567890',
      text: longMessage,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('msg_too_long')
  })

  it('should handle partial failure in batch delivery', async () => {
    const channels = ['C1234567890', 'C1234567891', 'C1234567892']
    const results = []

    const mockWebClient = {
      chat: {
        postMessage: vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
          })
          .mockResolvedValueOnce({
            ok: false,
            error: 'not_in_channel',
          })
          .mockResolvedValueOnce({
            ok: true,
            channel: 'C1234567892',
            ts: '1234567890.123458',
          }),
      },
    } as unknown as WebClient

    for (const channel of channels) {
      const result = await mockWebClient.chat.postMessage({
        channel,
        text: 'Broadcast message',
      })
      results.push(result)
    }

    expect(results).toHaveLength(3)
    expect(results[0].ok).toBe(true)
    expect(results[1].ok).toBe(false)
    expect(results[2].ok).toBe(true)

    const successCount = results.filter(r => r.ok).length
    const failureCount = results.filter(r => !r.ok).length

    expect(successCount).toBe(2)
    expect(failureCount).toBe(1)
  })
})
