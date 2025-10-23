/**
 * Send Message Command
 *
 * Implements the send-message command functionality that coordinates
 * between CLI parsing, Slack API service, and error handling to deliver
 * messages to Slack channels.
 */

import { SlackService } from '../services/slack.service.js'
import { ErrorHandlerService } from '../services/error-handler.service.js'
import { SlackMessage } from '../models/slack-message.js'
import { CommandLineOptions } from '../models/command-line-options.js'
import { MessageDeliveryResult } from '../models/message-delivery-result.js'
import { AuthenticationCredentials } from '../models/authentication-credentials.js'
import { FileMessageLoaderService } from '../services/file-message-loader.service.js'
import { MessageInput } from '../models/message-input.js'
import { AppConfig } from '../config/app-config.js'
import type { ChannelConfiguration } from '../models/channel-configuration'
import { SenderIdentity } from '../models/sender-identity.js'
import type { ResolvedSenderIdentity } from '../models/sender-identity'

export interface SendMessageCommandConfig {
  slackService?: SlackService
  errorHandler?: ErrorHandlerService
  verboseLogging?: boolean
}

export interface SendMessageResult {
  success: boolean
  deliveryResult?: MessageDeliveryResult | undefined
  error?: Error | undefined
  exitCode: number
  output: string[]
}

export class SendMessageCommand {
  private slackService: SlackService | undefined
  private readonly errorHandler: ErrorHandlerService
  private readonly verboseLogging: boolean
  private credentials?: AuthenticationCredentials

  constructor(config?: SendMessageCommandConfig) {
    this.verboseLogging = config?.verboseLogging || false

    // Use provided services or create defaults
    // Do not construct SlackService here to avoid requiring env token at construction time
    this.slackService = config?.slackService
    this.errorHandler =
      config?.errorHandler ||
      new ErrorHandlerService({
        verboseLogging: this.verboseLogging,
      })
  }

  /**
   * Execute the send-message command with parsed options
   */
  async execute(options: CommandLineOptions): Promise<SendMessageResult> {
    const output: string[] = []

    try {
      // Add initial verbose message for validating arguments
      this.logVerbose(output, 'Validating arguments...')

      // Validate command options
      if (!options.isValid) {
        const error = new Error(
          `Invalid command options: ${options.validationErrors.join(', ')}`
        )
        this.logVerbose(output, `Validation failed: ${error.message}`)
        return this.createFailureResult(error, 1, output)
      }

      // Extract required parameters
      const channelId = options.channelId
      if (!channelId) {
        const error = new Error('Missing required parameters: channelId')
        this.logVerbose(output, `Missing parameters - channelId: false`)
        return this.createFailureResult(error, 1, output)
      }

      // Determine message input (file or inline)
      let messageInput: MessageInput
      if (options.messageFile) {
        try {
          messageInput = await FileMessageLoaderService.load(
            options.messageFile
          )
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          return this.createFailureResult(err, 1, output)
        }
        this.logVerbose(
          output,
          `source: file (path: ${messageInput.filePath}) | preview: ${MessageInput.preview200(messageInput.content)}`
        )
      } else if (options.message) {
        messageInput = MessageInput.fromInline(options.message)
        this.logVerbose(
          output,
          `source: inline (length: ${messageInput.content.length})`
        )
      } else {
        const error = new Error(
          'Missing required parameters: message or --message-file'
        )
        return this.createFailureResult(error, 1, output)
      }

      this.logVerbose(output, `Preparing to send message...`)
      this.logVerbose(output, `Channel ID: ${channelId}`)
      this.logVerbose(
        output,
        `Message length: ${messageInput.content.length} characters`
      )

      // Create models
      const message = SlackMessage.create(messageInput.content, channelId)
      const target = {
        identifier: channelId,
        type: 'id' as const,
      }

      this.logVerbose(
        output,
        `Message created - has markdown: ${message.hasMarkdownFormatting}, is multiline: ${message.isMultiLine}`
      )
      this.logVerbose(
        output,
        `Target created - identifier: ${target.identifier}`
      )

      // Models are validated during construction, so if we reach here they are valid

      let senderIdentity: ResolvedSenderIdentity | undefined
      try {
        const identityResolution = await this.resolveSenderIdentity(options, output)
        senderIdentity = identityResolution.identity
        for (const warning of identityResolution.warnings) {
          output.push(`⚠️ ${warning}`)
        }
        if (identityResolution.requiresAllowDefaultIdentity) {
          const errorMessage =
            identityResolution.allowDefaultIdentityErrorMessage ||
            'Sender identity not configured. Use --allow-default-identity to send with the default Slack identity.'
          return this.createFailureResult(new Error(errorMessage), 1, output)
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        return this.createFailureResult(err, 3, output)
      }

      // Load credentials with CLI override and test authentication first
      this.logVerbose(output, 'Loading authentication credentials...')
      try {
        const token = (options.token ?? process.env['SLACK_BOT_TOKEN'] ?? '')
          .toString()
          .trim()
        if (!token) {
          this.logVerbose(
            output,
            'SLACK_BOT_TOKEN environment variable is required'
          )
          return this.createFailureResult(
            new Error('SLACK_BOT_TOKEN environment variable is required'),
            2,
            output
          )
        }
        this.credentials = AuthenticationCredentials.forBotToken(token)
        // Masked token visibility in verbose mode
        this.logVerbose(output, 'Token loaded: xoxb-****')
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        // Normalize token format errors to match integration test expectations
        const wrapped = new Error(`Authentication failed: ${err.message}`)
        return this.createFailureResult(wrapped, 2, output)
      }

      // Ensure SlackService uses our credentials (so tests can spy on API interactions consistently)
      if (!this.slackService) {
        this.slackService = SlackService.withCredentials(this.credentials)
      }
      const slack = this.slackService

      // Show API connection step before any API calls in verbose mode
      this.logVerbose(output, 'Connecting to Slack API...')
      // Outline the next step so verbose mode reflects intended flow even if auth fails
      this.logVerbose(output, 'Sending message...')
      const authTest = await slack.testAuthentication()

      if (!authTest.valid) {
        const error = new Error(
          `Authentication failed: ${authTest.error || 'Unknown authentication error'}`
        )
        this.logVerbose(output, `Auth test failed: ${error.message}`)
        return this.createFailureResult(error, 2, output)
      }

      this.logVerbose(
        output,
        `Authentication successful - Bot ID: ${authTest.botId}, Team ID: ${authTest.teamId}`
      )

      // Validate channel exists and bot has access
      this.logVerbose(
        output,
        `Connecting to Slack API for channel validation...`
      )
      const channelInfo = await slack.getChannelInfo(channelId)

      if (!channelInfo.exists) {
        const error = new Error(
          `Channel not found: ${channelInfo.error || 'Channel does not exist'}`
        )
        this.logVerbose(output, `Channel check failed: ${error.message}`)
        return this.createFailureResult(error, 3, output)
      }

      this.logVerbose(
        output,
        `Channel found - Name: ${channelInfo.name}, Private: ${channelInfo.isPrivate}, Member: ${channelInfo.isMember}`
      )

      // Send the message
      this.logVerbose(output, 'Sending message to Slack API...')
      const deliveryResult = await slack.sendMessage(
        message,
        target,
        senderIdentity
      )

      // Handle result
      if (deliveryResult.success) {
        output.push(`✅ Message sent successfully to ${channelId}`)
        this.logVerbose(output, `Message ID: ${deliveryResult.messageId}`)
        this.logVerbose(
          output,
          `Delivery time: ${deliveryResult.deliveryTimeMs}ms`
        )
        this.logVerbose(output, `Retry count: ${deliveryResult.retryCount}`)

        return {
          success: true,
          deliveryResult,
          exitCode: 0,
          output,
        }
      } else {
        const error =
          deliveryResult.error || new Error('Message delivery failed')
        this.logVerbose(output, `Delivery failed: ${error.message}`)
        this.logVerbose(output, `Error type: ${deliveryResult.errorType}`)

        // Determine exit code based on error type
        const exitCode = this.getExitCodeForError(deliveryResult.errorType)
        return this.createFailureResult(error, exitCode, output, deliveryResult)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logVerbose(output, `Unexpected error: ${err.message}`)
      return this.createFailureResult(err, 99, output)
    }
  }

  /**
   * Create the command with environment-based configuration
   */
  static fromEnvironment(options?: {
    verboseLogging?: boolean
  }): SendMessageCommand {
    return new SendMessageCommand({
      verboseLogging: options?.verboseLogging || false,
    })
  }

  /**
   * Create the command with custom services for testing
   */
  static forTesting(config: SendMessageCommandConfig): SendMessageCommand {
    return new SendMessageCommand(config)
  }

  /**
   * Execute command from CLI options with full error handling
   */
  static async executeFromCli(
    options: CommandLineOptions
  ): Promise<SendMessageResult> {
    const command = SendMessageCommand.fromEnvironment({
      verboseLogging: options.verbose,
    })

    return await command.execute(options)
  }

  /**
   * Log verbose message if verbose logging is enabled
   */
  private logVerbose(output: string[], message: string): void {
    if (this.verboseLogging) {
      output.push(`[INFO] ${message}`)
    }
  }

  private async resolveSenderIdentity(
    options: CommandLineOptions,
    output: string[]
  ): Promise<{
    identity?: ResolvedSenderIdentity
    warnings: string[]
    requiresAllowDefaultIdentity: boolean
    allowDefaultIdentityErrorMessage?: string
  }> {
    const warnings: string[] = []
    let configIdentity: ChannelConfiguration['senderIdentity']
    let configSource: string | undefined

    const overridesProvided =
      options.senderName !== undefined ||
      options.senderIconEmoji !== undefined ||
      options.senderIconUrl !== undefined

    const configPath = options.configPath
    if (configPath) {
      this.logVerbose(output, `Loading configuration for sender identity: ${configPath}`)
      const result = await AppConfig.loadChannelConfiguration(configPath)
      if (!result.success || !result.configuration) {
        throw new Error(result.error || 'Failed to load configuration')
      }
      configIdentity = result.configuration.senderIdentity
      configSource = result.resolvedPath || configPath
    } else {
      const defaultPath = AppConfig.findDefaultConfigFile()
      if (defaultPath) {
        this.logVerbose(
          output,
          `Attempting to load sender identity from default configuration: ${defaultPath}`
        )
        const result = await AppConfig.loadChannelConfiguration(defaultPath)
        if (result.success && result.configuration) {
          configIdentity = result.configuration.senderIdentity
          configSource = result.resolvedPath || defaultPath
        } else if (result.error) {
          warnings.push(
            `Unable to load sender identity from ${defaultPath}: ${result.error}`
          )
        }
      }
    }

    const allowDefaultFromConfig =
      configIdentity?.allowDefaultIdentity === true

    const resolution = SenderIdentity.resolve(configIdentity, {
      name: options.senderName,
      iconEmoji: options.senderIconEmoji,
      iconUrl: options.senderIconUrl,
    })

    warnings.push(...resolution.warnings)

    let identity = resolution.identity
    if (identity && !SenderIdentity.isComplete(identity)) {
      warnings.push(
        `${
          resolution.sourceDescription || 'Sender identity'
        } is missing a name or icon. Using default Slack identity.`
      )
      identity = undefined
    }

    if (!identity && overridesProvided) {
      warnings.push(
        'Sender identity overrides require --sender-name and either --sender-icon-emoji or --sender-icon-url.'
      )
    }

    const allowDefaultIdentityEnabled =
      options.allowDefaultIdentity || allowDefaultFromConfig

    let requiresAllowDefaultIdentity = false
    let allowDefaultIdentityErrorMessage: string | undefined

    if (!identity) {
      if (!allowDefaultIdentityEnabled) {
        const message = configSource
          ? `Sender identity not configured in ${configSource}. Use --allow-default-identity to send with the default Slack identity.`
          : 'Sender identity not configured. Use --allow-default-identity to send with the default Slack identity.'
        warnings.push(message)
        requiresAllowDefaultIdentity = true
        allowDefaultIdentityErrorMessage = message
      } else if (allowDefaultFromConfig && !options.allowDefaultIdentity) {
        warnings.push(
          `Sender identity is not configured, but ${configSource || 'the configuration'} allows using the default Slack identity.`
        )
      }
    }

    if (identity) {
      const icon = identity.iconEmoji || identity.iconUrl || 'default'
      this.logVerbose(
        output,
        `Sender identity resolved from ${
          resolution.sourceDescription || 'configuration'
        }: name="${identity.name}" icon=${icon}`
      )
    } else if (configSource) {
      this.logVerbose(
        output,
        `Using default Slack identity for message (no sender identity resolved from ${configSource}).`
      )
    }

    return {
      identity,
      warnings,
      requiresAllowDefaultIdentity,
      allowDefaultIdentityErrorMessage,
    }
  }

  /**
   * Create a failure result with consistent structure
   */
  private createFailureResult(
    error: Error,
    exitCode: number,
    output: string[],
    deliveryResult?: MessageDeliveryResult
  ): SendMessageResult {
    output.push(`❌ Error: ${error.message}`)

    return {
      success: false,
      error,
      exitCode,
      output,
      deliveryResult,
    }
  }

  /**
   * Determine exit code based on error type
   */
  private getExitCodeForError(errorType?: string): number {
    switch (errorType) {
      case 'authentication':
        return 2
      case 'channel':
        return 3
      case 'network':
        return 4
      case 'validation':
        return 1
      default:
        return 5
    }
  }

  /**
   * Get command configuration for debugging
   */
  getConfiguration(): object {
    return {
      verboseLogging: this.verboseLogging,
      slackServiceConfig: this.slackService
        ? this.slackService.getClientConfig()
        : { initialized: false },
      errorHandlerConfig: this.errorHandler.getConfiguration(),
    }
  }

  /**
   * Validate that all required dependencies are properly configured
   */
  async validateConfiguration(): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Test Slack service configuration
      if (!this.slackService) {
        return {
          valid: false,
          errors: ['Slack service not initialized'],
          warnings,
        }
      }
      const authTest = await this.slackService.testAuthentication()
      if (!authTest.valid) {
        errors.push(`Slack authentication failed: ${authTest.error}`)
      }

      // Check if environment variables are properly set
      const credentials = AuthenticationCredentials.fromEnvironment()
      if (!credentials.isValid) {
        errors.push('Invalid or missing Slack credentials in environment')
      }

      // Validate error handler
      if (!this.errorHandler) {
        errors.push('Error handler service not initialized')
      }
    } catch (error) {
      errors.push(
        `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
