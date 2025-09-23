/**
 * CLI Service
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

export class CliService {
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
      // Track which command was executed
      let executedCommand: string | undefined
      let commandOptions: Record<string, unknown> = {}
      let commandArgs: string[] = []

      // Create a fresh instance to avoid state issues
      const parser = new Command()
      parser
        .name('slack-messenger')
        .description('Send messages to Slack channels via CLI')
        .version(packageVersion)
        .configureOutput({
          writeErr: str => {
            // Capture error output and add usage info
            if (str.includes('missing required argument')) {
              throw new Error(
                `${str.trim()}\n\nUse --help for usage information.`
              )
            }
            throw new Error(str.trim())
          },
          writeOut: str => {
            throw new Error(`(outputHelp): ${str}`)
          },
        })

      // send-message command
      parser
        .command('send-message')
        .description('Send a message to a Slack channel')
        .argument('<channel-id>', 'Slack channel ID (e.g., C1234567890)')
        .argument('<message...>', 'Message content to send')
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
        .action((channelId, messageParts, options) => {
          executedCommand = 'send-message'
          commandArgs = [
            channelId,
            Array.isArray(messageParts) ? messageParts.join(' ') : messageParts,
          ]
          commandOptions = options
        })

      // Error handling for commander errors
      parser.exitOverride(err => {
        // Transform commander errors to more user-friendly messages
        if (err.code === 'commander.missingArgument') {
          const argName =
            err.message.match(/argument '([^']+)'/)?.[1] || 'argument'
          if (argName.includes('channel')) {
            throw new Error(
              "error: missing required argument 'channel-id'\n\nUse --help for usage information."
            )
          } else if (argName.includes('message')) {
            throw new Error('Validation error: Message cannot be empty')
          }
          throw new Error(
            `error: missing required argument '${argName}'\n\nUse --help for usage information.`
          )
        }

        if (err.code === 'commander.missingMandatoryOptionValue') {
          throw new Error(
            `error: option '${err.message}' argument missing\n\nUse --help for usage information.`
          )
        }

        if (err.code === 'commander.unknownCommand') {
          throw new Error(
            `error: unknown command '${err.message}'\n\nUse --help for usage information.`
          )
        }

        if (err.code === 'commander.help') {
          throw new Error('(outputHelp)')
        }

        // For any other commander error, add help text
        throw new Error(`${err.message}\n\nUse --help for usage information.`)
      })

      // Parse arguments
      parser.parse(argv)

      const globalOptions = parser.opts() as Record<string, unknown>

      // Check if help or version was requested at the global level
      if (globalOptions['help']) {
        return CommandLineOptions.forHelp()
      }

      if (globalOptions['version']) {
        return CommandLineOptions.forVersion()
      }

      // If no command was executed, it means we have global args only
      if (!executedCommand) {
        // Check if it's a help or version request
        if (argv.includes('--help') || argv.includes('-h')) {
          return CommandLineOptions.forHelp()
        }
        if (argv.includes('--version') || argv.includes('-V')) {
          return CommandLineOptions.forVersion()
        }

        // Default to send-message if no command specified but we have args
        const filteredArgs = argv.slice(2) // Remove 'node' and script name
        if (
          filteredArgs.length > 0 &&
          filteredArgs[0] &&
          !filteredArgs[0].startsWith('-')
        ) {
          executedCommand = 'send-message'
          commandArgs = filteredArgs
        }
      }

      // Create parsed args object
      const parsedArgs: ParsedCliArgs = {
        command: executedCommand || 'send-message',
        channelId: commandArgs[0],
        message: commandArgs[1],
        verbose: (commandOptions['verbose'] || globalOptions['verbose']) as
          | boolean
          | undefined,
        help: (commandOptions['help'] || globalOptions['help']) as
          | boolean
          | undefined,
        version: (commandOptions['version'] || globalOptions['version']) as
          | boolean
          | undefined,
        token: (commandOptions['token'] || globalOptions['token']) as
          | string
          | undefined,
        logLevel: (commandOptions['logLevel'] || globalOptions['logLevel']) as
          | string
          | undefined,
        timeout: commandOptions['timeout']
          ? parseInt(commandOptions['timeout'] as string, 10)
          : globalOptions['timeout']
            ? parseInt(globalOptions['timeout'] as string, 10)
            : undefined,
        retries: commandOptions['retries']
          ? parseInt(commandOptions['retries'] as string, 10)
          : globalOptions['retries']
            ? parseInt(globalOptions['retries'] as string, 10)
            : undefined,
      }

      // Special case: Check for missing message in send-message command
      if (parsedArgs.command === 'send-message' && !parsedArgs.message) {
        throw new Error('Validation error: Message cannot be empty')
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
        // Re-throw commander error messages as-is for consistency
        if (error.message.startsWith('error: missing required argument')) {
          throw error
        }
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
      .argument('<channel-id>', 'Slack channel ID (e.g., C1234567890)')
      .argument('<message...>', 'Message content to send')
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
      .action((_channelId, _messageParts, _options) => {
        // Commander will handle this action, but we parse in parseArgs method
      })

    // Error handling
    this.program.exitOverride(err => {
      throw err
    })
  }

  /**
   * Create a CLI parser for testing with custom arguments
   */
  static forTesting(): CliService {
    return new CliService()
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
      const parser = new CliService()

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
  $ slack-messenger send-message C1234567890 Hello World
  $ slack-messenger --help
  $ slack-messenger --version

Environment Variables:
  SLACK_BOT_TOKEN    Slack bot token (required if not provided via --token)
  SLACK_LOG_LEVEL    Default log level (debug, info, warn, error)
`
  }
}
