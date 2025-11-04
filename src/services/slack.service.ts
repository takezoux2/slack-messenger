/**
 * Slack API Service
 *
 * Handles communication with the Slack Web API including message sending,
 * authentication, rate limiting, and error handling.
 */

import {
  WebClient,
  ChatPostMessageResponse,
  ChatPostMessageArguments,
  LogLevel,
} from '@slack/web-api'
import { SlackMessage } from '../models/slack-message.js'
import { ChannelTarget } from '../models/channel-target.js'
import { AuthenticationCredentials } from '../models/authentication-credentials.js'
import { MessageDeliveryResult } from '../models/message-delivery-result.js'
import type { ResolvedChannel } from '../models/resolved-channel'
import type { BroadcastResult } from '../models/broadcast-result'
import type {
  ChannelDeliveryResult,
  SlackError,
} from '../models/channel-delivery-result'
import type { BroadcastOptions } from '../models/broadcast-options'
import type { ResolvedSenderIdentity } from '../models/sender-identity'

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
    target: ChannelTarget,
    identity?: ResolvedSenderIdentity
  ): Promise<MessageDeliveryResult> {
    const startTime = Date.now()
    const retryCount = 0

    try {
      // Validate authentication
      if (!this.config.credentials.isValid) {
        throw new Error('Invalid authentication credentials')
      }

      // Prepare the API call
      const response = await this.performSendMessage(message, target, identity)
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
            ...(identity
              ? {
                  senderIdentity: {
                    source: identity.source,
                    name: identity.name,
                    iconEmoji: identity.iconEmoji,
                    iconUrl: identity.iconUrl,
                  },
                }
              : {}),
          },
        })
      } else {
        // Handle API error response
        const error = new Error(response.error || 'Unknown Slack API error')
        const metadata: Record<string, unknown> = {
          slackResponse: response,
        }

        return this.createFailureResult(
          error,
          target.identifier,
          Date.now() - startTime,
          retryCount,
          identity,
          metadata
        )
      }
    } catch (error) {
      const deliveryTime = Date.now() - startTime
      return this.createFailureResult(
        error instanceof Error ? error : new Error(String(error)),
        target.identifier,
        deliveryTime,
        retryCount,
        identity
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
    target: ChannelTarget,
    identity?: ResolvedSenderIdentity
  ): Promise<ChatPostMessageResponse> {
    const payload: ChatPostMessageArguments = {
      channel: target.identifier,
      text: message.getFormattedContent(),
      unfurl_links: false,
      unfurl_media: false,
    }

    if (identity && identity.name) {
      payload['username'] = identity.name
      if (identity.iconEmoji) {
        payload['icon_emoji'] = identity.iconEmoji
      }
      if (identity.iconUrl) {
        payload['icon_url'] = identity.iconUrl
      }
    }

    return await this.client.chat.postMessage(payload)
  }

  private createFailureResult(
    error: Error,
    channelId: string,
    deliveryTimeMs: number,
    retryCount: number,
    identity?: ResolvedSenderIdentity,
    extraMetadata?: Record<string, unknown>
  ): MessageDeliveryResult {
    let normalizedError = error

    const metadata: Record<string, unknown> = {
      deliveryAttempts: retryCount + 1,
      deliveryTimeMs,
      retryCount,
      originalError: error.name,
      originalErrorMessage: error.message,
      ...(extraMetadata ?? {}),
    }

    if (identity) {
      metadata['senderIdentity'] = {
        source: identity.source,
        name: identity.name,
        iconEmoji: identity.iconEmoji,
        iconUrl: identity.iconUrl,
      }
    }

    const slackResponse = this.extractSlackResponse(normalizedError, metadata)
    if (slackResponse && !metadata['slackResponse']) {
      metadata['slackResponse'] = slackResponse
    }

    const slackError = this.extractSlackErrorCode(normalizedError, metadata)
    if (slackError) {
      metadata['slackError'] = slackError
    }

    if (this.isInvalidArgumentsError(normalizedError, metadata)) {
      const message = this.buildInvalidArgumentsMessage(
        normalizedError,
        metadata
      )
      const validationError = new Error(message)
      validationError.name = 'ValidationError'
      normalizedError = validationError
      metadata['errorCategory'] = 'invalid_arguments'
      metadata['validationGuidance'] =
        'Ensure the message text is between 1 and 40,000 characters, is not empty, and the channel ID is valid.'
    }

    if (this.isAuthenticationError(normalizedError)) {
      return MessageDeliveryResult.authenticationError(
        normalizedError,
        metadata
      )
    }

    if (this.isChannelError(normalizedError)) {
      return MessageDeliveryResult.channelError(
        normalizedError,
        channelId,
        metadata
      )
    }

    if (this.isNetworkError(normalizedError)) {
      return MessageDeliveryResult.networkError(
        normalizedError,
        channelId,
        retryCount,
        metadata
      )
    }

    return MessageDeliveryResult.failure({
      error: normalizedError,
      channelId,
      deliveryTimeMs,
      retryCount,
      metadata,
    })
  }

  private extractSlackResponse(
    error: Error,
    metadata: Record<string, unknown>
  ): ChatPostMessageResponse | undefined {
    const fromMetadata = metadata['slackResponse']
    if (fromMetadata && typeof fromMetadata === 'object') {
      return fromMetadata as ChatPostMessageResponse
    }

    const errorWithData = error as Error & {
      data?: Partial<ChatPostMessageResponse>
    }

    if (
      errorWithData.data &&
      typeof errorWithData.data === 'object' &&
      errorWithData.data.ok === false
    ) {
      return errorWithData.data as ChatPostMessageResponse
    }

    return undefined
  }

  private extractSlackErrorCode(
    error: Error,
    metadata: Record<string, unknown>
  ): string | undefined {
    const fromMetadata = metadata['slackError']
    if (typeof fromMetadata === 'string' && fromMetadata.length > 0) {
      return fromMetadata
    }

    const slackResponse = metadata['slackResponse'] as
      | ChatPostMessageResponse
      | undefined
    if (slackResponse?.error) {
      return slackResponse.error
    }

    const errorWithData = error as Error & {
      data?: { error?: unknown }
    }

    if (errorWithData.data && typeof errorWithData.data.error === 'string') {
      return errorWithData.data.error
    }

    return undefined
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

  private isInvalidArgumentsError(
    error: Error,
    extraMetadata?: Record<string, unknown>
  ): boolean {
    const patterns = [
      /invalid_arguments/i,
      /text.*must.*not.*be.*empty/i,
      /text.*cannot.*be.*empty/i,
      /invalid.*arguments/i,
    ]

    const matchesPattern = patterns.some(
      pattern => pattern.test(error.message) || pattern.test(error.name)
    )

    if (matchesPattern) {
      return true
    }

    const slackResponse = extraMetadata?.['slackResponse'] as
      | ChatPostMessageResponse
      | undefined
    const responseMessages = slackResponse?.response_metadata?.messages
    if (Array.isArray(responseMessages)) {
      return responseMessages.some(message =>
        patterns.some(pattern => pattern.test(message))
      )
    }

    return false
  }

  private buildInvalidArgumentsMessage(
    error: Error,
    extraMetadata?: Record<string, unknown>
  ): string {
    const slackResponse = extraMetadata?.['slackResponse'] as
      | ChatPostMessageResponse
      | undefined
    const responseMessages = slackResponse?.response_metadata?.messages

    const guidance =
      'Ensure the message text is between 1 and 40,000 characters, is not empty, and the channel ID is valid.'

    if (Array.isArray(responseMessages) && responseMessages.length > 0) {
      const combined = responseMessages.join(' ')
      return `Slack rejected the request: ${combined}`
    }

    if (error.message && error.message !== 'invalid_arguments') {
      return `Slack rejected the request: ${error.message}`
    }

    return `Slack rejected the request due to invalid arguments. ${guidance}`
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
    options?: Partial<BroadcastOptions>,
    identity?: ResolvedSenderIdentity
  ): Promise<BroadcastResult> {
    const deliveryResults: ChannelDeliveryResult[] = []

    for (const [index, channel] of channels.entries()) {
      try {
        const payload: ChatPostMessageArguments = {
          channel: channel.id,
          text: message,
          unfurl_links: false,
          unfurl_media: false,
        }

        if (identity && identity.name) {
          payload['username'] = identity.name
          if (identity.iconEmoji) {
            payload['icon_emoji'] = identity.iconEmoji
          }
          if (identity.iconUrl) {
            payload['icon_url'] = identity.iconUrl
          }
        }

        const response = await this.client.chat.postMessage(payload)
        if (response.ok && response.ts) {
          deliveryResults.push({
            channel,
            status: 'success',
            messageId: response.ts,
            deliveredAt: new Date(),
          })
        } else {
          const errorMessage =
            response.error || 'Slack API returned an unsuccessful response'
          const apiError = new Error(errorMessage)
          deliveryResults.push(
            this.buildChannelFailureResult(channel, apiError, response)
          )
        }
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error(String(error))
        deliveryResults.push(
          this.buildChannelFailureResult(channel, normalizedError)
        )
      }

      if (index < channels.length - 1) {
        await this.delay(100)
      }
    }

    return {
      targetListName: options?.listName || 'unknown',
      totalChannels: channels.length,
      deliveryResults,
      overallStatus: this.determineOverallStatus(deliveryResults),
      completedAt: new Date(),
    }
  }

  private buildChannelFailureResult(
    channel: ResolvedChannel,
    error: Error,
    slackResponse?: ChatPostMessageResponse
  ): ChannelDeliveryResult {
    const slackError = this.normalizeSlackError(error, slackResponse)
    const status: ChannelDeliveryResult['status'] = this.shouldMarkAsSkipped(
      slackError.type,
      channel
    )
      ? 'skipped'
      : 'failed'

    return {
      channel,
      status,
      error: slackError,
    }
  }

  private normalizeSlackError(
    error: Error,
    slackResponse?: ChatPostMessageResponse
  ): SlackError {
    const metadata: Record<string, unknown> = {}
    if (slackResponse) {
      metadata['slackResponse'] = slackResponse
    }

    const rawType = this.extractSlackErrorCode(error, metadata)
    const normalizedType =
      rawType && `${rawType}`.length > 0
        ? this.normalizeErrorType(String(rawType))
        : this.classifyFallbackError(error)

    const fallbackMessage = this.extractErrorMessage(error, slackResponse)
    const message = this.getSlackErrorMessage(normalizedType, fallbackMessage)
    const details = this.buildSlackErrorDetails(error, slackResponse)
    const retryAfter = this.extractRetryAfterSeconds(error)

    const slackError: SlackError = {
      type: normalizedType,
      message,
    }

    if (details && Object.keys(details).length > 0) {
      slackError.details = details
    }

    if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
      slackError.retryAfter = retryAfter
    }

    return slackError
  }

  private determineOverallStatus(
    results: ChannelDeliveryResult[]
  ): BroadcastResult['overallStatus'] {
    if (results.length === 0) {
      return 'success'
    }

    const successCount = results.filter(r => r.status === 'success').length
    if (successCount === results.length) {
      return 'success'
    }

    if (successCount === 0) {
      return 'failed'
    }

    return 'partial'
  }

  private shouldMarkAsSkipped(
    errorType: string | undefined,
    channel: ResolvedChannel
  ): boolean {
    if (!errorType) {
      return false
    }

    const skipTypes = new Set([
      'not_in_channel',
      'not_in_group',
      'missing_scope',
      'no_permission',
      'restricted_action',
      'cannot_dm_bot',
    ])

    if (skipTypes.has(errorType)) {
      return true
    }

    if (!channel.isMember && errorType === 'channel_error') {
      return true
    }

    return false
  }

  private getSlackErrorMessage(errorType: string, fallback: string): string {
    const safeFallback =
      fallback && fallback.trim().length > 0
        ? fallback
        : 'Slack API request failed'

    switch (errorType) {
      case 'not_in_channel':
      case 'not_in_group':
        return 'Bot is not a member of the channel.'
      case 'missing_scope':
        return 'Missing a required Slack scope for this channel.'
      case 'no_permission':
      case 'restricted_action':
        return 'Slack denied permission to post to this channel.'
      case 'cannot_dm_bot':
        return 'Cannot send direct messages to this bot.'
      case 'channel_is_archived':
      case 'is_archived':
        return 'Channel is archived and cannot receive messages.'
      case 'channel_not_found':
        return 'Channel not found. Verify the channel ID or name.'
      case 'invalid_auth':
      case 'not_authed':
        return 'Authentication failed for the Slack workspace.'
      case 'rate_limited':
        return 'Slack rate limit reached. Try again after waiting.'
      case 'network_error':
        return 'Network error while contacting Slack.'
      default:
        return safeFallback
    }
  }

  private normalizeErrorType(value: string): string {
    if (!value || value.trim().length === 0) {
      return 'unknown_error'
    }

    return value
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase()
  }

  private classifyFallbackError(error: Error): string {
    if (this.isAuthenticationError(error)) {
      return 'authentication_error'
    }

    if (this.isChannelError(error)) {
      return 'channel_error'
    }

    if (this.isNetworkError(error)) {
      return 'network_error'
    }

    return error.name && error.name !== 'Error'
      ? this.normalizeErrorType(error.name)
      : 'unknown_error'
  }

  private extractErrorMessage(
    error: Error,
    slackResponse?: ChatPostMessageResponse
  ): string {
    if (slackResponse?.error) {
      return slackResponse.error
    }

    const errorWithData = error as Error & {
      data?: Record<string, unknown>
    }

    const data = errorWithData.data
    const dataError = data?.['error']
    if (typeof dataError === 'string' && dataError.length > 0) {
      return dataError
    }

    const match = /An API error occurred: (.+)$/i.exec(error.message)
    if (match && match[1]) {
      return match[1]
    }

    return error.message || 'Slack API request failed'
  }

  private buildSlackErrorDetails(
    error: Error,
    slackResponse?: ChatPostMessageResponse
  ): Record<string, unknown> | undefined {
    const details: Record<string, unknown> = {}
    const errorWithData = error as Error & {
      data?: Record<string, unknown>
    }

    const responseMetadata =
      slackResponse?.response_metadata ||
      (errorWithData.data?.['response_metadata'] as
        | Record<string, unknown>
        | undefined)

    const messages = responseMetadata?.['messages']
    if (Array.isArray(messages) && messages.length > 0) {
      details['slackMessages'] = messages
    }

    const warnings = responseMetadata?.['warnings']
    if (Array.isArray(warnings) && warnings.length > 0) {
      details['warnings'] = warnings
    }

    if (errorWithData.data) {
      const needed = errorWithData.data['needed']
      if (needed !== undefined) {
        details['needed'] = needed
      }

      const provided = errorWithData.data['provided']
      if (provided !== undefined) {
        details['provided'] = provided
      }

      const scopes = errorWithData.data['scopes']
      if (scopes !== undefined) {
        details['scopes'] = scopes
      }

      const acceptedScopes = errorWithData.data['acceptedScopes']
      if (acceptedScopes !== undefined) {
        details['acceptedScopes'] = acceptedScopes
      }
    }

    return Object.keys(details).length > 0 ? details : undefined
  }

  private extractRetryAfterSeconds(error: Error): number | undefined {
    const errorWithRetry = error as Error & {
      retryAfter?: number
      data?: Record<string, unknown>
    }

    if (typeof errorWithRetry.retryAfter === 'number') {
      return errorWithRetry.retryAfter
    }

    const data = errorWithRetry.data
    if (data) {
      const retryAfterValue = data['retry_after']
      if (typeof retryAfterValue === 'number') {
        return retryAfterValue
      }

      const headers = data['headers'] as Record<string, unknown> | undefined
      if (headers) {
        const headerValue = headers['retry-after'] ?? headers['Retry-After']
        if (typeof headerValue === 'string') {
          const parsed = Number(headerValue)
          if (Number.isFinite(parsed)) {
            return parsed
          }
        } else if (typeof headerValue === 'number') {
          return headerValue
        }
      }
    }

    return undefined
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
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
