/**
 * List Channels Command
 *
 * Implements the list-channels command functionality that displays
 * available channel lists from YAML configuration.
 */

import { YamlConfigService } from '../services/yaml-config.service.js'
import { ConfigValidationService } from '../services/config-validation.service.js'
import { ErrorHandlerService } from '../services/error-handler.service.js'
import type { ChannelConfiguration } from '../models/channel-configuration'
import type { ListCommandArgs } from '../models/command-line-options'

export interface ListChannelsCommandConfig {
  yamlConfigService?: YamlConfigService
  configValidationService?: ConfigValidationService
  errorHandler?: ErrorHandlerService
  verboseLogging?: boolean
}

export interface ListChannelsCommandResult {
  success: boolean
  configuration?: ChannelConfiguration
  error?: Error
  exitCode: number
  output: string[]
}

export class ListChannelsCommand {
  private readonly yamlConfigService: YamlConfigService
  private readonly configValidationService: ConfigValidationService
  private readonly errorHandler: ErrorHandlerService
  private readonly verboseLogging: boolean

  constructor(config?: ListChannelsCommandConfig) {
    this.verboseLogging = config?.verboseLogging || false

    this.yamlConfigService =
      config?.yamlConfigService || new YamlConfigService()
    this.configValidationService =
      config?.configValidationService || new ConfigValidationService()
    this.errorHandler =
      config?.errorHandler ||
      new ErrorHandlerService({
        verboseLogging: this.verboseLogging,
      })
  }

  /**
   * Execute the list-channels command
   */
  async execute(args: ListCommandArgs): Promise<ListChannelsCommandResult> {
    const output: string[] = []

    try {
      this.logVerbose(output, 'Starting list-channels command...')

      // Use default config path if not provided
      const configPath = args.config || './channels.yaml'
      this.logVerbose(output, `Loading configuration from: ${configPath}`)

      // Load and validate configuration
      let configuration: ChannelConfiguration
      try {
        configuration =
          await this.yamlConfigService.loadConfiguration(configPath)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        if (err.message.includes('not found')) {
          output.push(`Error: Configuration file not found: ${configPath}`)
          output.push('')
          output.push('Create a YAML file with channel lists:')
          output.push('  channel_lists:')
          output.push('    my-team:')
          output.push('      - "#general"')
          output.push('      - "#announcements"')
          output.push('')
          output.push('Or specify a different path with --config <path>')
        } else {
          output.push(`Error: ${err.message}`)
        }
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
      // Generate output
      this.generateListOutput(output, configuration, configPath)

      return {
        success: true,
        configuration,
        exitCode: 0,
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
  }): ListChannelsCommand {
    return new ListChannelsCommand({
      verboseLogging: options?.verboseLogging || false,
    })
  }

  /**
   * Create the command with custom services for testing
   */
  static forTesting(config: ListChannelsCommandConfig): ListChannelsCommand {
    return new ListChannelsCommand(config)
  }

  /**
   * Generate formatted output for channel lists
   */
  private generateListOutput(
    output: string[],
    configuration: ChannelConfiguration,
    configPath: string
  ): void {
    const lists = configuration.channelLists

    if (lists.length === 0) {
      output.push(`No channel lists found in ${configPath}`)
      return
    }

    output.push(`Available channel lists in ${configPath}:`)
    output.push('')

    let totalChannels = 0
    const uniqueChannels = new Set<string>()

    for (const list of lists) {
      output.push(`${list.name} (${list.channels.length} channels):`)

      for (const channel of list.channels) {
        const displayName =
          channel.type === 'name' ? channel.identifier : channel.identifier
        output.push(`  - ${displayName}`)
        uniqueChannels.add(channel.identifier.toLowerCase())
      }

      totalChannels += list.channels.length
      output.push('')
    }

    // Summary
    output.push(
      `Total: ${lists.length} list${lists.length === 1 ? '' : 's'}, ${uniqueChannels.size} unique channel${uniqueChannels.size === 1 ? '' : 's'}`
    )

    if (totalChannels !== uniqueChannels.size) {
      output.push(
        `(${totalChannels} total channel references, ${totalChannels - uniqueChannels.size} duplicates across lists)`
      )
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
  ): ListChannelsCommandResult {
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
      // Validate services are initialized
      if (!this.yamlConfigService) {
        errors.push('YAML config service not initialized')
      }
      if (!this.configValidationService) {
        errors.push('Config validation service not initialized')
      }

      // Test YAML service functionality
      if (this.yamlConfigService) {
        const cacheSize = this.yamlConfigService.getCacheSize()
        this.logVerbose([], `YAML service cache size: ${cacheSize}`)
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

  /**
   * Get detailed information about a specific channel list
   */
  async getChannelListDetails(
    configPath: string,
    listName: string
  ): Promise<{
    exists: boolean
    list?: any
    stats?: {
      channelCount: number
      nameCount: number
      idCount: number
    }
    error?: string
  }> {
    try {
      const configuration =
        await this.yamlConfigService.loadConfiguration(configPath)
      const list = configuration.channelLists.find(l => l.name === listName)

      if (!list) {
        return {
          exists: false,
          error: `Channel list "${listName}" not found`,
        }
      }

      // Calculate statistics
      let nameCount = 0
      let idCount = 0
      for (const channel of list.channels) {
        if (channel.type === 'name') nameCount++
        else idCount++
      }

      return {
        exists: true,
        list,
        stats: {
          channelCount: list.channels.length,
          nameCount,
          idCount,
        },
      }
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Search for channels across all lists
   */
  async searchChannels(
    configPath: string,
    searchTerm: string
  ): Promise<{
    matches: Array<{
      listName: string
      channel: string
      type: 'name' | 'id'
    }>
    error?: string
  }> {
    try {
      const configuration =
        await this.yamlConfigService.loadConfiguration(configPath)
      const matches: Array<{
        listName: string
        channel: string
        type: 'name' | 'id'
      }> = []

      const searchLower = searchTerm.toLowerCase()

      for (const list of configuration.channelLists) {
        for (const channel of list.channels) {
          if (channel.identifier.toLowerCase().includes(searchLower)) {
            matches.push({
              listName: list.name,
              channel: channel.identifier,
              type: channel.type,
            })
          }
        }
      }

      return { matches }
    } catch (error) {
      return {
        matches: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
