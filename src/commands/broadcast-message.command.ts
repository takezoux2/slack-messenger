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

      // Validate broadcast options
      const optionsValidation =
        this.configValidationService.validateBroadcastOptions(options)
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

      const targetList = configuration.channelLists[options.listName]
      if (!targetList) {
        const error = new Error(`Channel list "${options.listName}" not found`)
        return this.createFailureResult(error, 1, output)
      }

      this.logVerbose(
        output,
        `Found channel list "${options.listName}" with ${targetList.channels.length} channels`
      )

      // Test authentication
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

      // Resolve channels
      this.logVerbose(output, 'Resolving channel identifiers...')
      let resolvedChannels: ResolvedChannel[]
      try {
        resolvedChannels = await this.slackService.resolveChannels(
          targetList.channels
        )
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        return this.createFailureResult(err, 4, output)
      }

      this.logVerbose(
        output,
        `Resolved ${resolvedChannels.length}/${targetList.channels.length} channels`
      )

      if (resolvedChannels.length === 0) {
        const error = new Error('No channels could be resolved from the list')
        return this.createFailureResult(error, 4, output)
      }

      // Handle dry run
      if (options.dryRun) {
        this.logVerbose(output, 'Performing dry run simulation...')
        const dryRunResult = await this.dryRunService.simulateBroadcast(
          resolvedChannels,
          options.message,
          options.listName
        )

        // Generate and display dry run preview
        const preview = this.dryRunService.generateDryRunPreview(dryRunResult)
        output.push(preview)

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
        options.message,
        { listName: options.listName }
      )

      // Generate output based on results
      this.generateBroadcastOutput(output, broadcastResult, options.verbose)

      // Determine success and exit code
      const success = broadcastResult.overallStatus === 'success'
      const exitCode = this.getExitCodeForBroadcastResult(broadcastResult)

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
    switch (result.overallStatus) {
      case 'success':
        return 0
      case 'partial':
        return 1
      case 'failed':
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
}
