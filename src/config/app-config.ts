import { Configuration } from '../models/configuration.js'

declare const process: {
  env: Record<string, string | undefined>
  version: string
  platform: string
  arch: string
}

/**
 * Application configuration loader
 */
export class AppConfig {
  private static instance: Configuration | null = null

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
