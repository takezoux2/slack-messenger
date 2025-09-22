/**
 * Message levels for console output
 */
export enum MessageLevel {
  INFO = 'info',
  ERROR = 'error',
  DEBUG = 'debug',
}

/**
 * Console output message entity
 */
export class Message {
  constructor(
    public readonly content: string,
    public readonly timestamp: Date,
    public readonly level: MessageLevel
  ) {
    this.validateProperties()
  }

  /**
   * Format message with timestamp and level for console output
   */
  format(): string {
    const timeStr = this.timestamp.toISOString().split('T')[0] // YYYY-MM-DD format
    const levelStr = `[${this.level.toUpperCase()}]`
    return `${timeStr} ${levelStr} ${this.content}`
  }

  /**
   * Check if content is valid (non-empty)
   */
  isValidContent(): boolean {
    return this.content.trim().length > 0
  }

  /**
   * Create info-level message with current timestamp
   */
  static info(content: string): Message {
    return new Message(content, new Date(), MessageLevel.INFO)
  }

  /**
   * Create error-level message with current timestamp
   */
  static error(content: string): Message {
    return new Message(content, new Date(), MessageLevel.ERROR)
  }

  /**
   * Create debug-level message with current timestamp
   */
  static debug(content: string): Message {
    return new Message(content, new Date(), MessageLevel.DEBUG)
  }

  /**
   * Validate constructor properties according to data model rules
   */
  private validateProperties(): void {
    if (!this.content || this.content.trim() === '') {
      throw new Error('content must be non-empty string')
    }

    if (!this.timestamp || isNaN(this.timestamp.getTime())) {
      throw new Error('timestamp must be valid Date object')
    }

    if (!Object.values(MessageLevel).includes(this.level)) {
      throw new Error('level must be valid MessageLevel enum value')
    }
  }
}
