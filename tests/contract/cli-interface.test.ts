import { describe, it, expect, beforeEach, vi } from 'vitest'
import { spawn } from 'child_process'
import { promisify } from 'util'

/**
 * CLI Interface Contract Tests
 *
 * Tests the command-line interface contract as defined in contracts/cli-interface.md
 * These tests verify that the CLI behaves according to the contract specification.
 */
describe('CLI Interface Contract', () => {
  const execCommand = async (
    args: string[],
    env: Record<string, string> = {}
  ): Promise<{
    stdout: string
    stderr: string
    exitCode: number
  }> => {
    return new Promise(resolve => {
      const child = spawn('npm', ['run', 'run', '--', ...args], {
        env: { ...process.env, ...env },
        stdio: 'pipe',
        shell: true,
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', data => {
        stdout += data.toString()
      })

      child.stderr?.on('data', data => {
        stderr += data.toString()
      })

      child.on('close', code => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        })
      })
    })
  }

  describe('Valid Arguments', () => {
    it('should accept properly formatted channel ID and message', async () => {
      const { exitCode, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Test message'],
        { SLACK_BOT_TOKEN: 'xoxb-test-token-here' }
      )

      // Should not fail due to argument validation (will fail due to network/auth later)
      expect(exitCode).not.toBe(1) // Exit code 1 is for invalid arguments
      expect(stderr).not.toMatch(/Invalid channel ID format/)
      expect(stderr).not.toMatch(/Missing required arguments/)
    })
  })

  describe('Help and Version Display', () => {
    it('should display help information with --help flag', async () => {
      const { stdout, exitCode } = await execCommand(['send-message', '--help'])

      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/usage/i)
      expect(stdout).toMatch(/send-message/)
      expect(stdout).toMatch(/channel-id/)
      expect(stdout).toMatch(/message/)
    })

    it('should display help information with -h flag', async () => {
      const { stdout, exitCode } = await execCommand(['send-message', '-h'])

      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/usage/i)
      expect(stdout).toMatch(/send-message/)
    })

    it('should display version information with --version flag', async () => {
      const { stdout, exitCode } = await execCommand([
        'send-message',
        '--version',
      ])

      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/\d+\.\d+\.\d+/) // Version number pattern
    })
  })

  describe('Missing Arguments Handling', () => {
    it('should show error when missing channel ID and message', async () => {
      const { stderr, exitCode } = await execCommand(['send-message'])

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(
        /Missing required arguments|error: missing required/i
      )
    })

    it('should show error when missing message', async () => {
      const { stderr, exitCode } = await execCommand([
        'send-message',
        'C1234567890',
      ])

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(
        /Missing required arguments|error: missing required/i
      )
    })

    it('should show usage help on missing arguments', async () => {
      const { stderr } = await execCommand(['send-message'])

      expect(stderr).toMatch(/Use --help for usage|help/i)
    })
  })

  describe('Invalid Channel Format Detection', () => {
    it('should reject channel ID without C prefix', async () => {
      const { stderr, exitCode } = await execCommand([
        'send-message',
        '1234567890',
        'Test message',
      ])

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(/Invalid channel ID format|Must be like C/i)
    })

    it('should reject channel ID that is too short', async () => {
      const { stderr, exitCode } = await execCommand([
        'send-message',
        'C123',
        'Test message',
      ])

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(/Invalid channel ID format|Must be like C/i)
    })

    it('should reject human-readable channel names', async () => {
      const { stderr, exitCode } = await execCommand([
        'send-message',
        '#general',
        'Test message',
      ])

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(/Invalid channel ID format|Must be like C/i)
    })

    it('should reject plain channel names', async () => {
      const { stderr, exitCode } = await execCommand([
        'send-message',
        'general',
        'Test message',
      ])

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(/Invalid channel ID format|Must be like C/i)
    })
  })

  describe('Empty Message Rejection', () => {
    it('should reject empty message', async () => {
      const { stderr, exitCode } = await execCommand([
        'send-message',
        'C1234567890',
        '',
      ])

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(/empty.*message|message.*empty/i)
    })

    it('should reject whitespace-only message', async () => {
      const { stderr, exitCode } = await execCommand([
        'send-message',
        'C1234567890',
        '   ',
      ])

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(/empty.*message|message.*empty/i)
    })
  })

  describe('Missing Token Detection', () => {
    it('should show error when SLACK_BOT_TOKEN is missing', async () => {
      // Explicitly unset the token
      const env: Record<string, string> = {}
      Object.keys(process.env).forEach(key => {
        if (key !== 'SLACK_BOT_TOKEN' && process.env[key] !== undefined) {
          env[key] = process.env[key]!
        }
      })

      const { stderr, exitCode } = await execCommand(
        ['send-message', 'C1234567890', 'Test message'],
        env
      )

      expect(exitCode).toBe(2)
      expect(stderr).toMatch(
        /SLACK_BOT_TOKEN.*required|environment variable.*required/i
      )
    })

    it('should show error when SLACK_BOT_TOKEN is empty', async () => {
      const { stderr, exitCode } = await execCommand(
        ['send-message', 'C1234567890', 'Test message'],
        { SLACK_BOT_TOKEN: '' }
      )

      expect(exitCode).toBe(2)
      expect(stderr).toMatch(/SLACK_BOT_TOKEN.*required|invalid.*token/i)
    })
  })

  describe('Verbose Flag Functionality', () => {
    it('should enable verbose logging with --verbose flag', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Test message', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-test-token-here' }
      )

      const output = stdout + stderr
      expect(output).toMatch(/\[INFO\]|\[DEBUG\]|Validating|Loading/i)
    })

    it('should enable verbose logging with -v flag', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Test message', '-v'],
        { SLACK_BOT_TOKEN: 'xoxb-test-token-here' }
      )

      const output = stdout + stderr
      expect(output).toMatch(/\[INFO\]|\[DEBUG\]|Validating|Loading/i)
    })
  })

  describe('Exit Code Validation', () => {
    it('should return exit code 1 for invalid arguments', async () => {
      const { exitCode } = await execCommand(['send-message', 'invalid'])
      expect(exitCode).toBe(1)
    })

    it('should return exit code 2 for missing authentication', async () => {
      const env: Record<string, string> = {}
      Object.keys(process.env).forEach(key => {
        if (key !== 'SLACK_BOT_TOKEN' && process.env[key] !== undefined) {
          env[key] = process.env[key]!
        }
      })

      const { exitCode } = await execCommand(
        ['send-message', 'C1234567890', 'Test'],
        env
      )
      expect(exitCode).toBe(2)
    })

    it('should return exit code 0 for help display', async () => {
      const { exitCode } = await execCommand(['send-message', '--help'])
      expect(exitCode).toBe(0)
    })

    it('should return exit code 0 for version display', async () => {
      const { exitCode } = await execCommand(['send-message', '--version'])
      expect(exitCode).toBe(0)
    })
  })
})
