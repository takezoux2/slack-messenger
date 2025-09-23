/**
 * Error Handler Service
 *
 * Provides centralized error handling, exit code management, and user-friendly
 * error message formatting for the Slack messenger CLI application.
 */

import { MessageDeliveryResult } from '../models/message-delivery-result.js'

export interface ErrorHandlerConfig {
  verboseLogging?: boolean
  exitOnError?: boolean
  colorOutput?: boolean
}

export interface ErrorContext {
  command?: string
  channelId?: string
  operation?: string
  timestamp?: Date
  metadata?: Record<string, unknown>
}

export interface FormattedError {
  message: string
  details?: string[] | undefined
  exitCode: number
  shouldExit: boolean
  context?: ErrorContext | undefined
}

export class ErrorHandlerService {
  private readonly config: Required<ErrorHandlerConfig>

  constructor(config?: ErrorHandlerConfig) {
    this.config = {
      verboseLogging: config?.verboseLogging || false,
      exitOnError: config?.exitOnError || false,
      colorOutput: config?.colorOutput || true,
    }
  }

  /**
   * Handle and format any error with appropriate exit code
   */
  handleError(error: Error | unknown, context?: ErrorContext): FormattedError {
    const err = error instanceof Error ? error : new Error(String(error))

    // Determine error type and exit code
    const errorType = this.categorizeError(err, context)
    const exitCode = this.getExitCode(errorType)

    // Format the error message
    const formatted = this.formatError(err, errorType, context)

    return {
      message: formatted.message,
      details: formatted.details,
      exitCode,
      shouldExit: this.config.exitOnError,
      context: {
        ...context,
        timestamp: new Date(),
      },
    }
  }

  /**
   * Handle Slack delivery result errors
   */
  handleDeliveryError(
    result: MessageDeliveryResult,
    context?: ErrorContext
  ): FormattedError {
    if (result.success) {
      throw new Error('Cannot handle error for successful delivery result')
    }

    // const error = result.error || new Error('Unknown delivery error')
    const errorType = result.errorType || 'unknown'
    const exitCode = this.getExitCodeForDeliveryError(errorType)

    const formatted = this.formatDeliveryError(result, context)

    return {
      message: formatted.message,
      details: formatted.details,
      exitCode,
      shouldExit: this.config.exitOnError,
      context: {
        ...context,
        timestamp: new Date(),
        metadata: {
          ...context?.metadata,
          deliveryTimeMs: result.deliveryTimeMs,
          retryCount: result.retryCount,
          errorType: result.errorType,
        },
      },
    }
  }

  /**
   * Format CLI validation errors
   */
  formatValidationError(
    errors: string[],
    context?: ErrorContext
  ): FormattedError {
    const message =
      errors.length === 1
        ? `Validation error: ${errors[0]}`
        : `Validation errors (${errors.length})`

    const details =
      errors.length > 1 ? errors.map(err => `• ${err}`) : undefined

    return {
      message,
      details,
      exitCode: 1,
      shouldExit: this.config.exitOnError,
      context: {
        ...context,
        timestamp: new Date(),
        operation: 'validation',
      },
    }
  }

  /**
   * Format authentication errors
   */
  formatAuthenticationError(
    error: Error,
    context?: ErrorContext
  ): FormattedError {
    const message = `Authentication failed: ${error.message}`
    const details = this.config.verboseLogging
      ? [
          'Check your SLACK_BOT_TOKEN environment variable',
          'Ensure the token has the required scopes',
          'Verify the token is not expired or revoked',
        ]
      : undefined

    return {
      message,
      details,
      exitCode: 2,
      shouldExit: this.config.exitOnError,
      context: {
        ...context,
        timestamp: new Date(),
        operation: 'authentication',
      },
    }
  }

  /**
   * Format network errors
   */
  formatNetworkError(error: Error, context?: ErrorContext): FormattedError {
    const message = `Network error: ${error.message}`
    const details = this.config.verboseLogging
      ? [
          'Check your internet connection',
          'Verify Slack API endpoints are accessible',
          'Consider increasing timeout values',
        ]
      : undefined

    return {
      message,
      details,
      exitCode: 4,
      shouldExit: this.config.exitOnError,
      context: {
        ...context,
        timestamp: new Date(),
        operation: 'network',
      },
    }
  }

  /**
   * Get configuration for debugging
   */
  getConfiguration(): object {
    return {
      verboseLogging: this.config.verboseLogging,
      exitOnError: this.config.exitOnError,
      colorOutput: this.config.colorOutput,
    }
  }

  /**
   * Create error handler for different environments
   */
  static forProduction(): ErrorHandlerService {
    return new ErrorHandlerService({
      verboseLogging: false,
      exitOnError: true,
      colorOutput: true,
    })
  }

  static forDevelopment(): ErrorHandlerService {
    return new ErrorHandlerService({
      verboseLogging: true,
      exitOnError: false,
      colorOutput: true,
    })
  }

  static forTesting(): ErrorHandlerService {
    return new ErrorHandlerService({
      verboseLogging: true,
      exitOnError: false,
      colorOutput: false,
    })
  }

  /**
   * Categorize error type for appropriate handling
   */
  private categorizeError(error: Error, context?: ErrorContext): string {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // Authentication errors
    if (this.isAuthenticationError(message, name)) {
      return 'authentication'
    }

    // Channel errors
    if (this.isChannelError(message, name)) {
      return 'channel'
    }

    // Network errors
    if (this.isNetworkError(message, name)) {
      return 'network'
    }

    // Validation errors
    if (this.isValidationError(message, name, context)) {
      return 'validation'
    }

    return 'unknown'
  }

  /**
   * Get exit code based on error type
   */
  private getExitCode(errorType: string): number {
    switch (errorType) {
      case 'validation':
        return 1
      case 'authentication':
        return 2
      case 'channel':
        return 3
      case 'network':
        return 4
      case 'permission':
        return 5
      case 'rate-limit':
        return 6
      case 'unknown':
      default:
        return 99
    }
  }

  /**
   * Get exit code for delivery error types
   */
  private getExitCodeForDeliveryError(errorType: string): number {
    switch (errorType) {
      case 'authentication':
        return 2
      case 'channel':
        return 3
      case 'network':
        return 4
      case 'validation':
        return 1
      case 'rate-limit':
        return 6
      case 'permission':
        return 5
      default:
        return 5
    }
  }

  /**
   * Format general error message
   */
  private formatError(
    error: Error,
    errorType: string,
    context?: ErrorContext
  ): { message: string; details?: string[] } {
    const contextInfo = context?.channelId
      ? ` (Channel: ${context.channelId})`
      : ''
    const message = `${this.getErrorPrefix(errorType)}: ${error.message}${contextInfo}`

    const details = this.config.verboseLogging
      ? [
          `Error Type: ${errorType}`,
          `Command: ${context?.command || 'unknown'}`,
          `Operation: ${context?.operation || 'unknown'}`,
          `Stack: ${error.stack || 'not available'}`,
        ]
      : undefined

    if (details) {
      return { message, details }
    } else {
      return { message }
    }
  }

  /**
   * Format delivery error message
   */
  private formatDeliveryError(
    result: MessageDeliveryResult,
    context?: ErrorContext
  ): { message: string; details?: string[] } {
    const error = result.error || new Error('Unknown delivery error')
    const channelInfo = result.channelId ? ` to ${result.channelId}` : ''
    const message = `Failed to send message${channelInfo}: ${error.message}`

    const details = this.config.verboseLogging
      ? [
          `Error Type: ${result.errorType || 'unknown'}`,
          `Delivery Time: ${result.deliveryTimeMs}ms`,
          `Retry Count: ${result.retryCount}`,
          `Channel: ${result.channelId || 'unknown'}`,
          `Context: ${context?.operation || 'message-delivery'}`,
        ]
      : undefined

    if (details) {
      return { message, details }
    } else {
      return { message }
    }
  }

  /**
   * Get error prefix based on type
   */
  private getErrorPrefix(errorType: string): string {
    switch (errorType) {
      case 'authentication':
        return 'Authentication Error'
      case 'channel':
        return 'Channel Error'
      case 'network':
        return 'Network Error'
      case 'validation':
        return 'Validation Error'
      case 'permission':
        return 'Permission Error'
      case 'rate-limit':
        return 'Rate Limit Error'
      default:
        return 'Error'
    }
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(message: string, name: string): boolean {
    const patterns = [
      /invalid.*auth/,
      /token.*invalid/,
      /not.*authed/,
      /account.*inactive/,
      /invalid.*token/,
      /token.*revoked/,
      /token.*expired/,
      /authentication.*failed/,
    ]

    return patterns.some(pattern => pattern.test(message) || pattern.test(name))
  }

  /**
   * Check if error is channel-related
   */
  private isChannelError(message: string, name: string): boolean {
    const patterns = [
      /channel.*not.*found/,
      /is.*archived/,
      /cannot.*post/,
      /not.*in.*channel/,
      /channel.*is.*archived/,
      /restricted.*action/,
      /channel.*not.*exist/,
    ]

    return patterns.some(pattern => pattern.test(message) || pattern.test(name))
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(message: string, name: string): boolean {
    const patterns = [
      /network/,
      /timeout/,
      /connection/,
      /enotfound/,
      /econnrefused/,
      /socket/,
      /fetch.*failed/,
      /request.*failed/,
    ]

    return patterns.some(pattern => pattern.test(message) || pattern.test(name))
  }

  /**
   * Check if error is validation-related
   */
  private isValidationError(
    message: string,
    name: string,
    context?: ErrorContext
  ): boolean {
    const patterns = [
      /validation.*failed/,
      /invalid.*input/,
      /missing.*required/,
      /invalid.*format/,
      /invalid.*parameter/,
    ]

    return (
      patterns.some(pattern => pattern.test(message) || pattern.test(name)) ||
      context?.operation === 'validation'
    )
  }
}
