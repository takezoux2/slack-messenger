/**
 * Broadcast Message Command
 *
 * Implements the broadcast command functionality that sends messages
 * to multiple Slack channels based on named channel lists from YAML configuration.
 */

import { SlackService } from '../services/slack.service.js'
import { YamlConfigService } from '../services/yaml-config.service.js'
import { ConfigValidationService } from '../services/config-validation.service.js'
import { BroadcastDryRunService } from '../services/broadcast-dry-run.service.js'
import { ErrorHandlerService } from '../services/error-handler.service.js'
import type { BroadcastOptions } from '../models/broadcast-options'
import type { BroadcastResult } from '../models/broadcast-result'
import type { ChannelConfiguration } from '../models/channel-configuration'
import type { ResolvedChannel } from '../models/resolved-channel'
import type { DryRunResult } from '../services/broadcast-dry-run.service'
import { MessageInput } from '../models/message-input.js'
import {
  applyMentions,
  formatResolutionSummary,
} from '../services/mention-resolution.service.js'
import { FileMessageLoaderService } from '../services/file-message-loader.service.js'
import { LoggingService } from '../services/logging.service.js'
import { SenderIdentity } from '../models/sender-identity.js'
import type { ResolvedSenderIdentity } from '../models/sender-identity'

export interface BroadcastCommandConfig {
  slackService?: SlackService
  yamlConfigService?: YamlConfigService
  configValidationService?: ConfigValidationService
  dryRunService?: BroadcastDryRunService
  errorHandler?: ErrorHandlerService
  verboseLogging?: boolean
}

export interface BroadcastCommandResult {
  success: boolean
  broadcastResult?: BroadcastResult
  dryRunResult?: DryRunResult
  error?: Error
  exitCode: number
  output: string[]
}

export class BroadcastMessageCommand {
  private readonly slackService: SlackService
  private readonly yamlConfigService: YamlConfigService
  private readonly configValidationService: ConfigValidationService
  private readonly dryRunService: BroadcastDryRunService
  private readonly errorHandler: ErrorHandlerService
  private readonly verboseLogging: boolean
  private readonly logging = LoggingService.getInstance()

  constructor(config?: BroadcastCommandConfig) {
    this.verboseLogging = config?.verboseLogging || false

    this.slackService = config?.slackService || SlackService.fromEnvironment()
    this.yamlConfigService =
      config?.yamlConfigService || new YamlConfigService()
    this.configValidationService =
      config?.configValidationService || new ConfigValidationService()
    this.dryRunService = config?.dryRunService || new BroadcastDryRunService()
    this.errorHandler =
      config?.errorHandler ||
      new ErrorHandlerService({
        verboseLogging: this.verboseLogging,
      })
  }

  /**
   * Execute the broadcast command
   */
  async execute(options: BroadcastOptions): Promise<BroadcastCommandResult> {
    const output: string[] = []

    try {
      this.logVerbose(output, 'Starting broadcast command...')
      let senderIdentity: ResolvedSenderIdentity | undefined

      // Support message file input by loading it before validation (so validation sees inline message)
      // @ts-ignore messageFile may be passed via CLI parsing though not in interface
      const messageFile: string | undefined = (options as any).messageFile
      let loadedMessageFromFile: string | undefined
      if (messageFile) {
        try {
          const mi = await FileMessageLoaderService.load(messageFile)
          loadedMessageFromFile = mi.content
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          return this.createFailureResult(err, 1, output)
        }
      }

      // Build effective options object for validation without mutating original (which has getter-only props)
      const effectiveOptions: BroadcastOptions = {
        ...options,
        message: loadedMessageFromFile || options.message,
      }

      // Validate broadcast options (now possibly containing file-loaded message)
      const optionsValidation =
        this.configValidationService.validateBroadcastOptions(effectiveOptions)
      if (!optionsValidation.isValid) {
        const error = new Error(
          `Invalid options: ${optionsValidation.errors.map(e => e.message).join(', ')}`
        )
        return this.createFailureResult(error, 1, output)
      }

      this.logVerbose(
        output,
        `Loading configuration from: ${options.configPath}`
      )

      // Load and validate configuration
      let configuration: ChannelConfiguration
      try {
        configuration = await this.yamlConfigService.loadConfiguration(
          options.configPath
        )
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        return this.createFailureResult(err, 3, output)
      }

      // Validate configuration structure
      const configValidation =
        this.configValidationService.validateChannelConfiguration(configuration)
      if (!configValidation.isValid) {
        const error = new Error(
          `Invalid configuration: ${configValidation.errors.map(e => e.message).join(', ')}`
        )
        return this.createFailureResult(error, 3, output)
      }

      // Check if the requested list exists
      const listValidation =
        this.configValidationService.validateListNameExists(
          configuration,
          options.listName
        )
      if (!listValidation.isValid) {
        const errorMessage =
          listValidation.errors &&
          listValidation.errors.length > 0 &&
          listValidation.errors[0]
            ? listValidation.errors[0].message
            : 'List not found'
        const error = new Error(errorMessage)
        return this.createFailureResult(error, 1, output)
      }

      const targetList = configuration.channelLists.find(
        list => list.name === options.listName
      )
      if (!targetList) {
        const error = new Error(`Channel list "${options.listName}" not found`)
        return this.createFailureResult(error, 1, output)
      }

      this.logVerbose(
        output,
        `Found channel list "${options.listName}" with ${targetList.channels.length} channels`
      )

      const identityResolution = this.resolveSenderIdentity(
        configuration,
        options,
        output
      )
      senderIdentity = identityResolution.identity
      for (const warning of identityResolution.warnings) {
        output.push(`⚠️ ${warning}`)
      }
      if (identityResolution.requiresAllowDefaultIdentity) {
        const errorMessage =
          identityResolution.allowDefaultIdentityErrorMessage ||
          `Sender identity not configured in ${configuration.filePath}. Use --allow-default-identity to proceed with the default Slack identity.`
        return this.createFailureResult(new Error(errorMessage), 1, output)
      }

      // Test bypass for integration tests (no real Slack): if dry-run and env flag set, fabricate resolved channels
      const testBypass =
        options.dryRun &&
        (process.env['SM_TEST_BYPASS_SLACK'] === '1' || !!process.env['VITEST'])
      let resolvedChannels: ResolvedChannel[] | null = null
      if (testBypass) {
        resolvedChannels = targetList.channels.map((c, idx) => ({
          id: c.identifier,
          name: `chan${idx + 1}`,
          isPrivate: false,
          isMember: true,
          isArchived: false,
        }))
        this.logVerbose(output, 'Bypassing Slack auth & resolution (test mode)')
      }

      // Test authentication
      if (!testBypass) {
        this.logVerbose(output, 'Validating Slack authentication...')
        const authTest = await this.slackService.testAuthentication()
        if (!authTest.valid) {
          const error = new Error(
            `Authentication failed: ${authTest.error || 'Unknown error'}`
          )
          return this.createFailureResult(error, 2, output)
        }
        this.logVerbose(
          output,
          `Authentication successful - Bot ID: ${authTest.botId}`
        )
      }

      // Determine message input (file or inline). For broadcast, options.message is required by validation today; extend to support messageFile when CLI adds it
      let messageContent = effectiveOptions.message
      if (messageFile) {
        this.logVerbose(
          output,
          `source: file (path: ${messageFile}) | preview: ${MessageInput.preview200(messageContent || '')}`
        )
      } else if (typeof messageContent === 'string') {
        this.logVerbose(
          output,
          `source: inline (length: ${messageContent.length})`
        )
      }

      // Resolve channels
      if (!resolvedChannels) {
        this.logVerbose(output, 'Resolving channel identifiers...')
        try {
          resolvedChannels = await this.slackService.resolveChannels(
            targetList.channels
          )
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          return this.createFailureResult(err, 4, output)
        }
      }

      this.logVerbose(
        output,
        `Resolved ${resolvedChannels.length}/${targetList.channels.length} channels`
      )

      if (resolvedChannels.length === 0) {
        const error = new Error('No channels could be resolved from the list')
        return this.createFailureResult(error, 4, output)
      }

      // Apply mention resolution before dry run or broadcast
      let mentionSummaryLines: string[] | null = null
      if (typeof messageContent === 'string' && messageContent.includes('@')) {
        try {
          const resolution = applyMentions(
            messageContent,
            configuration.mentions || {}
          )
          messageContent = resolution.text
          mentionSummaryLines = formatResolutionSummary(resolution.summary)
          if (resolution.summary.hadPlaceholders) {
            this.logging.debug('mention-resolution summary', {
              replacements: resolution.summary.replacements,
              total: resolution.summary.totalReplacements,
              unresolved: resolution.summary.unresolved,
            })
          }
        } catch (e) {
          // Non-fatal: leave messageContent unchanged on failure
          this.logVerbose(
            output,
            `Mention resolution error (ignored): ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }

      // Handle dry run
      if (options.dryRun) {
        this.logVerbose(output, 'Performing dry run simulation...')
        if (this.verboseLogging) {
          // Show the exact (post-mention-resolution) message that would be sent
          const len =
            typeof messageContent === 'string' ? messageContent.length : 0
          // Escape newlines for single-line verbose log clarity
          const oneLine = (messageContent || '')
            .replace(/\r/g, '')
            .split('\n')
            .map(l => l.trimEnd())
            .join(' \n ')
          this.logVerbose(
            output,
            `Dry-run message body (length: ${len}): ${oneLine}`
          )
        }
        const dryRunResult = await this.dryRunService.simulateBroadcast(
          resolvedChannels,
          messageContent,
          options.listName
        )

        // Generate and display dry run preview
        const preview = this.dryRunService.generateDryRunPreview(dryRunResult)
        output.push(preview)

        // Append mention summary lines (if any)
        if (mentionSummaryLines) {
          output.push('')
          for (const line of mentionSummaryLines) output.push(line)
        }

        return {
          success: true,
          dryRunResult,
          exitCode: 0,
          output,
        }
      }

      // Perform actual broadcast
      this.logVerbose(
        output,
        `Broadcasting message to ${resolvedChannels.length} channels...`
      )
      output.push(
        `Broadcasting to "${options.listName}" (${resolvedChannels.length} channels)...`
      )
      output.push('')

      const broadcastResult = await this.slackService.broadcastMessage(
        resolvedChannels,
        messageContent,
        { listName: options.listName },
        senderIdentity
      )

      // Generate output based on results
      this.generateBroadcastOutput(output, broadcastResult, options.verbose)

      // Determine success and exit code
      const success = broadcastResult.overallStatus === 'success'
      const exitCode = this.getExitCodeForBroadcastResult(broadcastResult)

      // Append mention summary lines after core broadcast output
      if (mentionSummaryLines) {
        output.push('')
        for (const line of mentionSummaryLines) output.push(line)
      }

      return {
        success,
        broadcastResult,
        exitCode,
        output,
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logVerbose(output, `Unexpected error: ${err.message}`)
      return this.createFailureResult(err, 99, output)
    }
  }

  /**
   * Create the command with environment-based configuration
   */
  static fromEnvironment(options?: {
    verboseLogging?: boolean
  }): BroadcastMessageCommand {
    return new BroadcastMessageCommand({
      verboseLogging: options?.verboseLogging || false,
    })
  }

  /**
   * Create the command with custom services for testing
   */
  static forTesting(config: BroadcastCommandConfig): BroadcastMessageCommand {
    return new BroadcastMessageCommand(config)
  }

  /**
   * Generate output for broadcast results
   */
  private generateBroadcastOutput(
    output: string[],
    result: BroadcastResult,
    verbose: boolean
  ): void {
    for (const delivery of result.deliveryResults) {
      if (delivery.status === 'success') {
        const timestamp = delivery.messageId
          ? ` (ts: ${delivery.messageId})`
          : ''
        output.push(`✓ #${delivery.channel.name}: Message sent${timestamp}`)
      } else if (delivery.status === 'failed') {
        const reason = delivery.error?.message || 'Unknown error'
        output.push(`✗ #${delivery.channel.name}: Failed - ${reason}`)
        const guidance =
          typeof delivery.error?.details?.guidance === 'string'
            ? delivery.error.details.guidance
            : undefined
        if (guidance) {
          output.push(`    ↳ ${guidance}`)
        }
        const slackMessages = Array.isArray(
          delivery.error?.details?.slackMessages
        )
          ? delivery.error?.details?.slackMessages
          : undefined
        if (slackMessages && slackMessages.length > 0) {
          for (const message of slackMessages) {
            output.push(`    • ${message}`)
          }
        }
      } else if (delivery.status === 'skipped') {
        const reason = delivery.error?.message || 'Access denied'
        output.push(`⚠ #${delivery.channel.name}: Skipped - ${reason}`)
      }
    }

    output.push('')

    // Summary
    const successCount = result.deliveryResults.filter(
      r => r.status === 'success'
    ).length
    const failureCount = result.deliveryResults.filter(
      r => r.status === 'failed'
    ).length
    const skipCount = result.deliveryResults.filter(
      r => r.status === 'skipped'
    ).length

    const failedValidationCount = result.deliveryResults.filter(
      r => r.status === 'failed' && this.isValidationFailureType(r.error?.type)
    ).length

    if (result.overallStatus === 'success') {
      output.push(
        `Broadcast completed: ${successCount}/${result.totalChannels} channels successful`
      )
    } else if (result.overallStatus === 'partial') {
      output.push(
        `Broadcast completed: ${successCount}/${result.totalChannels} channels successful`
      )
      if (failureCount > 0) {
        output.push(
          `${failureCount} channel${failureCount === 1 ? '' : 's'} failed - see details above`
        )
      }
      if (skipCount > 0) {
        output.push(
          `${skipCount} channel${skipCount === 1 ? '' : 's'} skipped - see details above`
        )
      }
    } else {
      output.push(`Broadcast failed: No messages delivered`)
      if (failureCount > 0) {
        output.push(
          `${failureCount} channel${failureCount === 1 ? '' : 's'} failed`
        )
      }
      if (skipCount > 0) {
        output.push(`${skipCount} channel${skipCount === 1 ? '' : 's'} skipped`)
      }
    }

    if (failedValidationCount > 0) {
      output.push(
        `Validation issues detected in ${failedValidationCount} channel${failedValidationCount === 1 ? '' : 's'} — adjust the message content or channel targets and retry.`
      )
    }

    if (verbose) {
      output.push('')
      output.push(
        `Total delivery time: ${this.formatDuration(Date.now() - result.completedAt.getTime())}`
      )
    }
  }

  /**
   * Get exit code based on broadcast result
   */
  private getExitCodeForBroadcastResult(result: BroadcastResult): number {
    const failedDeliveries = result.deliveryResults.filter(
      r => r.status === 'failed'
    )
    const hasValidationFailure = failedDeliveries.some(delivery =>
      this.isValidationFailureType(delivery.error?.type)
    )
    const hasNonValidationFailure = failedDeliveries.some(
      delivery =>
        delivery.error && !this.isValidationFailureType(delivery.error.type)
    )

    switch (result.overallStatus) {
      case 'success':
        return 0
      case 'partial':
        if (hasValidationFailure && !hasNonValidationFailure) {
          return 1
        }
        return 1
      case 'failed':
        if (hasValidationFailure && !hasNonValidationFailure) {
          return 1
        }
        return 2
      default:
        return 5
    }
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
   * Log verbose message if verbose logging is enabled
   */
  private logVerbose(output: string[], message: string): void {
    if (this.verboseLogging) {
      output.push(`[INFO] ${message}`)
    }
  }

  /**
   * Create a failure result with consistent structure
   */
  private createFailureResult(
    error: Error,
    exitCode: number,
    output: string[]
  ): BroadcastCommandResult {
    output.push(`❌ Error: ${error.message}`)

    return {
      success: false,
      error,
      exitCode,
      output,
    }
  }

  /**
   * Get command configuration for debugging
   */
  getConfiguration(): object {
    return {
      verboseLogging: this.verboseLogging,
      slackServiceConfig: this.slackService.getClientConfig(),
      errorHandlerConfig: this.errorHandler.getConfiguration(),
    }
  }

  /**
   * Validate that all required dependencies are properly configured
   */
  async validateConfiguration(): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Test Slack service configuration
      const authTest = await this.slackService.testAuthentication()
      if (!authTest.valid) {
        errors.push(`Slack authentication failed: ${authTest.error}`)
      }

      // Validate services are initialized
      if (!this.yamlConfigService) {
        errors.push('YAML config service not initialized')
      }
      if (!this.configValidationService) {
        errors.push('Config validation service not initialized')
      }
      if (!this.dryRunService) {
        errors.push('Dry run service not initialized')
      }
    } catch (error) {
      errors.push(
        `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  private resolveSenderIdentity(
    configuration: ChannelConfiguration,
    options: BroadcastOptions,
    output: string[]
  ): {
    identity?: ResolvedSenderIdentity
    warnings: string[]
    requiresAllowDefaultIdentity: boolean
    allowDefaultIdentityErrorMessage?: string
  } {
    const warnings: string[] = []
    const configIdentity = configuration.senderIdentity

    if (configIdentity) {
      this.logVerbose(
        output,
        `Sender identity configured in ${configuration.filePath}`
      )
    } else {
      this.logVerbose(
        output,
        `No sender identity defined in ${configuration.filePath}`
      )
    }

    const resolution = SenderIdentity.resolve(configIdentity, {
      name: options.senderName,
      iconEmoji: options.senderIconEmoji,
      iconUrl: options.senderIconUrl,
    })

    warnings.push(...resolution.warnings)

    let identity = resolution.identity
    if (identity && !SenderIdentity.isComplete(identity)) {
      warnings.push(
        `${
          resolution.sourceDescription || 'Sender identity'
        } is missing a name or icon. Using default Slack identity.`
      )
      identity = undefined
    }

    const overridesProvided =
      options.senderName !== undefined ||
      options.senderIconEmoji !== undefined ||
      options.senderIconUrl !== undefined

    if (!identity && overridesProvided) {
      warnings.push(
        'Sender identity overrides require --sender-name and either --sender-icon-emoji or --sender-icon-url.'
      )
    }

    const allowDefaultFromConfig = configIdentity?.allowDefaultIdentity === true
    const allowDefaultIdentityEnabled =
      options.allowDefaultIdentity || allowDefaultFromConfig

    let requiresAllowDefaultIdentity = false
    let allowDefaultIdentityErrorMessage: string | undefined

    if (!identity) {
      if (!allowDefaultIdentityEnabled) {
        const message = `Sender identity not configured in ${configuration.filePath}. Use --allow-default-identity to proceed with the default Slack identity.`
        warnings.push(message)
        requiresAllowDefaultIdentity = true
        allowDefaultIdentityErrorMessage = message
      } else if (allowDefaultFromConfig && !options.allowDefaultIdentity) {
        warnings.push(
          `Sender identity is not configured, but ${configuration.filePath} allows using the default Slack identity.`
        )
      }
    }

    if (identity) {
      const icon = identity.iconEmoji || identity.iconUrl || 'default'
      this.logVerbose(
        output,
        `Sender identity resolved from ${
          resolution.sourceDescription || 'configuration'
        }: name="${identity.name}" icon=${icon}`
      )
    }

    return {
      ...(identity ? { identity } : {}),
      warnings,
      requiresAllowDefaultIdentity,
      ...(allowDefaultIdentityErrorMessage
        ? { allowDefaultIdentityErrorMessage }
        : {}),
    }
  }

  private isValidationFailureType(type?: string | null): boolean {
    if (!type) {
      return false
    }

    return /invalid_arguments|validation/i.test(type)
  }
}
