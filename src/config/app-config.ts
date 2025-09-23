import { Configuration } from '../models/configuration.js'
import { YamlConfigService } from '../services/yaml-config.service.js'
import { ConfigValidationService } from '../services/config-validation.service.js'
import type { ChannelConfiguration } from '../models/channel-configuration'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

declare const process: {
  env: Record<string, string | undefined>
  version: string
  platform: string
  arch: string
  cwd(): string
}

/**
 * Application configuration loader
 */
export class AppConfig {
  private static instance: Configuration | null = null
  private static yamlConfigService: YamlConfigService | null = null
  private static configValidationService: ConfigValidationService | null = null

  /**
   * Get the application configuration instance
   */
  static getConfig(): Configuration {
    if (!AppConfig.instance) {
      AppConfig.instance = Configuration.createDefault()
    }
    return AppConfig.instance
  }

  /**
   * Get YAML configuration service instance
   */
  static getYamlConfigService(): YamlConfigService {
    if (!AppConfig.yamlConfigService) {
      AppConfig.yamlConfigService = new YamlConfigService()
    }
    return AppConfig.yamlConfigService
  }

  /**
   * Get configuration validation service instance
   */
  static getConfigValidationService(): ConfigValidationService {
    if (!AppConfig.configValidationService) {
      AppConfig.configValidationService = new ConfigValidationService()
    }
    return AppConfig.configValidationService
  }

  /**
   * Load and validate YAML channel configuration
   */
  static async loadChannelConfiguration(configPath?: string): Promise<{
    success: boolean
    configuration?: ChannelConfiguration
    error?: string
    resolvedPath?: string
  }> {
    const yamlService = AppConfig.getYamlConfigService()
    const validationService = AppConfig.getConfigValidationService()

    // Try to find configuration file if not provided
    const resolvedPath = configPath || AppConfig.findDefaultConfigFile()

    if (!resolvedPath) {
      return {
        success: false,
        error:
          'No configuration file found. Please create a slack-config.yml file or specify path with --config',
      }
    }

    try {
      // Load YAML configuration
      const configuration = await yamlService.loadConfiguration(resolvedPath)

      // Validate configuration
      const validation =
        validationService.validateChannelConfiguration(configuration)
      if (!validation.isValid) {
        const errorMessage = validation.errors.map(e => e.message).join('; ')
        return {
          success: false,
          error: `Configuration validation failed: ${errorMessage}`,
          resolvedPath,
        }
      }

      return {
        success: true,
        configuration,
        resolvedPath,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: `Failed to load configuration: ${errorMessage}`,
        resolvedPath,
      }
    }
  }

  /**
   * Find default configuration file in common locations
   */
  static findDefaultConfigFile(): string | null {
    const cwd = process.cwd()
    const possiblePaths = [
      'slack-config.yml',
      'slack-config.yaml',
      'channels.yml',
      'channels.yaml',
      '.slack-config.yml',
      '.slack-config.yaml',
      join('config', 'slack-config.yml'),
      join('config', 'slack-config.yaml'),
      join('config', 'channels.yml'),
      join('config', 'channels.yaml'),
    ]

    for (const relativePath of possiblePaths) {
      const fullPath = resolve(cwd, relativePath)
      if (existsSync(fullPath)) {
        return fullPath
      }
    }

    return null
  }

  /**
   * Validate a channel list exists in configuration
   */
  static async validateChannelList(
    configPath: string,
    listName: string
  ): Promise<{
    valid: boolean
    error?: string
    availableLists?: string[]
  }> {
    try {
      const result = await AppConfig.loadChannelConfiguration(configPath)
      if (!result.success || !result.configuration) {
        return {
          valid: false,
          error: result.error || 'Failed to load configuration',
        }
      }

      const configuration = result.configuration
      const availableLists = Object.keys(configuration.channelLists)

      if (!configuration.channelLists[listName]) {
        return {
          valid: false,
          error: `Channel list "${listName}" not found in configuration`,
          availableLists,
        }
      }

      return {
        valid: true,
        availableLists,
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get configuration file examples and documentation
   */
  static getConfigurationHelp(): {
    example: string
    commonPaths: string[]
    validation: string[]
  } {
    return {
      example: `# slack-config.yml
channel_lists:
  dev-team:
    - '#backend-dev'
    - '#frontend-dev'
    - 'C1234567890'  # Channel ID
  
  marketing:
    - '#marketing-general'
    - '#social-media'
  
  company-wide:
    - '#general'
    - '#announcements'`,
      commonPaths: [
        './slack-config.yml',
        './slack-config.yaml',
        './channels.yml',
        './channels.yaml',
        './config/slack-config.yml',
      ],
      validation: [
        'YAML must be valid and parseable',
        'Must contain channel_lists at root level',
        'Each list must have at least one channel',
        'Maximum 100 channels per list',
        'Channel names must start with # or be valid IDs',
      ],
    }
  }

  /**
   * Load configuration from environment or use defaults
   */
  static load(): Configuration {
    // For console app initialization, we use constitutional defaults
    // In a real app, this might load from env vars or config files
    const nodeVersion = process.env['NODE_VERSION_REQUIREMENT'] || '>=21.0.0'
    const strict = true // Constitutional requirement
    const testFramework = 'vitest' // Constitutional requirement
    const buildTarget = 'dist' // Per specification

    const config = new Configuration(
      nodeVersion,
      strict,
      testFramework,
      buildTarget
    )
    AppConfig.instance = config
    return config
  }

  /**
   * Validate that current Node.js version meets requirements
   */
  static validateNodeVersion(): boolean {
    const config = AppConfig.getConfig()
    const currentVersion = process.version // e.g., "v22.14.0"
    const versionParts = currentVersion.slice(1).split('.')
    const majorVersionStr = versionParts[0]
    if (!majorVersionStr) return false

    const majorVersion = parseInt(majorVersionStr, 10)

    // Extract required major version from config
    const match = config.nodeVersion.match(/>=(\d+)/)
    if (!match || !match[1]) return false

    const requiredMajor = parseInt(match[1], 10)
    return majorVersion >= requiredMajor
  }

  /**
   * Get runtime environment information
   */
  static getRuntimeInfo(): {
    nodeVersion: string
    platform: string
    arch: string
  } {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    }
  }
}
