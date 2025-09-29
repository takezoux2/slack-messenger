/**
 * Environment Configuration Loader
 * Handles loading and validation of environment variables and configuration
 */

export interface EnvironmentConfig {
  slackBotToken: string | undefined
  logLevel: string
  nodeEnv: string
  timeout: number
  retries: number
  verboseMode: boolean
}

export class EnvironmentConfigLoader {
  private static instance: EnvironmentConfigLoader
  private config: EnvironmentConfig

  private constructor() {
    this.config = this.loadConfiguration()
  }

  static getInstance(): EnvironmentConfigLoader {
    if (!EnvironmentConfigLoader.instance) {
      EnvironmentConfigLoader.instance = new EnvironmentConfigLoader()
    }
    return EnvironmentConfigLoader.instance
  }

  getConfig(): EnvironmentConfig {
    return { ...this.config }
  }

  getSlackBotToken(): string | undefined {
    return this.config.slackBotToken
  }

  getLogLevel(): string {
    return this.config.logLevel
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production'
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development'
  }

  isTest(): boolean {
    return this.config.nodeEnv === 'test'
  }

  getTimeout(): number {
    return this.config.timeout
  }

  getRetries(): number {
    return this.config.retries
  }

  isVerboseMode(): boolean {
    return this.config.verboseMode
  }

  private loadConfiguration(): EnvironmentConfig {
    return {
      slackBotToken: this.getEnvVar('SLACK_BOT_TOKEN'),
      logLevel: this.getEnvVar('SLACK_LOG_LEVEL', 'info') || 'info',
      nodeEnv: this.getEnvVar('NODE_ENV', 'development') || 'development',
      timeout: this.getEnvNumber('SLACK_TIMEOUT', 10000),
      retries: this.getEnvNumber('SLACK_RETRIES', 3),
      verboseMode: this.getEnvBoolean('SLACK_VERBOSE', false),
    }
  }

  // Unified overload to satisfy eslint no-dupe-class-members
  private getEnvVar(key: string, defaultValue?: string): string | undefined {
    const value = process.env[key]
    if (value !== undefined) {
      return value.trim()
    }
    return defaultValue
  }

  private getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key]
    if (value !== undefined) {
      const parsed = parseInt(value.trim(), 10)
      if (!isNaN(parsed)) {
        return parsed
      }
    }
    return defaultValue
  }

  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key]
    if (value !== undefined) {
      const trimmed = value.trim().toLowerCase()
      return trimmed === 'true' || trimmed === '1' || trimmed === 'yes'
    }
    return defaultValue
  }

  /**
   * Validate required environment variables
   */
  validateRequired(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // SLACK_BOT_TOKEN is required for actual API calls
    if (!this.config.slackBotToken) {
      errors.push('SLACK_BOT_TOKEN environment variable is required')
    }

    // Validate token format if provided
    if (
      this.config.slackBotToken &&
      !this.isValidTokenFormat(this.config.slackBotToken)
    ) {
      errors.push(
        'SLACK_BOT_TOKEN must be a valid Slack bot token (starts with xoxb-)'
      )
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Check if token has valid format
   */
  private isValidTokenFormat(token: string): boolean {
    // Slack bot tokens start with 'xoxb-' and have specific format
    return /^xoxb-\d+-\d+-[a-zA-Z0-9]+$/.test(token)
  }

  /**
   * Get environment info for debugging
   */
  getEnvironmentInfo(): Record<string, any> {
    return {
      nodeEnv: this.config.nodeEnv,
      logLevel: this.config.logLevel,
      timeout: this.config.timeout,
      retries: this.config.retries,
      verboseMode: this.config.verboseMode,
      hasSlackToken: !!this.config.slackBotToken,
      tokenFormat: this.config.slackBotToken
        ? this.isValidTokenFormat(this.config.slackBotToken)
          ? 'valid'
          : 'invalid'
        : 'missing',
    }
  }

  /**
   * Reload configuration from environment
   */
  reload(): void {
    this.config = this.loadConfiguration()
  }

  /**
   * Set configuration values (for testing)
   */
  setConfig(config: Partial<EnvironmentConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Reset to defaults (for testing)
   */
  reset(): void {
    this.config = this.loadConfiguration()
  }
}
