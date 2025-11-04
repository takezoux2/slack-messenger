import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SlackService } from '../../src/services/slack.service.js'
import { AuthenticationCredentials } from '../../src/models/authentication-credentials.js'
import { SlackMessage } from '../../src/models/slack-message.js'
import type { ChannelTarget } from '../../src/models/channel-target'

const mockClient = {
  conversations: {
    info: vi.fn().mockResolvedValue({
      ok: true,
      channel: {
        id: 'C1234567890',
        name: 'general',
        is_private: false,
        is_member: true,
      },
    }),
  },
  auth: {
    test: vi.fn().mockResolvedValue({
      ok: true,
      bot_id: 'B123',
      team_id: 'T123',
    }),
  },
  chat: {
    postMessage: vi.fn().mockResolvedValue({
      ok: false,
      error: 'invalid_arguments',
      response_metadata: {
        messages: ['text must not be empty'],
      },
    }),
  },
}

vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn().mockImplementation(() => mockClient),
  LogLevel: {
    INFO: 'info',
    DEBUG: 'debug',
    ERROR: 'error',
  },
}))

describe('SlackService invalid argument handling', () => {
  let service: SlackService

  beforeEach(() => {
    vi.clearAllMocks()
    const credentials = AuthenticationCredentials.forBotToken(
      'xoxb-valid-test-token'
    )
    service = new SlackService({ credentials })
  })

  it('wraps invalid_arguments responses as validation errors with guidance', async () => {
    const message = SlackMessage.create('Hello world', 'C1234567890')
    const target: ChannelTarget = { identifier: 'C1234567890', type: 'id' }

    const result = await service.sendMessage(message, target)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.name).toBe('ValidationError')
    expect(result.error?.message).toMatch(/Slack rejected the request/i)
    expect(result.error?.message).toMatch(/text must not be empty/i)
    expect(result.exitCode).toBe(1)
    expect(result.metadata?.errorCategory).toBe('invalid_arguments')
    expect(result.metadata?.slackError).toBe('invalid_arguments')
  })

  it('returns validation-rich failures for broadcast invalid_arguments exceptions', async () => {
    const rejection = Object.assign(
      new Error('An API error occurred: invalid_arguments'),
      {
        data: {
          ok: false,
          error: 'invalid_arguments',
          response_metadata: {
            messages: ['text must not be empty'] as string[],
          },
        },
      }
    )

    mockClient.chat.postMessage.mockRejectedValueOnce(rejection)

    const channels = [
      {
        id: 'C1234567890',
        name: 'general',
        isPrivate: false,
        isMember: true,
        isArchived: false,
      },
    ]

    const result = await service.broadcastMessage(channels, 'Test message')

    expect(result.deliveryResults[0].error?.type).toBe('invalid_arguments')
    expect(result.deliveryResults[0].error?.message).toMatch(
      /Slack rejected the request/i
    )
    expect(result.deliveryResults[0].error?.details?.guidance).toMatch(
      /Ensure the message text/i
    )
    expect(result.overallStatus).toBe('failed')
  })
})
