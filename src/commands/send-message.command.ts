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
  private readonly slackService: SlackService
  private readonly errorHandler: ErrorHandlerService
  private readonly verboseLogging: boolean

  constructor(config?: SendMessageCommandConfig) {
    this.verboseLogging = config?.verboseLogging || false

    // Use provided services or create defaults
    this.slackService = config?.slackService || SlackService.fromEnvironment()
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
      const messageText = options.message

      if (!channelId || !messageText) {
        const error = new Error(
          'Missing required parameters: channelId and message'
        )
        this.logVerbose(
          output,
          `Missing parameters - channelId: ${!!channelId}, message: ${!!messageText}`
        )
        return this.createFailureResult(error, 1, output)
      }

      this.logVerbose(
        output,
        `Preparing to send message to channel: ${channelId}`
      )
      this.logVerbose(
        output,
        `Message length: ${messageText.length} characters`
      )

      // Create models
      const message = SlackMessage.create(messageText, channelId)
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

      // Test authentication first
      this.logVerbose(output, 'Loading authentication credentials...')
      const authTest = await this.slackService.testAuthentication()

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
      const channelInfo = await this.slackService.getChannelInfo(channelId)

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
      const deliveryResult = await this.slackService.sendMessage(
        message,
        target
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
      slackServiceConfig: this.slackService.getClientConfig(),
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
