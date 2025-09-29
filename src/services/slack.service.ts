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
import type { ResolvedChannel } from '../models/resolved-channel'
import type { BroadcastResult } from '../models/broadcast-result'
import type { ChannelDeliveryResult } from '../models/channel-delivery-result'
import type { BroadcastOptions } from '../models/broadcast-options'

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
          channelId: target.identifier,
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
          target.identifier,
          Date.now() - startTime,
          retryCount
        )
      }
    } catch (error) {
      const deliveryTime = Date.now() - startTime
      return this.createFailureResult(
        error instanceof Error ? error : new Error(String(error)),
        target.identifier,
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
      channel: target.identifier,
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

  // ============================================================================
  // NEW METHODS FOR BROADCAST FUNCTIONALITY
  // ============================================================================

  /**
   * Resolve channel targets to full channel information
   */
  async resolveChannels(targets: ChannelTarget[]): Promise<ResolvedChannel[]> {
    // Fast path: nothing to resolve
    if (!targets || targets.length === 0) {
      return []
    }
    const resolved: ResolvedChannel[] = []
    const channelCache = new Map<string, ResolvedChannel>()
    const seenIds = new Set<string>()

    // Get all channels for efficient lookup
    const allChannels = await this.getAllChannels()
    const channelMap = new Map(allChannels.map(ch => [ch.id, ch]))
    const nameMap = new Map(allChannels.map(ch => [ch.name, ch]))

    for (const target of targets) {
      try {
        let channel: ResolvedChannel | undefined

        if (target.type === 'id') {
          // Direct lookup by ID
          if (channelCache.has(target.identifier)) {
            channel = channelCache.get(target.identifier)
          } else {
            channel = channelMap.get(target.identifier)
          }
        } else if (target.type === 'name') {
          // Lookup by name (remove # prefix)
          const channelName = target.identifier.startsWith('#')
            ? target.identifier.slice(1)
            : target.identifier
          channel = nameMap.get(channelName)
        }

        if (channel) {
          // Deduplicate by channel ID
          if (!seenIds.has(channel.id)) {
            resolved.push(channel)
            channelCache.set(channel.id, channel)
            seenIds.add(channel.id)
          }
        }
      } catch (error) {
        // Log error but continue with other channels
        console.warn(`Failed to resolve channel ${target.identifier}:`, error)
      }
    }

    return resolved
  }

  /**
   * Get all accessible channels
   */
  async getAllChannels(): Promise<ResolvedChannel[]> {
    try {
      const channels: ResolvedChannel[] = []
      let cursor: string | undefined

      do {
        const requestParams: any = {
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 1000,
        }

        if (cursor) {
          requestParams.cursor = cursor
        }

        const response = await this.client.conversations.list(requestParams)

        if (!response.ok) {
          const reason = (response as any).error || 'unknown_error'
          throw new Error(reason)
        }

        if (response.channels) {
          for (const channel of response.channels) {
            channels.push({
              id: channel.id!,
              name: channel.name!,
              isPrivate: channel.is_private || false,
              isMember: channel.is_member || false,
              isArchived: channel.is_archived || false,
            })
          }
        }

        cursor = response.response_metadata?.next_cursor
      } while (cursor)

      return channels
    } catch (error) {
      throw new Error(
        `Failed to fetch channels: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Broadcast message to multiple channels
   */
  async broadcastMessage(
    channels: ResolvedChannel[],
    message: string,
    options?: Partial<BroadcastOptions>
  ): Promise<BroadcastResult> {
    const deliveryResults: ChannelDeliveryResult[] = []

    for (const channel of channels) {
      try {
        // Skip if bot is not a member and it's a private channel
        if (channel.isPrivate && !channel.isMember) {
          deliveryResults.push({
            channel,
            status: 'skipped',
            error: {
              type: 'not_in_channel',
              message: 'Bot is not a member of this private channel',
            },
          })
          continue
        }

        // Skip archived channels
        if (channel.isArchived) {
          deliveryResults.push({
            channel,
            status: 'failed',
            error: {
              type: 'is_archived',
              message: 'Cannot send messages to archived channels',
            },
          })
          continue
        }

        // Send message
        const response = await this.client.chat.postMessage({
          channel: channel.id,
          text: message,
          as_user: true,
        })

        if (response.ok && response.ts) {
          deliveryResults.push({
            channel,
            status: 'success',
            messageId: response.ts,
            deliveredAt: new Date(),
          })
        } else {
          deliveryResults.push({
            channel,
            status: 'failed',
            error: {
              type: response.error || 'unknown_error',
              message: response.error || 'Unknown error occurred',
            },
          })
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        deliveryResults.push({
          channel,
          status: 'failed',
          error: {
            type: 'network_error',
            message: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    // Determine overall status
    const successCount = deliveryResults.filter(
      r => r.status === 'success'
    ).length

    let overallStatus: 'success' | 'partial' | 'failed'
    if (successCount === channels.length) {
      overallStatus = 'success'
    } else if (successCount > 0) {
      overallStatus = 'partial'
    } else {
      overallStatus = 'failed'
    }

    return {
      targetListName: options?.listName || 'unknown',
      totalChannels: channels.length,
      deliveryResults,
      overallStatus,
      completedAt: new Date(),
    }
  }

  /**
   * Validate channel access for broadcast
   */
  async validateChannelAccess(channelId: string): Promise<boolean> {
    try {
      const response = await this.client.conversations.info({
        channel: channelId,
      })

      return response.ok && response.channel?.is_member === true
    } catch (error) {
      return false
    }
  }
}
