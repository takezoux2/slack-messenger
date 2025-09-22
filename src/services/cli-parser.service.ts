/**
 * CLI Parser Service
 *
 * Handles command-line argument parsing using commander.js and converts
 * parsed arguments into typed CommandLineOptions model instances.
 */

import { Command } from 'commander'
import { CommandLineOptions } from '../models/command-line-options.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get package.json for version information
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJsonPath = join(__dirname, '../../package.json')

let packageVersion: string
try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  packageVersion = packageJson.version || '1.0.0'
} catch {
  packageVersion = '1.0.0'
}

export interface ParsedCliArgs {
  command: string
  channelId?: string | undefined
  message?: string | undefined
  verbose?: boolean | undefined
  help?: boolean | undefined
  version?: boolean | undefined
  token?: string | undefined
  logLevel?: string | undefined
  timeout?: number | undefined
  retries?: number | undefined
}

export class CliParserService {
  private program: Command

  constructor() {
    this.program = new Command()
    this.setupCommands()
  }

  /**
   * Parse command line arguments and return CommandLineOptions
   */
  parseArgs(argv: string[]): CommandLineOptions {
    try {
      // Parse arguments
      this.program.parse(argv)

      const options = this.program.opts() as Record<string, unknown>

      // Check if help or version was requested
      if (options['help']) {
        return CommandLineOptions.forHelp()
      }

      if (options['version']) {
        return CommandLineOptions.forVersion()
      }

      // Get the parsed command and options
      const commandName = this.program.args[0] || 'send-message'

      // Extract positional arguments for send-message command
      let channelId: string | undefined
      let message: string | undefined

      if (commandName === 'send-message') {
        const command = this.program.commands.find(
          cmd => cmd.name() === 'send-message'
        )
        if (command) {
          const args = command.args
          channelId = args[0]
          message = args[1]
        }
      }

      // Create parsed args object
      const parsedArgs: ParsedCliArgs = {
        command: commandName,
        channelId,
        message,
        verbose: options['verbose'] as boolean | undefined,
        help: options['help'] as boolean | undefined,
        version: options['version'] as boolean | undefined,
        token: options['token'] as string | undefined,
        logLevel: options['logLevel'] as string | undefined,
        timeout: options['timeout']
          ? parseInt(options['timeout'] as string, 10)
          : undefined,
        retries: options['retries']
          ? parseInt(options['retries'] as string, 10)
          : undefined,
      }

      return CommandLineOptions.fromCliArgs({
        command: parsedArgs.command || undefined,
        channelId: parsedArgs.channelId || undefined,
        message: parsedArgs.message || undefined,
        verbose: parsedArgs.verbose || undefined,
        help: parsedArgs.help || undefined,
        version: parsedArgs.version || undefined,
        token: parsedArgs.token || undefined,
        logLevel: parsedArgs.logLevel || undefined,
        timeout: parsedArgs.timeout || undefined,
        retries: parsedArgs.retries || undefined,
      })
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to parse command line arguments: ${error.message}`
        )
      }
      throw new Error('Failed to parse command line arguments')
    }
  }

  /**
   * Get help text for the CLI
   */
  getHelpText(): string {
    return this.program.helpInformation()
  }

  /**
   * Get version information
   */
  getVersion(): string {
    return packageVersion
  }

  /**
   * Check if arguments indicate help request
   */
  isHelpRequest(argv: string[]): boolean {
    return (
      argv.includes('--help') || argv.includes('-h') || argv.includes('help')
    )
  }

  /**
   * Check if arguments indicate version request
   */
  isVersionRequest(argv: string[]): boolean {
    return (
      argv.includes('--version') ||
      argv.includes('-V') ||
      argv.includes('version')
    )
  }

  /**
   * Setup commander.js commands and options
   */
  private setupCommands(): void {
    this.program
      .name('slack-messenger')
      .description('Send messages to Slack channels via CLI')
      .version(packageVersion)

    // send-message command
    this.program
      .command('send-message')
      .description('Send a message to a Slack channel')
      .argument('<channelId>', 'Slack channel ID (e.g., C1234567890)')
      .argument('<message>', 'Message content to send')
      .option('-v, --verbose', 'Enable verbose logging', false)
      .option(
        '-t, --token <token>',
        'Slack bot token (overrides SLACK_BOT_TOKEN environment variable)'
      )
      .option(
        '-l, --log-level <level>',
        'Log level (debug, info, warn, error)',
        'info'
      )
      .option('--timeout <ms>', 'Timeout in milliseconds', '10000')
      .option('--retries <count>', 'Number of retry attempts', '3')
      .action((_channelId, _message, _options) => {
        // Commander will handle this action, but we parse in parseArgs method
      })

    // Global options
    this.program
      .option('-h, --help', 'Display help information')
      .option('-V, --version', 'Display version information')

    // Error handling
    this.program.exitOverride(err => {
      throw err
    })
  }

  /**
   * Validate parsed arguments
   */
  private validateParsedArgs(args: ParsedCliArgs): string[] {
    const errors: string[] = []

    if (args.command === 'send-message') {
      if (!args.channelId) {
        errors.push('Missing required argument: channelId')
      } else {
        // Validate channel ID format
        const channelIdPattern = /^[CGD][A-Z0-9]{9,10}$/i
        if (!channelIdPattern.test(args.channelId)) {
          errors.push('Invalid channel ID format. Must be like C1234567890')
        }
      }

      if (!args.message) {
        errors.push('Missing required argument: message')
      } else {
        const trimmedMessage = args.message.trim()
        if (trimmedMessage.length === 0) {
          errors.push('Message cannot be empty or whitespace only')
        } else if (trimmedMessage.length > 40000) {
          errors.push('Message cannot exceed 40,000 characters')
        }
      }
    }

    if (args.timeout !== undefined) {
      if (isNaN(args.timeout) || args.timeout < 1000) {
        errors.push('Timeout must be a number and at least 1000ms (1 second)')
      }
    }

    if (args.retries !== undefined) {
      if (isNaN(args.retries) || args.retries < 0 || args.retries > 10) {
        errors.push('Retries must be a number between 0 and 10')
      }
    }

    if (
      args.logLevel &&
      !['debug', 'info', 'warn', 'error'].includes(args.logLevel)
    ) {
      errors.push('Log level must be one of: debug, info, warn, error')
    }

    return errors
  }

  /**
   * Create a CLI parser for testing with custom arguments
   */
  static forTesting(): CliParserService {
    return new CliParserService()
  }

  /**
   * Parse arguments and handle errors gracefully
   */
  static parseArgsWithErrorHandling(argv: string[]): {
    success: boolean
    options?: CommandLineOptions
    error?: string
    helpText?: string
    version?: string
  } {
    try {
      const parser = new CliParserService()

      // Check for help/version requests first
      if (parser.isHelpRequest(argv)) {
        return {
          success: true,
          helpText: parser.getHelpText(),
          options: CommandLineOptions.forHelp(),
        }
      }

      if (parser.isVersionRequest(argv)) {
        return {
          success: true,
          version: parser.getVersion(),
          options: CommandLineOptions.forVersion(),
        }
      }

      const options = parser.parseArgs(argv)
      return {
        success: true,
        options,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: string[]): string {
    if (errors.length === 0) return ''

    const header = errors.length === 1 ? 'Error:' : 'Errors:'
    const formattedErrors = errors.map(error => `  • ${error}`).join('\n')

    return `${header}\n${formattedErrors}`
  }

  /**
   * Create usage examples text
   */
  static getUsageExamples(): string {
    return `
Examples:
  $ slack-messenger send-message C1234567890 "Hello, World!"
  $ slack-messenger send-message C1234567890 "Hello" --verbose
  $ slack-messenger send-message C1234567890 "Hello" --timeout 5000
  $ slack-messenger send-message C1234567890 "Hello" --retries 1
  $ slack-messenger --help
  $ slack-messenger --version

Environment Variables:
  SLACK_BOT_TOKEN    Slack bot token (required if not provided via --token)
  SLACK_LOG_LEVEL    Default log level (debug, info, warn, error)
`
  }
}
