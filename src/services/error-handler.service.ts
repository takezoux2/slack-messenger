/**
 * Error Handler Service
 *
 * Provides centralized error handling, exit code management, and user-friendly
 * error message formatting for the Slack messenger CLI application.
 */

import { MessageDeliveryResult } from '../models/message-delivery-result.js'
import type { BroadcastResult } from '../models/broadcast-result'
import type { ChannelDeliveryResult } from '../models/channel-delivery-result'

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
   * Handle broadcast result errors and aggregation
   */
  handleBroadcastErrors(
    result: BroadcastResult,
    context?: ErrorContext
  ): FormattedError {
    const failedResults = result.deliveryResults.filter(
      r => r.status === 'failed'
    )
    const skippedResults = result.deliveryResults.filter(
      r => r.status === 'skipped'
    )
    const successCount = result.deliveryResults.filter(
      r => r.status === 'success'
    ).length

    // Aggregate errors by type
    const errorSummary = this.aggregateDeliveryErrors(result.deliveryResults)

    let message: string
    let exitCode: number

    if (result.overallStatus === 'success') {
      message = `Broadcast completed successfully to all ${result.totalChannels} channels`
      exitCode = 0
    } else if (result.overallStatus === 'partial') {
      message = `Broadcast partially successful: ${successCount}/${result.totalChannels} channels delivered`
      exitCode = 1
    } else {
      message = `Broadcast failed: No messages delivered to ${result.totalChannels} channels`
      exitCode = 2
    }

    const details: string[] = []

    if (failedResults.length > 0) {
      details.push(`${failedResults.length} channels failed:`)
      details.push(...this.formatChannelErrors(failedResults, 'failed'))
    }

    if (skippedResults.length > 0) {
      details.push(`${skippedResults.length} channels skipped:`)
      details.push(...this.formatChannelErrors(skippedResults, 'skipped'))
    }

    if (this.config.verboseLogging && errorSummary.length > 0) {
      details.push('')
      details.push('Error Summary:')
      details.push(...errorSummary)
    }

    return {
      message,
      details: details.length > 0 ? details : undefined,
      exitCode,
      shouldExit: this.config.exitOnError,
      context: {
        ...context,
        timestamp: new Date(),
        operation: 'broadcast',
        metadata: {
          ...context?.metadata,
          totalChannels: result.totalChannels,
          successCount,
          failedCount: failedResults.length,
          skippedCount: skippedResults.length,
          overallStatus: result.overallStatus,
        },
      },
    }
  }

  /**
   * Aggregate delivery errors by type and frequency
   */
  aggregateDeliveryErrors(deliveryResults: ChannelDeliveryResult[]): string[] {
    const errorCounts = new Map<string, number>()
    const errorExamples = new Map<string, string[]>()

    for (const result of deliveryResults) {
      if (result.status !== 'success' && result.error) {
        const errorType = result.error.type || 'unknown'
        const errorMessage = result.error.message || 'Unknown error'
        const channelName = result.channel.name

        // Count occurrences
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1)

        // Collect examples (limit to 3 per error type)
        if (!errorExamples.has(errorType)) {
          errorExamples.set(errorType, [])
        }
        const examples = errorExamples.get(errorType)!
        if (examples.length < 3) {
          examples.push(`#${channelName}: ${errorMessage}`)
        }
      }
    }

    const summary: string[] = []
    for (const [errorType, count] of errorCounts.entries()) {
      const examples = errorExamples.get(errorType) || []
      summary.push(`• ${errorType}: ${count} channel${count === 1 ? '' : 's'}`)
      if (this.config.verboseLogging && examples.length > 0) {
        examples.forEach(example => summary.push(`  - ${example}`))
        if (count > examples.length) {
          summary.push(`  - ... and ${count - examples.length} more`)
        }
      }
    }

    return summary
  }

  /**
   * Format individual channel errors for display
   */
  formatChannelErrors(
    results: ChannelDeliveryResult[],
    status: 'failed' | 'skipped'
  ): string[] {
    const formatted: string[] = []

    for (const result of results) {
      const channelName = result.channel.name
      const errorMessage =
        result.error?.message || `Channel ${status} without specific reason`

      if (this.config.verboseLogging) {
        formatted.push(`  • #${channelName}: ${errorMessage}`)
      } else {
        // In non-verbose mode, group by error type
        const errorType = result.error?.type || 'unknown'
        formatted.push(`  • #${channelName} (${errorType})`)
      }
    }

    return formatted
  }

  /**
   * Handle configuration errors for broadcast commands
   */
  handleConfigurationError(
    error: Error,
    configPath?: string,
    context?: ErrorContext
  ): FormattedError {
    let message: string
    const details: string[] = []

    if (error.message.includes('not found')) {
      message = `Configuration file not found: ${configPath || 'default location'}`
      details.push('Create a YAML file with channel lists:')
      details.push('  channel_lists:')
      details.push('    my-team:')
      details.push('      - "#general"')
      details.push('      - "#announcements"')
      details.push('')
      details.push('Or specify a different path with --config <path>')
    } else if (
      error.message.includes('parse') ||
      error.message.includes('YAML')
    ) {
      message = `Invalid YAML configuration: ${error.message}`
      details.push('Check your YAML syntax:')
      details.push('  - Use proper indentation (spaces, not tabs)')
      details.push('  - Ensure list items start with "-"')
      details.push('  - Quote channel names if they contain special characters')
    } else {
      message = `Configuration error: ${error.message}`
    }

    return {
      message,
      details: details.length > 0 ? details : undefined,
      exitCode: 3,
      shouldExit: this.config.exitOnError,
      context: {
        ...context,
        timestamp: new Date(),
        operation: 'configuration',
        metadata: {
          ...context?.metadata,
          configPath,
        },
      },
    }
  }

  /**
   * Format channel list validation errors
   */
  formatChannelListError(
    listName: string,
    availableLists?: string[],
    context?: ErrorContext
  ): FormattedError {
    const message = `Channel list "${listName}" not found in configuration`

    const details: string[] = []
    if (availableLists && availableLists.length > 0) {
      details.push('Available lists:')
      availableLists.forEach(list => details.push(`  - ${list}`))
      details.push('')
      details.push(
        'Use: slack-messenger list-channels to see all available lists'
      )
    } else {
      details.push('No channel lists found in configuration')
      details.push('Add channel lists to your configuration file')
    }

    return {
      message,
      details,
      exitCode: 1,
      shouldExit: this.config.exitOnError,
      context: {
        ...context,
        timestamp: new Date(),
        operation: 'list-validation',
        metadata: {
          ...context?.metadata,
          requestedList: listName,
          availableListCount: availableLists?.length || 0,
        },
      },
    }
  }

  /**
   * Create comprehensive error report for broadcast operations
   */
  createBroadcastErrorReport(
    result: BroadcastResult,
    context?: ErrorContext
  ): {
    summary: string
    details: string[]
    recommendations: string[]
    exitCode: number
  } {
    const errors = this.handleBroadcastErrors(result, context)
    const recommendations: string[] = []

    // Analyze error patterns and provide recommendations
    const errorTypes = this.analyzeErrorPatterns(result.deliveryResults)

    if (errorTypes.has('not_in_channel')) {
      recommendations.push(
        'Add the bot to private channels or remove them from the list'
      )
    }

    if (errorTypes.has('channel_not_found')) {
      recommendations.push('Verify channel names and IDs in your configuration')
    }

    if (errorTypes.has('is_archived')) {
      recommendations.push('Remove archived channels from your configuration')
    }

    if (errorTypes.has('rate_limited')) {
      recommendations.push(
        'Reduce broadcast frequency or implement longer delays'
      )
    }

    if (errorTypes.has('network_error')) {
      recommendations.push('Check network connectivity and Slack API status')
    }

    return {
      summary: errors.message,
      details: errors.details || [],
      recommendations,
      exitCode: errors.exitCode,
    }
  }

  /**
   * Analyze error patterns in delivery results
   */
  private analyzeErrorPatterns(
    deliveryResults: ChannelDeliveryResult[]
  ): Set<string> {
    const errorTypes = new Set<string>()

    for (const result of deliveryResults) {
      if (result.error?.type) {
        errorTypes.add(result.error.type)
      }
    }

    return errorTypes
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
