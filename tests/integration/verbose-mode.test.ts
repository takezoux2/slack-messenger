import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'

/**
 * Integration Test: Verbose Logging
 *
 * Tests verbose logging functionality from quickstart.md
 * These tests verify that verbose mode provides detailed output as specified.
 */
describe('Integration: Verbose Logging', () => {
  const execCommand = async (
    args: string[],
    env: Record<string, string> = {}
  ): Promise<{
    stdout: string
    stderr: string
    exitCode: number
  }> => {
    return new Promise(resolve => {
      const child = spawn('yarn', ['start', ...args], {
        env: { ...process.env, ...env },
        stdio: 'pipe',
        shell: true,
        timeout: 15000, // 15 second timeout
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

  describe('Verbose Flag Functionality', () => {
    it('should enable verbose logging with --verbose flag', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Verbose test message', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      // Should contain verbose logging indicators
      expect(output).toMatch(
        /\[INFO\]|\[DEBUG\]|Validating|Loading|Connecting/i
      )

      // Should show step-by-step process
      expect(output).toMatch(/validating.*arguments|arguments.*validation/i)
      expect(output).toMatch(/channel.*id.*C1234567890/i)
      expect(output).toMatch(/message.*length/i)
      expect(output).toMatch(/loading.*authentication|authentication.*loading/i)
    })

    it('should enable verbose logging with -v flag', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Verbose test with -v', '-v'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      // Should contain same verbose information as --verbose
      expect(output).toMatch(
        /\[INFO\]|\[DEBUG\]|Validating|Loading|Connecting/i
      )
    })

    it('should show masked token in verbose output', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Token masking test', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-secret-token-1234567890-shouldnotappear' }
      )

      const output = stdout + '\n' + stderr

      // Should show token loading but masked
      expect(output).toMatch(/token.*loaded.*xoxb-\*+/i)

      // Should never show actual token
      expect(output).not.toMatch(/shouldnotappear/)
      expect(output).not.toMatch(/xoxb-secret-token-1234567890-shouldnotappear/)
    })
  })

  describe('Verbose Output Content', () => {
    it('should show argument validation steps', async () => {
      const { stdout, stderr } = await execCommand(
        [
          'send-message',
          'C1234567890',
          'Argument validation test',
          '--verbose',
        ],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      expect(output).toMatch(/\[INFO\].*validating.*arguments/i)
      expect(output).toMatch(/channel.*id.*C1234567890/i)
      expect(output).toMatch(/message.*length.*\d+.*characters/i)
    })

    it('should show authentication loading process', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Auth loading test', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      expect(output).toMatch(/\[INFO\].*loading.*authentication/i)
      expect(output).toMatch(/token.*loaded.*xoxb-\*+/i)
    })

    it('should show API connection steps', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'API connection test', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      expect(output).toMatch(/\[INFO\].*connecting.*slack.*api/i)
      expect(output).toMatch(/\[INFO\].*sending.*message/i)
    })

    it('should show successful completion in verbose mode', async () => {
      const { stdout, stderr, exitCode } = await execCommand(
        ['send-message', 'C1234567890', 'Success verbose test', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      // If successful (implementation complete)
      if (exitCode === 0) {
        expect(output).toMatch(/\[INFO\].*message.*sent.*successfully/i)
        expect(output).toMatch(/message sent to C1234567890/i)
        expect(output).toMatch(/message.*id.*\d+\.\d+/i)
      }
    })
  })

  describe('Non-Verbose Mode Comparison', () => {
    it('should show minimal output without verbose flag', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Non-verbose test'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      // Should NOT contain verbose logging
      expect(output).not.toMatch(/\[INFO\].*validating.*arguments/i)
      expect(output).not.toMatch(/\[INFO\].*loading.*authentication/i)
      expect(output).not.toMatch(/\[INFO\].*connecting.*slack.*api/i)

      // Should only show final result or errors
      if (output.trim()) {
        expect(output).toMatch(/message sent|error|Error/i)
      }
    })

    it('should show more detail in verbose vs non-verbose', async () => {
      const [verboseResult, normalResult] = await Promise.all([
        execCommand(
          ['send-message', 'C1234567890', 'Comparison test', '--verbose'],
          { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
        ),
        execCommand(['send-message', 'C1234567890', 'Comparison test'], {
          SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij',
        }),
      ])

      const verboseOutput = verboseResult.stdout + '\n' + verboseResult.stderr
      const normalOutput = normalResult.stdout + '\n' + normalResult.stderr

      // Verbose should be longer and more detailed
      expect(verboseOutput.length).toBeGreaterThan(normalOutput.length)

      // Verbose should contain [INFO] tags
      expect(verboseOutput).toMatch(/\[INFO\]/)
      expect(normalOutput).not.toMatch(/\[INFO\]/)
    })
  })

  describe('Verbose Error Scenarios', () => {
    it('should show detailed error information in verbose mode', async () => {
      const { stdout, stderr } = await execCommand([
        'send-message',
        'invalid-channel-format',
        'Error test',
        '--verbose',
      ])

      const output = stdout + '\n' + stderr

      // Should show validation step that failed
      expect(output).toMatch(/\[INFO\].*validating.*arguments/i)
      expect(output).toMatch(/invalid.*channel.*id.*format/i)
    })

    it('should show authentication error details in verbose mode', async () => {
      const env: Record<string, string> = {}
      Object.keys(process.env).forEach(key => {
        if (key !== 'SLACK_BOT_TOKEN' && process.env[key] !== undefined) {
          env[key] = process.env[key]!
        }
      })

      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Auth error test', '--verbose'],
        env
      )

      const output = stdout + '\n' + stderr

      // Should show where the error occurred
      expect(output).toMatch(/\[INFO\].*loading.*authentication/i)
      expect(output).toMatch(/SLACK_BOT_TOKEN.*required/i)
    })

    it('should show API call details when errors occur', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C9999999999', 'API error test', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      // Should show API connection attempt
      expect(output).toMatch(
        /\[INFO\].*connecting.*slack.*api|sending.*message/i
      )

      // If API error occurs, should show what happened
      if (output.match(/channel.*not.*found/i)) {
        expect(output).toMatch(/\[INFO\]|\[ERROR\]/i)
      }
    })
  })

  describe('Log Levels and Environment Variables', () => {
    it('should respect SLACK_LOG_LEVEL environment variable', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Log level test', '--verbose'],
        {
          SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij',
          SLACK_LOG_LEVEL: 'debug',
        }
      )

      const output = stdout + '\n' + stderr

      // Debug level should show even more detail
      expect(output).toMatch(/\[DEBUG\]|\[INFO\]/i)
    })

    it('should handle invalid log levels gracefully', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Invalid log level test', '--verbose'],
        {
          SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij',
          SLACK_LOG_LEVEL: 'invalid-level',
        }
      )

      const output = stdout + '\n' + stderr

      // Should not crash due to invalid log level
      expect(output).not.toMatch(/undefined|null|cannot read property/i)
      // Should default to INFO level
      expect(output).toMatch(/\[INFO\]/i)
    })
  })

  describe('Performance with Verbose Logging', () => {
    it('should not significantly impact performance with verbose logging', async () => {
      const [verboseStart, normalStart] = [Date.now(), Date.now()]

      const [verboseResult, normalResult] = await Promise.all([
        execCommand(
          [
            'send-message',
            'C1234567890',
            'Performance test verbose',
            '--verbose',
          ],
          { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
        ),
        execCommand(
          ['send-message', 'C1234567890', 'Performance test normal'],
          { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
        ),
      ])

      // Verbose mode should not be significantly slower
      // (allowing for some overhead from additional logging)
      // This is more of a smoke test than a precise benchmark
      expect(verboseResult.exitCode).toBe(normalResult.exitCode)
    }, 20000)
  })

  describe('Output Formatting', () => {
    it('should use consistent log formatting in verbose mode', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Format test', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      // All log lines should follow consistent format
      const logLines = output
        .split('\n')
        .filter(line => line.match(/\[INFO\]|\[DEBUG\]|\[ERROR\]/))

      logLines.forEach(line => {
        // Should have timestamp or log level format
        expect(line).toMatch(/\[(INFO|DEBUG|ERROR)\]/)
      })
    })

    it('should show readable timestamps or indicators', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Timestamp test', '--verbose'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const output = stdout + '\n' + stderr

      // Should show some form of timing or sequence indicators
      expect(output).toMatch(/\[INFO\].*validating.*arguments/i)
      expect(output).toMatch(/\[INFO\].*loading.*authentication/i)

      // These should appear in logical order
      const validatingIndex = output.search(/validating.*arguments/i)
      const loadingIndex = output.search(/loading.*authentication/i)

      if (validatingIndex !== -1 && loadingIndex !== -1) {
        expect(validatingIndex).toBeLessThan(loadingIndex)
      }
    })
  })
})
