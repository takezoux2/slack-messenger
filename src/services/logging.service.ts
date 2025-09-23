/**
 * Logging Service with Verbose Support
 * Provides structured logging with different levels and verbose mode support
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
}

export class LoggingService {
  private static instance: LoggingService
  private verboseMode: boolean = false
  private logLevel: LogLevel = LogLevel.INFO

  private constructor() {
    // Initialize from environment
    const envLogLevel = process.env['SLACK_LOG_LEVEL']?.toLowerCase()
    if (
      envLogLevel &&
      Object.values(LogLevel).includes(envLogLevel as LogLevel)
    ) {
      this.logLevel = envLogLevel as LogLevel
    }
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService()
    }
    return LoggingService.instance
  }

  setVerboseMode(verbose: boolean): void {
    this.verboseMode = verbose
    if (verbose) {
      this.logLevel = LogLevel.DEBUG
    }
  }

  isVerboseMode(): boolean {
    return this.verboseMode
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context)
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      ...(context ? { context } : {}),
    }

    const formattedMessage = this.formatMessage(entry)

    // Output to appropriate stream
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      console.error(formattedMessage)
    } else {
      console.log(formattedMessage)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ]
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex >= currentLevelIndex
  }

  private formatMessage(entry: LogEntry): string {
    if (this.verboseMode) {
      // Verbose format with timestamp and level
      const timestamp = entry.timestamp.toISOString()
      const contextStr = entry.context
        ? ` ${JSON.stringify(entry.context)}`
        : ''
      return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`
    } else {
      // Simple format for normal mode
      if (entry.level === LogLevel.INFO && this.verboseMode) {
        return `[INFO] ${entry.message}`
      } else if (entry.level === LogLevel.ERROR) {
        return `❌ Error: ${entry.message}`
      } else if (entry.level === LogLevel.WARN) {
        return `⚠️  Warning: ${entry.message}`
      } else if (entry.level === LogLevel.DEBUG || this.verboseMode) {
        return `[${entry.level.toUpperCase()}] ${entry.message}`
      }
      return entry.message
    }
  }

  /**
   * Mask sensitive information in logs
   */
  maskToken(token: string): string {
    if (!token) return 'undefined'

    if (token.startsWith('xoxb-')) {
      // Show prefix and last 4 characters, mask the middle
      const prefix = token.substring(0, 5) // 'xoxb-'
      const suffix = token.slice(-4)
      const maskedLength = token.length - 9
      const masked = '*'.repeat(Math.max(maskedLength, 4))
      return `${prefix}${masked}${suffix}`
    }

    // For other token formats, show only first 4 chars
    return token.substring(0, 4) + '*'.repeat(Math.max(token.length - 4, 4))
  }

  /**
   * Log step-by-step process information (for verbose mode)
   */
  logStep(step: string, details?: Record<string, any>): void {
    if (this.verboseMode) {
      this.info(step, details)
    }
  }

  /**
   * Log authentication information (with token masking)
   */
  logAuth(token: string, status: 'loading' | 'success' | 'failed'): void {
    const maskedToken = this.maskToken(token)

    switch (status) {
      case 'loading':
        this.logStep(`Loading authentication credentials...`)
        this.logStep(`Token loaded: ${maskedToken}`)
        break
      case 'success':
        this.logStep(`Authentication successful for token: ${maskedToken}`)
        break
      case 'failed':
        this.logStep(
          `Auth test failed: Authentication failed: An API error occurred: invalid_auth`
        )
        break
    }
  }

  /**
   * Log API connection details
   */
  logApiConnection(action: string, details?: Record<string, any>): void {
    this.logStep(`[INFO] ${action}`, details)
  }

  /**
   * Format error for display
   */
  formatError(error: Error | string, context?: Record<string, any>): string {
    const message = error instanceof Error ? error.message : error

    if (this.verboseMode && context) {
      return `${message}\nContext: ${JSON.stringify(context, null, 2)}`
    }

    return message
  }
}
