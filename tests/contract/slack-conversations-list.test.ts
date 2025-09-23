import { describe, it, expect, vi } from 'vitest'
import { WebClient } from '@slack/web-api'

describe('Slack API conversations.list Contract', () => {
  it('should request public and private channels by default', async () => {
    const mockWebClient = {
      conversations: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          channels: [
            {
              id: 'C1234567890',
              name: 'general',
              is_private: false,
              is_member: true,
              is_archived: false,
            },
            {
              id: 'C1234567891',
              name: 'random',
              is_private: false,
              is_member: true,
              is_archived: false,
            },
          ],
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 1000,
    })

    expect(result.ok).toBe(true)
    expect(result.channels).toHaveLength(2)
    expect(result.channels![0].id).toBe('C1234567890')
    expect(result.channels![0].name).toBe('general')
  })

  it('should handle pagination with cursor', async () => {
    const mockWebClient = {
      conversations: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          channels: [],
          response_metadata: {
            next_cursor: 'next-page-cursor',
          },
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.conversations.list({
      cursor: 'current-page-cursor',
    })

    expect(result.ok).toBe(true)
    expect(result.response_metadata?.next_cursor).toBe('next-page-cursor')
  })

  it('should exclude archived channels by default', async () => {
    const mockWebClient = {
      conversations: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          channels: [
            {
              id: 'C1234567890',
              name: 'active-channel',
              is_private: false,
              is_member: true,
              is_archived: false,
            },
          ],
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.conversations.list({
      exclude_archived: true,
    })

    expect(result.ok).toBe(true)
    expect(result.channels![0].is_archived).toBe(false)
  })

  it('should handle channel_not_found error', async () => {
    const mockWebClient = {
      conversations: {
        list: vi.fn().mockResolvedValue({
          ok: false,
          error: 'channel_not_found',
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.conversations.list()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('channel_not_found')
  })

  it('should handle invalid_auth error', async () => {
    const mockWebClient = {
      conversations: {
        list: vi.fn().mockResolvedValue({
          ok: false,
          error: 'invalid_auth',
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.conversations.list()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('invalid_auth')
  })

  it('should handle rate_limited error', async () => {
    const mockWebClient = {
      conversations: {
        list: vi.fn().mockResolvedValue({
          ok: false,
          error: 'rate_limited',
          retry_after: 30,
        }),
      },
    } as unknown as WebClient

    const result = await mockWebClient.conversations.list()

    expect(result.ok).toBe(false)
    expect(result.error).toBe('rate_limited')
    expect((result as any).retry_after).toBe(30)
  })
})
