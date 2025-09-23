import { Message, MessageLevel } from '../models/message.js'
import type { BroadcastResult } from '../models/broadcast-result'
import type { ChannelDeliveryResult } from '../models/channel-delivery-result'
import type { ChannelConfiguration } from '../models/channel-configuration'
import type { DryRunResult } from './broadcast-dry-run.service'

/**
 * Console service for message output
 */
export class ConsoleService {
  private readonly colorSupport: boolean

  constructor(options?: { colorSupport?: boolean; verboseMode?: boolean }) {
    this.colorSupport = options?.colorSupport ?? true
    // verboseMode is available via options but not stored as we don't use it internally
  }

  /**
   * Output a message to the console with appropriate formatting
   */
  write(message: Message): void {
    const formatted = message.format()

    switch (message.level) {
      case MessageLevel.ERROR:
        console.error(formatted)
        break
      case MessageLevel.DEBUG:
        console.debug(formatted)
        break
      case MessageLevel.INFO:
      default:
        console.log(formatted)
        break
    }
  }

  /**
   * Output simple text to console (for basic hello world functionality)
   */
  writeText(text: string): void {
    console.log(text)
  }

  /**
   * Output info-level message
   */
  info(content: string): void {
    const message = Message.info(content)
    this.write(message)
  }

  /**
   * Output error-level message
   */
  error(content: string): void {
    const message = Message.error(content)
    this.write(message)
  }

  /**
   * Output debug-level message
   */
  debug(content: string): void {
    const message = Message.debug(content)
    this.write(message)
  }

  /**
   * Format and display broadcast results
   */
  displayBroadcastResult(
    result: BroadcastResult,
    verbose: boolean = false
  ): void {
    // Header
    this.writeText(
      `Broadcasting to "${result.targetListName}" (${result.totalChannels} channels)...`
    )
    this.writeText('')

    // Individual channel results
    for (const delivery of result.deliveryResults) {
      this.displayChannelDeliveryResult(delivery, verbose)
    }

    this.writeText('')

    // Summary
    this.displayBroadcastSummary(result, verbose)
  }

  /**
   * Display individual channel delivery result
   */
  displayChannelDeliveryResult(
    delivery: ChannelDeliveryResult,
    verbose: boolean = false
  ): void {
    const channelName = delivery.channel.name
    const symbol = this.getStatusSymbol(delivery.status)
    const color = this.getStatusColor(delivery.status)

    let line = `${symbol} #${channelName}`

    if (delivery.status === 'success') {
      if (delivery.messageId && verbose) {
        line += `: Message sent (ts: ${delivery.messageId})`
      } else {
        line += ': Message sent'
      }
    } else if (delivery.status === 'failed') {
      const reason = delivery.error?.message || 'Unknown error'
      line += `: Failed - ${reason}`
    } else if (delivery.status === 'skipped') {
      const reason = delivery.error?.message || 'Access denied'
      line += `: Skipped - ${reason}`
    }

    if (this.colorSupport && color) {
      line = this.colorize(line, color)
    }

    this.writeText(line)
  }

  /**
   * Display broadcast summary
   */
  displayBroadcastSummary(
    result: BroadcastResult,
    verbose: boolean = false
  ): void {
    const successCount = result.deliveryResults.filter(
      r => r.status === 'success'
    ).length
    const failureCount = result.deliveryResults.filter(
      r => r.status === 'failed'
    ).length
    const skipCount = result.deliveryResults.filter(
      r => r.status === 'skipped'
    ).length

    let summaryLine: string
    let summaryColor: string | null = null

    if (result.overallStatus === 'success') {
      summaryLine = `Broadcast completed: ${successCount}/${result.totalChannels} channels successful`
      summaryColor = 'green'
    } else if (result.overallStatus === 'partial') {
      summaryLine = `Broadcast completed: ${successCount}/${result.totalChannels} channels successful`
      summaryColor = 'yellow'
    } else {
      summaryLine = `Broadcast failed: No messages delivered`
      summaryColor = 'red'
    }

    if (this.colorSupport && summaryColor) {
      summaryLine = this.colorize(summaryLine, summaryColor)
    }

    this.writeText(summaryLine)

    // Additional failure/skip information
    if (result.overallStatus !== 'success') {
      if (failureCount > 0) {
        const failureText = `${failureCount} channel${failureCount === 1 ? '' : 's'} failed - see details above`
        this.writeText(
          this.colorSupport ? this.colorize(failureText, 'red') : failureText
        )
      }
      if (skipCount > 0) {
        const skipText = `${skipCount} channel${skipCount === 1 ? '' : 's'} skipped - see details above`
        this.writeText(
          this.colorSupport ? this.colorize(skipText, 'yellow') : skipText
        )
      }
    }

    // Verbose timing information
    if (verbose) {
      const duration = this.formatDuration(
        Date.now() - result.completedAt.getTime()
      )
      this.writeText('')
      this.writeText(`Total delivery time: ${duration}`)
    }
  }

  /**
   * Display dry run results
   */
  displayDryRunResult(result: DryRunResult): void {
    this.writeText(
      `Dry run for "${result.targetListName}" (${result.channels.length} channels):`
    )
    this.writeText('')

    // Channel list
    for (const channel of result.channels) {
      this.writeText(`→ #${channel.name} (${channel.id})`)
    }

    this.writeText('')
    this.writeText('Message preview:')
    this.writeText(`"${result.message}"`)
    this.writeText('')

    const noneMessage = this.colorSupport
      ? this.colorize('No messages sent (dry run mode)', 'blue')
      : 'No messages sent (dry run mode)'
    this.writeText(noneMessage)
  }

  /**
   * Display channel configuration lists
   */
  displayChannelConfiguration(
    config: ChannelConfiguration,
    configPath: string
  ): void {
    const lists = Object.values(config.channelLists)

    if (lists.length === 0) {
      this.writeText(`No channel lists found in ${configPath}`)
      return
    }

    this.writeText(`Available channel lists in ${configPath}:`)
    this.writeText('')

    let totalChannels = 0
    const uniqueChannels = new Set<string>()

    for (const list of lists) {
      const listHeader = this.colorSupport
        ? this.colorize(
            `${list.name} (${list.channels.length} channels):`,
            'cyan'
          )
        : `${list.name} (${list.channels.length} channels):`

      this.writeText(listHeader)

      for (const channel of list.channels) {
        const displayName =
          channel.type === 'name' ? channel.identifier : channel.identifier
        this.writeText(`  - ${displayName}`)
        uniqueChannels.add(channel.identifier.toLowerCase())
      }

      totalChannels += list.channels.length
      this.writeText('')
    }

    // Summary
    const summaryText = `Total: ${lists.length} list${lists.length === 1 ? '' : 's'}, ${uniqueChannels.size} unique channel${uniqueChannels.size === 1 ? '' : 's'}`
    this.writeText(
      this.colorSupport ? this.colorize(summaryText, 'green') : summaryText
    )

    if (totalChannels !== uniqueChannels.size) {
      const duplicateText = `(${totalChannels} total channel references, ${totalChannels - uniqueChannels.size} duplicates across lists)`
      this.writeText(
        this.colorSupport
          ? this.colorize(duplicateText, 'yellow')
          : duplicateText
      )
    }
  }

  /**
   * Display error messages with formatting
   */
  displayError(error: string, details?: string[]): void {
    const errorText = this.colorSupport
      ? this.colorize(`❌ ${error}`, 'red')
      : `❌ ${error}`
    this.writeText(errorText)

    if (details && details.length > 0) {
      this.writeText('')
      for (const detail of details) {
        this.writeText(detail)
      }
    }
  }

  /**
   * Display success messages with formatting
   */
  displaySuccess(message: string): void {
    const successText = this.colorSupport
      ? this.colorize(`✅ ${message}`, 'green')
      : `✅ ${message}`
    this.writeText(successText)
  }

  /**
   * Display warning messages with formatting
   */
  displayWarning(message: string): void {
    const warningText = this.colorSupport
      ? this.colorize(`⚠️  ${message}`, 'yellow')
      : `⚠️  ${message}`
    this.writeText(warningText)
  }

  /**
   * Display info messages with formatting
   */
  displayInfo(message: string): void {
    const infoText = this.colorSupport
      ? this.colorize(`ℹ️  ${message}`, 'blue')
      : `ℹ️  ${message}`
    this.writeText(infoText)
  }

  /**
   * Get status symbol for delivery result
   */
  private getStatusSymbol(status: 'success' | 'failed' | 'skipped'): string {
    switch (status) {
      case 'success':
        return '✓'
      case 'failed':
        return '✗'
      case 'skipped':
        return '⚠'
      default:
        return '?'
    }
  }

  /**
   * Get color for status
   */
  private getStatusColor(
    status: 'success' | 'failed' | 'skipped'
  ): string | null {
    switch (status) {
      case 'success':
        return 'green'
      case 'failed':
        return 'red'
      case 'skipped':
        return 'yellow'
      default:
        return null
    }
  }

  /**
   * Apply color to text (simplified implementation)
   */
  private colorize(text: string, color: string): string {
    if (!this.colorSupport) return text

    const colors: Record<string, string> = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      reset: '\x1b[0m',
    }

    const colorCode = colors[color]
    if (!colorCode) return text

    return `${colorCode}${text}${colors['reset']}`
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    } else {
      return `${(ms / 60000).toFixed(1)}m`
    }
  }

  /**
   * Create console service for different environments
   */
  static forProduction(): ConsoleService {
    return new ConsoleService({
      colorSupport: true,
      verboseMode: false,
    })
  }

  static forDevelopment(): ConsoleService {
    return new ConsoleService({
      colorSupport: true,
      verboseMode: true,
    })
  }

  static forTesting(): ConsoleService {
    return new ConsoleService({
      colorSupport: false,
      verboseMode: true,
    })
  }
}
