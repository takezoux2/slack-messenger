import type { ResolvedChannel } from '../models/resolved-channel'

/**
 * Dry run simulation result
 */
export interface DryRunResult {
  targetListName: string
  channels: ResolvedChannel[]
  message: string
  wouldSucceed: number
  wouldFail: number
  wouldSkip: number
  warnings: string[]
  resolutionFailures?: Array<{ identifier: string; error: string }>
  estimatedDuration?: string
}

/**
 * Service for simulating broadcast delivery without sending messages
 */
export class BroadcastDryRunService {
  /**
   * Simulate broadcast delivery and predict outcomes
   */
  async simulateBroadcast(
    channels: ResolvedChannel[],
    message: string,
    targetListName: string = 'unknown'
  ): Promise<DryRunResult> {
    const warnings: string[] = []
    let wouldSucceed = 0
    let wouldFail = 0
    let wouldSkip = 0

    // Validate message length
    if (message.trim().length === 0) {
      warnings.push('Message is empty')
      wouldFail = channels.length
    } else if (message.length > 40000) {
      warnings.push(
        `Message exceeds Slack maximum length (${message.length} characters)`
      )
      wouldFail = channels.length
    } else {
      // Analyze each channel
      for (const channel of channels) {
        if (channel.isArchived) {
          warnings.push(`Cannot send to archived channel #${channel.name}`)
          wouldFail++
        } else if (channel.isPrivate && !channel.isMember) {
          warnings.push(
            `Bot is not a member of #${channel.name} (private channel)`
          )
          wouldSkip++
        } else {
          wouldSucceed++
        }
      }
    }

    // Estimate delivery duration
    const estimatedDuration = this.estimateDeliveryTime(wouldSucceed)

    return {
      targetListName,
      channels,
      message,
      wouldSucceed,
      wouldFail,
      wouldSkip,
      warnings,
      estimatedDuration,
    }
  }

  /**
   * Validate channels and predict resolution failures
   */
  async validateChannelResolution(
    channelIdentifiers: string[],
    allChannels: ResolvedChannel[]
  ): Promise<{
    resolved: ResolvedChannel[]
    failures: Array<{ identifier: string; error: string }>
  }> {
    const resolved: ResolvedChannel[] = []
    const failures: Array<{ identifier: string; error: string }> = []

    const channelMap = new Map(allChannels.map(ch => [ch.id, ch]))
    const nameMap = new Map(allChannels.map(ch => [ch.name, ch]))

    for (const identifier of channelIdentifiers) {
      let channel: ResolvedChannel | undefined

      if (identifier.startsWith('#')) {
        // Channel name
        const channelName = identifier.slice(1)
        channel = nameMap.get(channelName)

        if (!channel) {
          failures.push({
            identifier,
            error: 'channel_not_found',
          })
        }
      } else if (/^C[A-Z0-9]{10}$/i.test(identifier)) {
        // Channel ID
        channel = channelMap.get(identifier.toUpperCase())

        if (!channel) {
          failures.push({
            identifier,
            error: 'channel_not_found',
          })
        }
      } else {
        // Invalid format
        failures.push({
          identifier,
          error: 'invalid_format',
        })
      }

      if (channel) {
        resolved.push(channel)
      }
    }

    return { resolved, failures }
  }

  /**
   * Generate formatted preview output for dry run
   */
  generateDryRunPreview(result: DryRunResult): string {
    const lines: string[] = []

    // Header
    lines.push(
      `Dry run for "${result.targetListName}" (${result.channels.length} channels):`
    )
    lines.push('')

    // Channel list with status indicators
    for (const channel of result.channels) {
      let status = '✓'
      let note = ''

      if (channel.isArchived) {
        status = '✗'
        note = ' (archived)'
      } else if (channel.isPrivate && !channel.isMember) {
        status = '⚠'
        note = ' (not a member)'
      }

      lines.push(`→ #${channel.name} (${channel.id}) ${status}${note}`)
    }

    lines.push('')

    // Message preview
    lines.push('Message preview:')
    const truncatedMessage =
      result.message.length > 100
        ? `"${result.message.substring(0, 100)}..."`
        : `"${result.message}"`
    lines.push(truncatedMessage)
    lines.push('')

    // Warnings
    if (result.warnings.length > 0) {
      lines.push('Warnings:')
      for (const warning of result.warnings) {
        lines.push(`⚠ ${warning}`)
      }
      lines.push('')
    }

    // Summary
    if (result.wouldSucceed > 0) {
      lines.push(`Would deliver to ${result.wouldSucceed} channels`)
    }
    if (result.wouldSkip > 0) {
      lines.push(`Would skip ${result.wouldSkip} channels (access issues)`)
    }
    if (result.wouldFail > 0) {
      lines.push(`Would fail on ${result.wouldFail} channels`)
    }

    if (result.estimatedDuration) {
      lines.push(`Delivery estimate: ${result.estimatedDuration}`)
    }

    lines.push('')
    lines.push('No messages sent (dry run mode)')

    return lines.join('\n')
  }

  /**
   * Estimate delivery time based on channel count
   */
  private estimateDeliveryTime(channelCount: number): string {
    if (channelCount === 0) {
      return '0 seconds'
    }

    // Estimate: ~1-2 seconds per channel including rate limiting
    const minSeconds = channelCount
    const maxSeconds = channelCount * 2

    if (maxSeconds < 60) {
      return `${minSeconds}-${maxSeconds} seconds`
    } else if (maxSeconds < 3600) {
      const minMinutes = Math.ceil(minSeconds / 60)
      const maxMinutes = Math.ceil(maxSeconds / 60)
      return `${minMinutes}-${maxMinutes} minutes`
    } else {
      const minHours = Math.ceil(minSeconds / 3600)
      const maxHours = Math.ceil(maxSeconds / 3600)
      return `${minHours}-${maxHours} hours`
    }
  }

  /**
   * Check message content for potential issues
   */
  validateMessageContent(message: string): string[] {
    const issues: string[] = []

    if (!message || message.trim().length === 0) {
      issues.push('Message is empty')
      return issues
    }

    const trimmed = message.trim()

    if (trimmed.length > 40000) {
      issues.push(
        `Message exceeds Slack limit (${trimmed.length}/40000 characters)`
      )
    }

    if (trimmed.length > 4000) {
      issues.push(
        'Message is very long and may be truncated in some Slack clients'
      )
    }

    // Check for common formatting issues
    if (message.includes('<@') && !message.includes('>')) {
      issues.push('Message may contain malformed user mentions')
    }

    if (message.includes('<#') && !message.includes('>')) {
      issues.push('Message may contain malformed channel mentions')
    }

    return issues
  }

  /**
   * Get channel accessibility summary
   */
  getAccessibilitySummary(channels: ResolvedChannel[]): {
    accessible: number
    restricted: number
    archived: number
    total: number
  } {
    let accessible = 0
    let restricted = 0
    let archived = 0

    for (const channel of channels) {
      if (channel.isArchived) {
        archived++
      } else if (channel.isPrivate && !channel.isMember) {
        restricted++
      } else {
        accessible++
      }
    }

    return {
      accessible,
      restricted,
      archived,
      total: channels.length,
    }
  }
}
