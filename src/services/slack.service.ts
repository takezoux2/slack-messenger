/**
 * Slack API Service
 *
 * Handles communication with the Slack Web API including message sending,
 * authentication, rate limiting, and error handling.
 */

import { WebClient, ChatPostMessageResponse, LogLevel } from '@slack/web-api'
import { SlackMessage } from '../models/slack-message.js'
import { ChannelTarget } from '../models/channel-target.js'
import { AuthenticationCredentials } from '../models/authentication-credentials.js'
import { MessageDeliveryResult } from '../models/message-delivery-result.js'

export interface SlackServiceConfig {
  credentials: AuthenticationCredentials
  logLevel?: LogLevel
  timeout?: number
  retries?: number
  retryDelayMs?: number
}

export class SlackService {
  private readonly client: WebClient
  private readonly config: Required<SlackServiceConfig>

  constructor(config: SlackServiceConfig) {
    this.config = {
      credentials: config.credentials,
      logLevel: config.logLevel || LogLevel.INFO,
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      retryDelayMs: config.retryDelayMs || 1000,
    }

    this.client = new WebClient(this.config.credentials.token, {
      logLevel: this.config.logLevel,
      timeout: this.config.timeout,
    })
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(
    message: SlackMessage,
    target: ChannelTarget
  ): Promise<MessageDeliveryResult> {
    const startTime = Date.now()
    let retryCount = 0

    try {
      // Validate authentication
      if (!this.config.credentials.isValid) {
        throw new Error('Invalid authentication credentials')
      }

      // Prepare the API call
      const response = await this.performSendMessage(message, target)
      const deliveryTime = Date.now() - startTime

      // Process successful response
      if (response.ok && response.message) {
        return MessageDeliveryResult.success({
          messageId: response.message.ts || '',
          timestamp: response.message.ts || '',
          channelId: target.channelId,
          deliveryTimeMs: deliveryTime,
          retryCount,
          metadata: {
            slackResponse: response,
            messageLength: message.contentLength,
            hasMarkdown: message.hasMarkdownFormatting,
            isMultiLine: message.isMultiLine,
          },
        })
      } else {
        // Handle API error response
        const error = new Error(response.error || 'Unknown Slack API error')
        return this.createFailureResult(
          error,
          target.channelId,
          Date.now() - startTime,
          retryCount
        )
      }
    } catch (error) {
      const deliveryTime = Date.now() - startTime
      return this.createFailureResult(
        error instanceof Error ? error : new Error(String(error)),
        target.channelId,
        deliveryTime,
        retryCount
      )
    }
  }

  /**
   * Test authentication by calling auth.test
   */
  async testAuthentication(): Promise<{
    valid: boolean
    botId?: string | undefined
    teamId?: string | undefined
    error?: string | undefined
  }> {
    try {
      const response = await this.client.auth.test()

      if (response.ok) {
        return {
          valid: true,
          botId: response.bot_id,
          teamId: response.team_id,
        }
      } else {
        return {
          valid: false,
          error: response.error || 'Authentication test failed',
        }
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channelId: string): Promise<{
    exists: boolean
    name?: string | undefined
    isPrivate?: boolean | undefined
    isMember?: boolean | undefined
    error?: string | undefined
  }> {
    try {
      // Try conversations.info first (works for channels, groups, DMs)
      const response = await this.client.conversations.info({
        channel: channelId,
      })

      if (response.ok && response.channel) {
        return {
          exists: true,
          name: response.channel.name,
          isPrivate: response.channel.is_private,
          isMember: response.channel.is_member,
        }
      } else {
        return {
          exists: false,
          error: response.error || 'Channel not found',
        }
      }
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Perform the actual message sending API call
   */
  private async performSendMessage(
    message: SlackMessage,
    target: ChannelTarget
  ): Promise<ChatPostMessageResponse> {
    return await this.client.chat.postMessage({
      channel: target.channelId,
      text: message.getFormattedContent(),
      unfurl_links: false,
      unfurl_media: false,
    })
  }

  /**
   * Create a failure result based on error type
   */
  private createFailureResult(
    error: Error,
    channelId: string,
    deliveryTimeMs: number,
    retryCount: number
  ): MessageDeliveryResult {
    const metadata = {
      originalError: error.name,
      deliveryAttempts: retryCount + 1,
    }

    // Determine error type and create appropriate result
    if (this.isAuthenticationError(error)) {
      return MessageDeliveryResult.authenticationError(error, metadata)
    } else if (this.isChannelError(error)) {
      return MessageDeliveryResult.channelError(error, channelId, metadata)
    } else if (this.isNetworkError(error)) {
      return MessageDeliveryResult.networkError(
        error,
        channelId,
        retryCount,
        metadata
      )
    } else {
      return MessageDeliveryResult.failure({
        error,
        channelId,
        deliveryTimeMs,
        retryCount,
        metadata,
      })
    }
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: Error): boolean {
    const authErrorPatterns = [
      /invalid.*auth/i,
      /token.*invalid/i,
      /not.*authed/i,
      /account.*inactive/i,
      /invalid.*token/i,
      /token.*revoked/i,
      /token.*expired/i,
    ]

    return authErrorPatterns.some(
      pattern => pattern.test(error.message) || pattern.test(error.name)
    )
  }

  /**
   * Check if error is channel-related
   */
  private isChannelError(error: Error): boolean {
    const channelErrorPatterns = [
      /channel.*not.*found/i,
      /is.*archived/i,
      /cannot.*post/i,
      /not.*in.*channel/i,
      /channel.*is.*archived/i,
      /restricted.*action/i,
    ]

    return channelErrorPatterns.some(
      pattern => pattern.test(error.message) || pattern.test(error.name)
    )
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorPatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /enotfound/i,
      /econnrefused/i,
      /socket/i,
      /fetch/i,
    ]

    return networkErrorPatterns.some(
      pattern => pattern.test(error.message) || pattern.test(error.name)
    )
  }

  /**
   * Get client configuration for debugging
   */
  getClientConfig(): object {
    return {
      tokenType: this.config.credentials.tokenType,
      logLevel: this.config.logLevel,
      timeout: this.config.timeout,
      retries: this.config.retries,
      retryDelayMs: this.config.retryDelayMs,
      hasValidCredentials: this.config.credentials.isValid,
    }
  }

  /**
   * Create SlackApiService from environment
   */
  static fromEnvironment(options?: Partial<SlackServiceConfig>): SlackService {
    const credentials = AuthenticationCredentials.fromEnvironment()
    return new SlackService({
      credentials,
      ...options,
    })
  }

  /**
   * Create SlackService with custom credentials
   */
  static withCredentials(
    credentials: AuthenticationCredentials,
    options?: Partial<SlackServiceConfig>
  ): SlackService {
    return new SlackService({
      credentials,
      ...options,
    })
  }

  /**
   * Create SlackService for testing with mocked client
   */
  static forTesting(config: SlackServiceConfig): SlackService {
    return new SlackService(config)
  }
}
