/**
 * ChannelTarget Model
 *
 * Represents a Slack channel target with validation and metadata.
 * This model handles channel identification and access patterns.
 */

export interface ChannelTargetParams {
  channelId: string
  channelName?: string | undefined
  isPrivate?: boolean | undefined
  description?: string | undefined
}

export class ChannelTarget {
  private readonly _channelId: string
  private readonly _channelName: string | undefined
  private readonly _isPrivate: boolean
  private readonly _description: string | undefined

  constructor(params: ChannelTargetParams) {
    this.validateChannelId(params.channelId)

    this._channelId = params.channelId
    this._channelName = params.channelName
    this._isPrivate = params.isPrivate || false
    this._description = params.description
  }

  /**
   * Get the channel ID
   */
  get channelId(): string {
    return this._channelId
  }

  /**
   * Get the channel name (if available)
   */
  get channelName(): string | undefined {
    return this._channelName
  }

  /**
   * Check if this is a private channel
   */
  get isPrivate(): boolean {
    return this._isPrivate
  }

  /**
   * Get channel description (if available)
   */
  get description(): string | undefined {
    return this._description
  }

  /**
   * Get display name for the channel (name if available, otherwise ID)
   */
  get displayName(): string {
    return this._channelName || this._channelId
  }

  /**
   * Get channel type based on ID prefix
   */
  get channelType(): 'channel' | 'group' | 'dm' | 'unknown' {
    if (this._channelId.startsWith('C')) {
      return 'channel'
    } else if (this._channelId.startsWith('G')) {
      return 'group'
    } else if (this._channelId.startsWith('D')) {
      return 'dm'
    }
    return 'unknown'
  }

  /**
   * Check if this is a direct message channel
   */
  get isDirectMessage(): boolean {
    return this.channelType === 'dm'
  }

  /**
   * Check if this is a group channel
   */
  get isGroup(): boolean {
    return this.channelType === 'group'
  }

  /**
   * Check if this is a public channel
   */
  get isPublicChannel(): boolean {
    return this.channelType === 'channel' && !this._isPrivate
  }

  /**
   * Validate channel ID format
   */
  private validateChannelId(channelId: string): void {
    if (!channelId || typeof channelId !== 'string') {
      throw new Error('Channel ID is required and must be a string')
    }

    // Slack channel ID format:
    // - C followed by 10 alphanumeric characters (public channels)
    // - G followed by 10 alphanumeric characters (private groups)
    // - D followed by 9 alphanumeric characters (direct messages)
    const channelIdPattern = /^[CGD][A-Z0-9]{9,10}$/i
    if (!channelIdPattern.test(channelId)) {
      throw new Error(
        'Invalid channel ID format. Must be like C1234567890, G1234567890, or D123456789'
      )
    }
  }

  /**
   * Create a ChannelTarget from channel ID only
   */
  static fromId(channelId: string): ChannelTarget {
    return new ChannelTarget({ channelId })
  }

  /**
   * Create a ChannelTarget with name and privacy information
   */
  static create(
    channelId: string,
    channelName?: string | undefined,
    isPrivate?: boolean | undefined
  ): ChannelTarget {
    return new ChannelTarget({ channelId, channelName, isPrivate })
  }

  /**
   * Create a ChannelTarget for a public channel
   */
  static forPublicChannel(
    channelId: string,
    channelName?: string | undefined
  ): ChannelTarget {
    return new ChannelTarget({ channelId, channelName, isPrivate: false })
  }

  /**
   * Create a ChannelTarget for a private channel
   */
  static forPrivateChannel(
    channelId: string,
    channelName?: string | undefined
  ): ChannelTarget {
    return new ChannelTarget({ channelId, channelName, isPrivate: true })
  }

  /**
   * Create a ChannelTarget for a direct message
   */
  static forDirectMessage(channelId: string): ChannelTarget {
    if (!channelId.startsWith('D')) {
      throw new Error('Direct message channels must have IDs starting with D')
    }
    return new ChannelTarget({ channelId, isPrivate: true })
  }

  /**
   * Check if two ChannelTargets reference the same channel
   */
  equals(other: ChannelTarget): boolean {
    return this._channelId === other._channelId
  }

  /**
   * Get the channel reference for API calls
   */
  getApiReference(): string {
    return this._channelId
  }

  /**
   * Serialize to JSON for logging/debugging
   */
  toJSON(): object {
    return {
      channelId: this._channelId,
      channelName: this._channelName,
      isPrivate: this._isPrivate,
      description: this._description,
      channelType: this.channelType,
      displayName: this.displayName,
      isDirectMessage: this.isDirectMessage,
      isGroup: this.isGroup,
      isPublicChannel: this.isPublicChannel,
    }
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    const name = this._channelName ? ` (${this._channelName})` : ''
    const privacy = this._isPrivate ? ' [private]' : ''
    return `ChannelTarget(${this._channelId}${name}${privacy})`
  }
}
