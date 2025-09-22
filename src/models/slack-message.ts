/**
 * SlackMessage Model
 *
 * Represents a message to be sent to Slack with content and metadata.
 * This model encapsulates all message-related data and validation logic.
 */

export interface SlackMessageParams {
  content: string
  channelId: string
  timestamp?: Date
}

export class SlackMessage {
  private readonly _content: string
  private readonly _channelId: string
  private readonly _timestamp: Date

  constructor(params: SlackMessageParams) {
    this.validateContent(params.content)
    this.validateChannelId(params.channelId)

    this._content = params.content.trim()
    this._channelId = params.channelId
    this._timestamp = params.timestamp || new Date()
  }

  /**
   * Get the message content
   */
  get content(): string {
    return this._content
  }

  /**
   * Get the target channel ID
   */
  get channelId(): string {
    return this._channelId
  }

  /**
   * Get the message timestamp
   */
  get timestamp(): Date {
    return this._timestamp
  }

  /**
   * Get content length in characters
   */
  get contentLength(): number {
    return this._content.length
  }

  /**
   * Check if message contains markdown formatting
   */
  get hasMarkdownFormatting(): boolean {
    return (
      /[*_`~]/.test(this._content) ||
      /```/.test(this._content) ||
      /\[.*\]\(.*\)/.test(this._content)
    )
  }

  /**
   * Check if message is multi-line
   */
  get isMultiLine(): boolean {
    return this._content.includes('\n')
  }

  /**
   * Get message content formatted for Slack API
   */
  getFormattedContent(): string {
    return this._content
  }

  /**
   * Validate message content
   */
  private validateContent(content: string): void {
    if (!content || typeof content !== 'string') {
      throw new Error('Message content is required and must be a string')
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length === 0) {
      throw new Error('Message content cannot be empty or whitespace only')
    }

    // Slack message length limit is 40,000 characters
    if (trimmedContent.length > 40000) {
      throw new Error('Message content cannot exceed 40,000 characters')
    }
  }

  /**
   * Validate channel ID format
   */
  private validateChannelId(channelId: string): void {
    if (!channelId || typeof channelId !== 'string') {
      throw new Error('Channel ID is required and must be a string')
    }

    // Slack channel ID format: C followed by 10 alphanumeric characters
    const channelIdPattern = /^C[A-Z0-9]{10}$/i
    if (!channelIdPattern.test(channelId)) {
      throw new Error('Invalid channel ID format. Must be like C1234567890')
    }
  }

  /**
   * Create a SlackMessage from plain text and channel ID
   */
  static fromText(content: string, channelId: string): SlackMessage {
    return new SlackMessage({ content, channelId })
  }

  /**
   * Create a SlackMessage with current timestamp
   */
  static create(content: string, channelId: string): SlackMessage {
    return new SlackMessage({ content, channelId, timestamp: new Date() })
  }

  /**
   * Serialize to JSON for logging/debugging
   */
  toJSON(): object {
    return {
      content: this._content,
      channelId: this._channelId,
      timestamp: this._timestamp.toISOString(),
      contentLength: this.contentLength,
      hasMarkdownFormatting: this.hasMarkdownFormatting,
      isMultiLine: this.isMultiLine,
    }
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    return `SlackMessage(channelId=${this._channelId}, contentLength=${this.contentLength})`
  }
}
