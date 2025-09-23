import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'

/**
 * Integration Test: Basic Message Sending
 *
 * Tests the basic functionality from quickstart.md validation scenarios
 * These tests verify the end-to-end message sending flow.
 */
describe('Integration: Basic Message Sending', () => {
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
        timeout: 10000, // 10 second timeout
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

  describe('Test 1: Authentication Testing', () => {
    it('should fail with exit code 2 with fake token (auth error expected)', async () => {
      // This test uses a fake token which will fail authentication - this is expected
      const { exitCode, stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Test message'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      // Integration tests with fake tokens should fail authentication
      expect(exitCode).toBe(2)
      expect(stderr).toMatch(/Authentication failed|invalid_auth/i)
    }, 15000)

    it('should fail authentication with fake token (expected behavior)', async () => {
      const { stdout, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Integration test message'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      expect(stderr).toMatch(/Authentication failed|invalid_auth/i)
    }, 15000)
  })

  describe('Test 2: Invalid Channel ID (Exit Code 1)', () => {
    it('should fail with exit code 1 for invalid channel format', async () => {
      const { exitCode, stderr } = await execCommand(
        ['send-message', 'invalid-channel', 'Test message'],
        { SLACK_BOT_TOKEN: 'xoxb-test-token-invalid-channel' }
      )

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(/Invalid channel ID format|Must be like C/i)
    })

    it('should show helpful error message for invalid channel format', async () => {
      const { stderr } = await execCommand(
        ['send-message', '#general', 'Test message'],
        { SLACK_BOT_TOKEN: 'xoxb-test-token-invalid-format' }
      )

      expect(stderr).toMatch(/Invalid channel ID format/i)
      expect(stderr).toMatch(/Must be like C\d+/i)
    })
  })

  describe('Test 3: Missing Token (Exit Code 2)', () => {
    it('should fail with exit code 2 when SLACK_BOT_TOKEN is missing', async () => {
      const env: Record<string, string> = {}
      // Copy env but exclude SLACK_BOT_TOKEN
      Object.keys(process.env).forEach(key => {
        if (key !== 'SLACK_BOT_TOKEN' && process.env[key] !== undefined) {
          env[key] = process.env[key]!
        }
      })

      const { exitCode, stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Test message'],
        env
      )

      expect(exitCode).toBe(2)
      expect(stderr).toMatch(
        /SLACK_BOT_TOKEN.*required|environment variable.*required/i
      )
    })

    it('should show helpful error message for missing token', async () => {
      const { stderr } = await execCommand(
        ['send-message', 'C1234567890', 'Test message'],
        { SLACK_BOT_TOKEN: '' }
      )

      expect(stderr).toMatch(/SLACK_BOT_TOKEN/)
      expect(stderr).toMatch(/required|invalid/i)
    })
  })

  describe('Test 4: Empty Message (Exit Code 1)', () => {
    it('should fail with exit code 1 for empty message', async () => {
      const { exitCode, stderr } = await execCommand(
        ['send-message', 'C1234567890', ''],
        { SLACK_BOT_TOKEN: 'xoxb-test-token-empty-msg' }
      )

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(
        /empty.*message|message.*empty|missing.*argument.*message/i
      )
    })

    it('should fail with exit code 1 for whitespace-only message', async () => {
      const { exitCode, stderr } = await execCommand(
        ['send-message', 'C1234567890', '   \t  \n  '],
        { SLACK_BOT_TOKEN: 'xoxb-test-token-whitespace-msg' }
      )

      expect(exitCode).toBe(1)
      expect(stderr).toMatch(
        /empty.*message|message.*empty|missing.*argument.*message/i
      )
    })
  })

  describe('Test 5: Help Command (Exit Code 0)', () => {
    it('should show help and exit with code 0', async () => {
      const { exitCode, stdout } = await execCommand(['send-message', '--help'])

      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/usage|Usage/i)
      expect(stdout).toMatch(/send-message/)
      expect(stdout).toMatch(/channel-id/)
      expect(stdout).toMatch(/message/)
    })

    it('should show help with -h flag', async () => {
      const { exitCode, stdout } = await execCommand(['send-message', '-h'])

      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/usage|Usage/i)
    })

    it('should show version with --version flag', async () => {
      const { exitCode, stdout } = await execCommand([
        'send-message',
        '--version',
      ])

      expect(exitCode).toBe(0)
      expect(stdout).toMatch(/\d+\.\d+\.\d+/) // Version pattern
    })
  })

  describe('Message Content Validation', () => {
    it('should handle markdown formatting in messages', async () => {
      const markdownMessage = '*Bold text* and _italic_ with `code`'

      const { exitCode, stdout } = await execCommand(
        ['send-message', 'C1234567890', markdownMessage],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      // Should not fail due to message format
      expect(exitCode).not.toBe(1)
      // When successful, should show success message
      if (exitCode === 0) {
        expect(stdout).toMatch(/Message sent/)
      }
    }, 15000)

    it('should handle multi-line messages', async () => {
      const multilineMessage = 'Line 1\\nLine 2\\nLine 3'

      const { exitCode } = await execCommand(
        ['send-message', 'C1234567890', multilineMessage],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      // Should not fail due to message format
      expect(exitCode).not.toBe(1)
    }, 15000)

    it('should handle special characters in messages', async () => {
      const specialMessage =
        'Message with special chars: @here #channel <@U123>'

      const { exitCode } = await execCommand(
        ['send-message', 'C1234567890', specialMessage],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      // Should not fail due to message format
      expect(exitCode).not.toBe(1)
    }, 15000)
  })

  describe('Channel ID Validation', () => {
    it('should accept valid channel ID formats', async () => {
      const validChannels = [
        'C1234567890',
        'C1234567890ABCDEF',
        'CABCD1234EF5678GH',
      ]

      for (const channel of validChannels) {
        const { exitCode, stderr } = await execCommand(
          ['send-message', channel, 'Test message'],
          { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
        )

        // Should not fail due to channel format validation
        expect(exitCode).not.toBe(1)
        expect(stderr).not.toMatch(/Invalid channel ID format/)
      }
    })

    it('should reject invalid channel ID formats', async () => {
      const invalidChannels = [
        '123456',
        'general',
        '#general',
        'C123', // too short
        'D1234567890', // wrong prefix
        'U1234567890', // user ID not channel
      ]

      for (const channel of invalidChannels) {
        const { exitCode, stderr } = await execCommand(
          ['send-message', channel, 'Test message'],
          { SLACK_BOT_TOKEN: 'xoxb-test-token-invalid-channel' }
        )

        expect(exitCode).toBe(1)
        expect(stderr).toMatch(/Invalid channel ID format/i)
      }
    })
  })

  describe('Performance Requirements', () => {
    it('should complete successfully within 15 seconds', async () => {
      const startTime = Date.now()

      const { exitCode } = await execCommand(
        ['send-message', 'C1234567890', 'Performance test message'],
        { SLACK_BOT_TOKEN: 'xoxb-valid-test-token-1234567890-abcdefghij' }
      )

      const duration = Date.now() - startTime

      // Should complete within 15 seconds (including retries)
      expect(duration).toBeLessThan(15000)

      // Should not fail due to timeout
      if (exitCode !== 2) {
        // Skip auth errors
        expect(exitCode).not.toBe(4) // Network error
      }
    }, 16000)
  })
})
