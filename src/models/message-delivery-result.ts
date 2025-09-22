/**
 * MessageDeliveryResult Model
 *
 * Represents the result of a message delivery operation to Slack.
 * This model encapsulates success/failure status, metadata, and error information.
 */

export interface MessageDeliveryResultParams {
  success: boolean
  messageId?: string | undefined
  timestamp?: string | undefined
  channelId?: string | undefined
  error?: Error | undefined
  retryCount?: number | undefined
  deliveryTimeMs?: number | undefined
  metadata?: Record<string, unknown> | undefined
}

export class MessageDeliveryResult {
  private readonly _success: boolean
  private readonly _messageId: string | undefined
  private readonly _timestamp: string | undefined
  private readonly _channelId: string | undefined
  private readonly _error: Error | undefined
  private readonly _retryCount: number
  private readonly _deliveryTimeMs: number
  private readonly _metadata: Record<string, unknown> | undefined
  private readonly _createdAt: Date

  constructor(params: MessageDeliveryResultParams) {
    this._success = params.success
    this._messageId = params.messageId
    this._timestamp = params.timestamp
    this._channelId = params.channelId
    this._error = params.error
    this._retryCount = params.retryCount || 0
    this._deliveryTimeMs = params.deliveryTimeMs || 0
    this._metadata = params.metadata
    this._createdAt = new Date()
  }

  /**
   * Check if the message delivery was successful
   */
  get success(): boolean {
    return this._success
  }

  /**
   * Check if the message delivery failed
   */
  get failed(): boolean {
    return !this._success
  }

  /**
   * Get the Slack message ID (if successful)
   */
  get messageId(): string | undefined {
    return this._messageId
  }

  /**
   * Get the Slack message timestamp (if successful)
   */
  get timestamp(): string | undefined {
    return this._timestamp
  }

  /**
   * Get the target channel ID
   */
  get channelId(): string | undefined {
    return this._channelId
  }

  /**
   * Get the error (if failed)
   */
  get error(): Error | undefined {
    return this._error
  }

  /**
   * Get the number of retries attempted
   */
  get retryCount(): number {
    return this._retryCount
  }

  /**
   * Get the delivery time in milliseconds
   */
  get deliveryTimeMs(): number {
    return this._deliveryTimeMs
  }

  /**
   * Get the delivery time in seconds
   */
  get deliveryTimeSeconds(): number {
    return Math.round(this._deliveryTimeMs / 1000)
  }

  /**
   * Get additional metadata about the delivery
   */
  get metadata(): Record<string, unknown> | undefined {
    return this._metadata
  }

  /**
   * Get when this result was created
   */
  get createdAt(): Date {
    return this._createdAt
  }

  /**
   * Get the error message (if failed)
   */
  get errorMessage(): string | undefined {
    return this._error?.message
  }

  /**
   * Get the error type/name (if failed)
   */
  get errorType(): string | undefined {
    return this._error?.name
  }

  /**
   * Check if the error was due to authentication issues
   */
  get isAuthenticationError(): boolean {
    if (!this._error) return false

    const authErrorPatterns = [
      /invalid.*auth/i,
      /token.*invalid/i,
      /not.*authed/i,
      /account.*inactive/i,
      /invalid.*token/i,
    ]

    return authErrorPatterns.some(
      pattern =>
        pattern.test(this._error!.message) || pattern.test(this._error!.name)
    )
  }

  /**
   * Check if the error was due to channel issues
   */
  get isChannelError(): boolean {
    if (!this._error) return false

    const channelErrorPatterns = [
      /channel.*not.*found/i,
      /is.*archived/i,
      /cannot.*post/i,
      /not.*in.*channel/i,
      /channel.*is.*archived/i,
    ]

    return channelErrorPatterns.some(
      pattern =>
        pattern.test(this._error!.message) || pattern.test(this._error!.name)
    )
  }

  /**
   * Check if the error was due to rate limiting
   */
  get isRateLimitError(): boolean {
    if (!this._error) return false

    const rateLimitPatterns = [
      /rate.*limit/i,
      /too.*many.*requests/i,
      /retry.*after/i,
    ]

    return rateLimitPatterns.some(
      pattern =>
        pattern.test(this._error!.message) || pattern.test(this._error!.name)
    )
  }

  /**
   * Check if the error was due to network issues
   */
  get isNetworkError(): boolean {
    if (!this._error) return false

    const networkErrorPatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /enotfound/i,
      /econnrefused/i,
      /socket/i,
    ]

    return networkErrorPatterns.some(
      pattern =>
        pattern.test(this._error!.message) || pattern.test(this._error!.name)
    )
  }

  /**
   * Check if this was a fast delivery (< 1 second)
   */
  get isFastDelivery(): boolean {
    return this._deliveryTimeMs < 1000
  }

  /**
   * Check if this was a slow delivery (> 5 seconds)
   */
  get isSlowDelivery(): boolean {
    return this._deliveryTimeMs > 5000
  }

  /**
   * Check if retries were needed
   */
  get hadRetries(): boolean {
    return this._retryCount > 0
  }

  /**
   * Get the appropriate exit code for CLI
   */
  get exitCode(): number {
    if (this._success) {
      return 0 // Success
    }

    if (this.isAuthenticationError) {
      return 2 // Authentication error
    }

    return 1 // General error
  }

  /**
   * Create a successful delivery result
   */
  static success(params: {
    messageId: string
    timestamp: string
    channelId: string
    deliveryTimeMs?: number | undefined
    retryCount?: number | undefined
    metadata?: Record<string, unknown> | undefined
  }): MessageDeliveryResult {
    return new MessageDeliveryResult({
      success: true,
      messageId: params.messageId,
      timestamp: params.timestamp,
      channelId: params.channelId,
      deliveryTimeMs: params.deliveryTimeMs,
      retryCount: params.retryCount,
      metadata: params.metadata,
    })
  }

  /**
   * Create a failed delivery result
   */
  static failure(params: {
    error: Error
    channelId?: string | undefined
    deliveryTimeMs?: number | undefined
    retryCount?: number | undefined
    metadata?: Record<string, unknown> | undefined
  }): MessageDeliveryResult {
    return new MessageDeliveryResult({
      success: false,
      error: params.error,
      channelId: params.channelId,
      deliveryTimeMs: params.deliveryTimeMs,
      retryCount: params.retryCount,
      metadata: params.metadata,
    })
  }

  /**
   * Create a delivery result from Slack API response
   */
  static fromSlackResponse(
    response: {
      ok: boolean
      message?: {
        ts: string
        channel: string
      }
      error?: string
    },
    params: {
      channelId: string
      deliveryTimeMs?: number | undefined
      retryCount?: number | undefined
      metadata?: Record<string, unknown> | undefined
    }
  ): MessageDeliveryResult {
    if (response.ok && response.message) {
      return MessageDeliveryResult.success({
        messageId: response.message.ts,
        timestamp: response.message.ts,
        channelId: response.message.channel,
        deliveryTimeMs: params.deliveryTimeMs,
        retryCount: params.retryCount,
        metadata: params.metadata,
      })
    } else {
      const error = new Error(response.error || 'Unknown Slack API error')
      return MessageDeliveryResult.failure({
        error,
        channelId: params.channelId,
        deliveryTimeMs: params.deliveryTimeMs,
        retryCount: params.retryCount,
        metadata: params.metadata,
      })
    }
  }

  /**
   * Create an authentication error result
   */
  static authenticationError(
    error: Error,
    metadata?: Record<string, unknown> | undefined
  ): MessageDeliveryResult {
    return new MessageDeliveryResult({
      success: false,
      error,
      metadata,
    })
  }

  /**
   * Create a channel error result
   */
  static channelError(
    error: Error,
    channelId: string,
    metadata?: Record<string, unknown> | undefined
  ): MessageDeliveryResult {
    return new MessageDeliveryResult({
      success: false,
      error,
      channelId,
      metadata,
    })
  }

  /**
   * Create a network error result
   */
  static networkError(
    error: Error,
    channelId?: string | undefined,
    retryCount?: number | undefined,
    metadata?: Record<string, unknown> | undefined
  ): MessageDeliveryResult {
    return new MessageDeliveryResult({
      success: false,
      error,
      channelId,
      retryCount,
      metadata,
    })
  }

  /**
   * Get a human-readable summary of the result
   */
  getSummary(): string {
    if (this._success) {
      const time =
        this._deliveryTimeMs > 0 ? ` in ${this.deliveryTimeSeconds}s` : ''
      const retries =
        this._retryCount > 0 ? ` (${this._retryCount} retries)` : ''
      return `Message sent to ${this._channelId}${time}${retries}`
    } else {
      const retries =
        this._retryCount > 0 ? ` after ${this._retryCount} retries` : ''
      return `Failed to send message${retries}: ${this.errorMessage}`
    }
  }

  /**
   * Get a detailed description of the result
   */
  getDetailedDescription(): string {
    const lines: string[] = []

    if (this._success) {
      lines.push('✅ Message delivery successful')
      if (this._messageId) lines.push(`Message ID: ${this._messageId}`)
      if (this._channelId) lines.push(`Channel: ${this._channelId}`)
      if (this._deliveryTimeMs > 0)
        lines.push(`Delivery time: ${this.deliveryTimeSeconds}s`)
      if (this._retryCount > 0)
        lines.push(`Retries needed: ${this._retryCount}`)
    } else {
      lines.push('❌ Message delivery failed')
      if (this._channelId) lines.push(`Target channel: ${this._channelId}`)
      if (this._error) {
        lines.push(`Error: ${this.errorMessage}`)
        if (this.isAuthenticationError)
          lines.push('Cause: Authentication issue')
        if (this.isChannelError) lines.push('Cause: Channel access issue')
        if (this.isRateLimitError) lines.push('Cause: Rate limiting')
        if (this.isNetworkError) lines.push('Cause: Network connectivity')
      }
      if (this._retryCount > 0)
        lines.push(`Retries attempted: ${this._retryCount}`)
      if (this._deliveryTimeMs > 0)
        lines.push(`Time spent: ${this.deliveryTimeSeconds}s`)
    }

    return lines.join('\n')
  }

  /**
   * Serialize to JSON for logging/debugging
   */
  toJSON(): object {
    return {
      success: this._success,
      messageId: this._messageId,
      timestamp: this._timestamp,
      channelId: this._channelId,
      error: this._error
        ? {
            name: this._error.name,
            message: this._error.message,
          }
        : undefined,
      retryCount: this._retryCount,
      deliveryTimeMs: this._deliveryTimeMs,
      deliveryTimeSeconds: this.deliveryTimeSeconds,
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      isAuthenticationError: this.isAuthenticationError,
      isChannelError: this.isChannelError,
      isRateLimitError: this.isRateLimitError,
      isNetworkError: this.isNetworkError,
      isFastDelivery: this.isFastDelivery,
      isSlowDelivery: this.isSlowDelivery,
      hadRetries: this.hadRetries,
      exitCode: this.exitCode,
    }
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    const status = this._success ? 'SUCCESS' : 'FAILURE'
    const channel = this._channelId ? ` channel=${this._channelId}` : ''
    const time =
      this._deliveryTimeMs > 0 ? ` time=${this.deliveryTimeSeconds}s` : ''
    const retries = this._retryCount > 0 ? ` retries=${this._retryCount}` : ''
    const error = this._error ? ` error="${this.errorMessage}"` : ''

    return `MessageDeliveryResult(${status}${channel}${time}${retries}${error})`
  }
}
