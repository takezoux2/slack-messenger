/**
 * CommandLineOptions Model
 *
 * Represents parsed command-line options and arguments for the Slack messenger CLI.
 * This model encapsulates all CLI configuration and validation logic.
 */

export interface CommandLineOptionsParams {
  command: string
  channelId?: string | undefined
  message?: string | undefined
  verbose?: boolean | undefined
  help?: boolean | undefined
  version?: boolean | undefined
  token?: string | undefined
  logLevel?: string | undefined
  timeout?: number | undefined
  retries?: number | undefined
}

export class CommandLineOptions {
  private readonly _command: string
  private readonly _channelId: string | undefined
  private readonly _message: string | undefined
  private readonly _verbose: boolean
  private readonly _help: boolean
  private readonly _version: boolean
  private readonly _token: string | undefined
  private readonly _logLevel: string | undefined
  private readonly _timeout: number
  private readonly _retries: number

  constructor(params: CommandLineOptionsParams) {
    this.validateCommand(params.command)

    this._command = params.command
    this._channelId = params.channelId
    this._message = params.message
    this._verbose = params.verbose || false
    this._help = params.help || false
    this._version = params.version || false
    this._token = params.token
    this._logLevel = params.logLevel
    this._timeout = params.timeout || 10000 // 10 second default
    this._retries = params.retries || 3 // 3 retries default
  }

  /**
   * Get the command name
   */
  get command(): string {
    return this._command
  }

  /**
   * Get the target channel ID
   */
  get channelId(): string | undefined {
    return this._channelId
  }

  /**
   * Get the message content
   */
  get message(): string | undefined {
    return this._message
  }

  /**
   * Check if verbose mode is enabled
   */
  get verbose(): boolean {
    return this._verbose
  }

  /**
   * Check if help was requested
   */
  get help(): boolean {
    return this._help
  }

  /**
   * Check if version was requested
   */
  get version(): boolean {
    return this._version
  }

  /**
   * Get the authentication token (if provided via CLI)
   */
  get token(): string | undefined {
    return this._token
  }

  /**
   * Get the log level
   */
  get logLevel(): string | undefined {
    return this._logLevel
  }

  /**
   * Get the timeout in milliseconds
   */
  get timeout(): number {
    return this._timeout
  }

  /**
   * Get the number of retries
   */
  get retries(): number {
    return this._retries
  }

  /**
   * Check if this is a send-message command
   */
  get isSendMessageCommand(): boolean {
    return this._command === 'send-message'
  }

  /**
   * Check if this is an informational command (help/version)
   */
  get isInformationalCommand(): boolean {
    return this._help || this._version
  }

  /**
   * Check if all required arguments for send-message are present
   */
  get hasRequiredSendMessageArgs(): boolean {
    if (!this.isSendMessageCommand) {
      return true // Not applicable for other commands
    }
    return !!(this._channelId && this._message)
  }

  /**
   * Get missing required arguments for send-message command
   */
  get missingRequiredArgs(): string[] {
    if (!this.isSendMessageCommand) {
      return []
    }

    const missing: string[] = []
    if (!this._channelId) missing.push('channelId')
    if (!this._message) missing.push('message')
    return missing
  }

  /**
   * Check if the channel ID format is valid (if provided)
   */
  get isChannelIdValid(): boolean {
    if (!this._channelId) {
      return true // Not provided, so not invalid
    }

    // Slack channel ID format validation
    const channelIdPattern = /^[CGD][A-Z0-9]{9,10}$/i
    return channelIdPattern.test(this._channelId)
  }

  /**
   * Check if the message content is valid (if provided)
   */
  get isMessageValid(): boolean {
    if (!this._message) {
      return true // Not provided, so not invalid
    }

    const trimmedMessage = this._message.trim()
    return trimmedMessage.length > 0 && trimmedMessage.length <= 40000
  }

  /**
   * Get validation errors for the current options
   */
  get validationErrors(): string[] {
    const errors: string[] = []

    if (this.isSendMessageCommand) {
      if (!this._channelId) {
        errors.push('Missing required argument: channelId')
      } else if (!this.isChannelIdValid) {
        errors.push('Invalid channel ID format. Must be like C1234567890')
      }

      if (!this._message) {
        errors.push('Missing required argument: message')
      } else if (!this.isMessageValid) {
        const trimmed = this._message.trim()
        if (trimmed.length === 0) {
          errors.push('Message cannot be empty or whitespace only')
        } else if (trimmed.length > 40000) {
          errors.push('Message cannot exceed 40,000 characters')
        }
      }
    }

    if (this._timeout < 1000) {
      errors.push('Timeout must be at least 1000ms (1 second)')
    }

    if (this._retries < 0 || this._retries > 10) {
      errors.push('Retries must be between 0 and 10')
    }

    return errors
  }

  /**
   * Check if the options are valid
   */
  get isValid(): boolean {
    return this.validationErrors.length === 0
  }

  /**
   * Validate command name
   */
  private validateCommand(command: string): void {
    if (!command || typeof command !== 'string') {
      throw new Error('Command is required and must be a string')
    }

    const validCommands = ['send-message']
    if (!validCommands.includes(command)) {
      throw new Error(
        `Invalid command: ${command}. Valid commands: ${validCommands.join(', ')}`
      )
    }
  }

  /**
   * Create CommandLineOptions for send-message command
   */
  static forSendMessage(
    channelId: string,
    message: string,
    options?: Partial<CommandLineOptionsParams>
  ): CommandLineOptions {
    return new CommandLineOptions({
      command: 'send-message',
      channelId,
      message,
      ...options,
    })
  }

  /**
   * Create CommandLineOptions for help display
   */
  static forHelp(): CommandLineOptions {
    return new CommandLineOptions({
      command: 'send-message',
      help: true,
    })
  }

  /**
   * Create CommandLineOptions for version display
   */
  static forVersion(): CommandLineOptions {
    return new CommandLineOptions({
      command: 'send-message',
      version: true,
    })
  }

  /**
   * Create CommandLineOptions with verbose mode enabled
   */
  static withVerbose(
    channelId: string,
    message: string,
    options?: Partial<CommandLineOptionsParams>
  ): CommandLineOptions {
    return new CommandLineOptions({
      command: 'send-message',
      channelId,
      message,
      verbose: true,
      ...options,
    })
  }

  /**
   * Create CommandLineOptions from parsed CLI arguments
   */
  static fromCliArgs(args: {
    command?: string | undefined
    channelId?: string | undefined
    message?: string | undefined
    verbose?: boolean | undefined
    help?: boolean | undefined
    version?: boolean | undefined
    token?: string | undefined
    logLevel?: string | undefined
    timeout?: number | undefined
    retries?: number | undefined
  }): CommandLineOptions {
    return new CommandLineOptions({
      command: args.command || 'send-message',
      channelId: args.channelId,
      message: args.message,
      verbose: args.verbose,
      help: args.help,
      version: args.version,
      token: args.token,
      logLevel: args.logLevel,
      timeout: args.timeout,
      retries: args.retries,
    })
  }

  /**
   * Get effective log level (considering verbose flag)
   */
  getEffectiveLogLevel(): string {
    if (this._verbose) {
      return 'debug'
    }
    return this._logLevel || 'info'
  }

  /**
   * Get timeout in seconds
   */
  getTimeoutInSeconds(): number {
    return Math.round(this._timeout / 1000)
  }

  /**
   * Serialize to JSON for logging/debugging
   */
  toJSON(): object {
    return {
      command: this._command,
      channelId: this._channelId,
      message: this._message
        ? `${this._message.substring(0, 50)}${this._message.length > 50 ? '...' : ''}`
        : undefined,
      verbose: this._verbose,
      help: this._help,
      version: this._version,
      token: this._token ? `${this._token.substring(0, 8)}...` : undefined,
      logLevel: this._logLevel,
      timeout: this._timeout,
      retries: this._retries,
      isSendMessageCommand: this.isSendMessageCommand,
      isInformationalCommand: this.isInformationalCommand,
      hasRequiredSendMessageArgs: this.hasRequiredSendMessageArgs,
      isValid: this.isValid,
      effectiveLogLevel: this.getEffectiveLogLevel(),
    }
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    const args = []
    if (this._channelId) args.push(`channel=${this._channelId}`)
    if (this._message) args.push(`message=${this._message.length} chars`)
    if (this._verbose) args.push('verbose')
    if (this._help) args.push('help')
    if (this._version) args.push('version')

    return `CommandLineOptions(${this._command}: ${args.join(', ')})`
  }
}
