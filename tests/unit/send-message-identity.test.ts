import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SendMessageCommand } from '../../src/commands/send-message.command.js'
import { CommandLineOptions } from '../../src/models/command-line-options.js'
import type {
  CommandLineOptionsParams,
} from '../../src/models/command-line-options.js'
import type { SlackService } from '../../src/services/slack.service.js'
import { AppConfig } from '../../src/config/app-config.js'
import { MessageDeliveryResult } from '../../src/models/message-delivery-result.js'
import type { ChannelConfiguration } from '../../src/models/channel-configuration.js'

function createSlackServiceMock() {
  const mocks = {
    testAuthentication: vi
      .fn()
      .mockResolvedValue({ valid: true, botId: 'B123', teamId: 'T123' }),
    getChannelInfo: vi
      .fn()
      .mockResolvedValue({
        exists: true,
        name: 'general',
        isPrivate: false,
        isMember: true,
      }),
    sendMessage: vi
      .fn()
      .mockResolvedValue(
        MessageDeliveryResult.success({
          messageId: '123.456',
          timestamp: '123.456',
          channelId: 'C1234567890',
        })
      ),
    getClientConfig: vi.fn().mockReturnValue({}),
  }

  return {
    service: mocks as unknown as SlackService,
    mocks,
  }
}

function createOptions(overrides: Partial<CommandLineOptionsParams> = {}) {
  return new CommandLineOptions({
    command: 'send-message',
    channelId: 'C1234567890',
    message: 'Hello world',
    token: 'xoxb-test-token',
    configPath: '/tmp/channels.yaml',
    ...overrides,
  })
}

describe('SendMessageCommand sender identity gating', () => {
  let slackService: SlackService
  let slackServiceMocks: ReturnType<typeof createSlackServiceMock>['mocks']
  let command: SendMessageCommand

  beforeEach(() => {
    const mockBundle = createSlackServiceMock()
    slackService = mockBundle.service
    slackServiceMocks = mockBundle.mocks
    command = SendMessageCommand.forTesting({ slackService })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fails when sender identity is missing and fallback not allowed', async () => {
    const configuration: ChannelConfiguration = {
      channelLists: [],
      filePath: '/tmp/channels.yaml',
    }

    vi.spyOn(AppConfig, 'loadChannelConfiguration').mockResolvedValue({
      success: true,
      configuration,
      resolvedPath: configuration.filePath,
    })

    const result = await command.execute(createOptions())

    expect(result.success).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.output.some(line => line.includes('--allow-default-identity'))).toBe(true)
    expect(slackServiceMocks.sendMessage).not.toHaveBeenCalled()
  })

  it('allows default identity when configuration enables allow_default_identity', async () => {
    const configuration: ChannelConfiguration = {
      channelLists: [],
      filePath: '/tmp/channels.yaml',
      senderIdentity: { allowDefaultIdentity: true },
    }

    vi.spyOn(AppConfig, 'loadChannelConfiguration').mockResolvedValue({
      success: true,
      configuration,
      resolvedPath: configuration.filePath,
    })

    const result = await command.execute(createOptions())

    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.output.some(line => line.includes('allows using the default Slack identity'))).toBe(true)
    expect(slackServiceMocks.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('allows default identity when CLI flag is provided', async () => {
    const configuration: ChannelConfiguration = {
      channelLists: [],
      filePath: '/tmp/channels.yaml',
    }

    vi.spyOn(AppConfig, 'loadChannelConfiguration').mockResolvedValue({
      success: true,
      configuration,
      resolvedPath: configuration.filePath,
    })

    const result = await command.execute(
      createOptions({ allowDefaultIdentity: true })
    )

    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(slackServiceMocks.sendMessage).toHaveBeenCalledTimes(1)
  })
})
