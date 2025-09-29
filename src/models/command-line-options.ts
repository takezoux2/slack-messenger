/**
 * CommandLineOptions Model
 *
 * Represents parsed command-line options and arguments for the Slack messenger CLI.
 * This model encapsulates all CLI configuration and validation logic.
 */

/**
 * CLI options for broadcast command
 */
export interface BroadcastCommandArgs {
  listName: string
  message: string
  config?: string
  dryRun?: boolean
  verbose?: boolean
  token?: string
}

/**
 * CLI options for list-channels command
 */
export interface ListCommandArgs {
  config?: string
}

export interface CommandLineOptionsParams {
  command: string
  channelId?: string | undefined
  message?: string | undefined
  messageFile?: string | undefined
  verbose?: boolean | undefined
  help?: boolean | undefined
  version?: boolean | undefined
  token?: string | undefined
  logLevel?: string | undefined
  timeout?: number | undefined
  retries?: number | undefined
  // Broadcast command options
  configPath?: string | undefined
  channelList?: string | undefined
  dryRun?: boolean | undefined
  maxConcurrency?: number | undefined
  maxRetries?: number | undefined
  // List channels command options
  format?: string | undefined
}

export class CommandLineOptions {
  private readonly _command: string
  private readonly _channelId: string | undefined
  private readonly _message: string | undefined
  private readonly _messageFile: string | undefined
  private readonly _verbose: boolean
  private readonly _help: boolean
  private readonly _version: boolean
  private readonly _token: string | undefined
  private readonly _logLevel: string | undefined
  private readonly _timeout: number
  private readonly _retries: number
  // Broadcast command properties
  private readonly _configPath: string | undefined
  private readonly _channelList: string | undefined
  private readonly _dryRun: boolean
  private readonly _maxConcurrency: number
  private readonly _maxRetries: number | undefined
  // List channels command properties
  private readonly _format: string | undefined

  constructor(params: CommandLineOptionsParams) {
    this.validateCommand(params.command)

    this._command = params.command
    this._channelId = params.channelId
    this._message = params.message
    this._messageFile = params.messageFile
    this._verbose = params.verbose || false
    this._help = params.help || false
    this._version = params.version || false
    this._token = params.token
    this._logLevel = params.logLevel
    this._timeout = params.timeout || 10000 // 10 second default
    this._retries = params.retries || 3 // 3 retries default
    // Broadcast options
    this._configPath = params.configPath
    this._channelList = params.channelList
    this._dryRun = params.dryRun || false
    this._maxConcurrency = params.maxConcurrency || 5
    this._maxRetries = params.maxRetries
    // List channels options
    this._format = params.format
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
   * Get the message file path (if provided)
   */
  get messageFile(): string | undefined {
    return this._messageFile
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
   * Get the configuration file path
   */
  get configPath(): string | undefined {
    return this._configPath
  }

  /**
   * Get the channel list name
   */
  get channelList(): string | undefined {
    return this._channelList
  }

  /**
   * Check if dry run mode is enabled
   */
  get dryRun(): boolean {
    return this._dryRun
  }

  /**
   * Get the maximum concurrency for broadcast
   */
  get maxConcurrency(): number {
    return this._maxConcurrency
  }

  /**
   * Get the maximum retries for broadcast
   */
  get maxRetries(): number | undefined {
    return this._maxRetries
  }

  /**
   * Get the output format
   */
  get format(): string | undefined {
    return this._format
  }

  /**
   * Check if this is a send-message command
   */
  get isSendMessageCommand(): boolean {
    return this._command === 'send-message'
  }

  /**
   * Check if this is a broadcast command
   */
  get isBroadcastCommand(): boolean {
    return this._command === 'broadcast'
  }

  /**
   * Check if this is a list-channels command
   */
  get isListChannelsCommand(): boolean {
    return this._command === 'list-channels'
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
    // Require channelId and exactly one of message or messageFile
    const hasOneInput =
      (!!this._message && !this._messageFile) ||
      (!!this._messageFile && !this._message)
    return !!(this._channelId && hasOneInput)
  }

  /**
   * Check if all required arguments for broadcast are present
   */
  get hasRequiredBroadcastArgs(): boolean {
    if (!this.isBroadcastCommand) {
      return true // Not applicable for other commands
    }
    const hasOneInput =
      (!!this._message && !this._messageFile) ||
      (!!this._messageFile && !this._message)
    return !!(this._channelList && hasOneInput)
  }

  /**
   * Check if all required arguments are present for the current command
   */
  get hasRequiredArgs(): boolean {
    if (this.isSendMessageCommand) {
      return this.hasRequiredSendMessageArgs
    }
    if (this.isBroadcastCommand) {
      return this.hasRequiredBroadcastArgs
    }
    if (this.isListChannelsCommand) {
      return true // No required args for list-channels
    }
    return true
  }

  /**
   * Get missing required arguments for send-message command
   */
  get missingRequiredArgs(): string[] {
    if (this.isSendMessageCommand) {
      const missing: string[] = []
      if (!this._channelId) missing.push('channelId')
      if (!this._message && !this._messageFile) missing.push('message')
      return missing
    }

    if (this.isBroadcastCommand) {
      const missing: string[] = []
      if (!this._channelList) missing.push('channelList')
      if (!this._message && !this._messageFile) missing.push('message')
      return missing
    }

    return []
  }

  /**
   * Check if the channel ID format is valid (if provided)
   */
  get isChannelIdValid(): boolean {
    if (!this._channelId) {
      return true // Not provided, so not invalid
    }

    // Slack public channel ID format validation: starts with 'C' and 10-21 alphanumeric chars after
    // Accepts IDs like C1234567890 and longer variants sometimes seen in tests
    const channelIdPattern = /^C[A-Z0-9]{9,21}$/i
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

      // Mutually exclusive inputs for message content
      if (this._message && this._messageFile) {
        errors.push('Provide either a message or --message-file, not both')
      }
      if (!this._message && !this._messageFile) {
        errors.push('Missing required argument: message')
      }
      // Inline message validation retains 40,000 limit
      if (this._message && !this.isMessageValid) {
        const trimmed = this._message.trim()
        if (trimmed.length === 0) {
          errors.push('Message cannot be empty or whitespace only')
        } else if (trimmed.length > 40000) {
          errors.push('Message cannot exceed 40,000 characters')
        }
      }
    }

    if (this.isBroadcastCommand) {
      if (!this._channelList) {
        errors.push('Missing required argument: channelList')
      }

      // Mutually exclusive inputs
      if (this._message && this._messageFile) {
        errors.push('Provide either a message or --message-file, not both')
      }
      if (!this._message && !this._messageFile) {
        errors.push('Missing required argument: message')
      }
      if (this._message && !this.isMessageValid) {
        const trimmed = this._message.trim()
        if (trimmed.length === 0) {
          errors.push('Message cannot be empty or whitespace only')
        } else if (trimmed.length > 40000) {
          errors.push('Message cannot exceed 40,000 characters')
        }
      }

      if (this._maxConcurrency < 1 || this._maxConcurrency > 20) {
        errors.push('Max concurrency must be between 1 and 20')
      }

      if (
        this._maxRetries !== undefined &&
        (this._maxRetries < 0 || this._maxRetries > 10)
      ) {
        errors.push('Max retries must be between 0 and 10')
      }
    }

    if (this.isListChannelsCommand) {
      if (this._format && !['table', 'json', 'yaml'].includes(this._format)) {
        errors.push('Format must be one of: table, json, yaml')
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

    const validCommands = ['send-message', 'broadcast', 'list-channels']
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
   * Create CommandLineOptions for broadcast command
   */
  static forBroadcast(
    channelList: string,
    message: string,
    options?: Partial<CommandLineOptionsParams>
  ): CommandLineOptions {
    return new CommandLineOptions({
      command: 'broadcast',
      channelList,
      message,
      ...options,
    })
  }

  /**
   * Create CommandLineOptions for list-channels command
   */
  static forListChannels(
    options?: Partial<CommandLineOptionsParams>
  ): CommandLineOptions {
    return new CommandLineOptions({
      command: 'list-channels',
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
    messageFile?: string | undefined
    verbose?: boolean | undefined
    help?: boolean | undefined
    version?: boolean | undefined
    token?: string | undefined
    logLevel?: string | undefined
    timeout?: number | undefined
    retries?: number | undefined
    // Broadcast options
    configPath?: string | undefined
    channelList?: string | undefined
    dryRun?: boolean | undefined
    maxConcurrency?: number | undefined
    maxRetries?: number | undefined
    // List channels options
    format?: string | undefined
  }): CommandLineOptions {
    return new CommandLineOptions({
      command: args.command || 'send-message',
      channelId: args.channelId,
      message: args.message,
      messageFile: args.messageFile,
      verbose: args.verbose,
      help: args.help,
      version: args.version,
      token: args.token,
      logLevel: args.logLevel,
      timeout: args.timeout,
      retries: args.retries,
      // Broadcast options
      configPath: args.configPath,
      channelList: args.channelList,
      dryRun: args.dryRun,
      maxConcurrency: args.maxConcurrency,
      maxRetries: args.maxRetries,
      // List channels options
      format: args.format,
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
