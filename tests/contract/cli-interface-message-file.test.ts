import { describe, it, expect } from 'vitest'
import { spawn } from 'child_process'
import { writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('CLI Interface Contract — --message-file', () => {
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

  it('help text should mention -F, --message-file', async () => {
    const { stdout, exitCode } = await execCommand(['send-message', '--help'])
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/--message-file|\-F, --message-file/i)
  })

  it('should error when both inline message and --message-file are provided', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'sm-'))
    const filePath = join(tempDir, 'msg.md')
    writeFileSync(filePath, 'Hello from file')

    const { stderr, exitCode } = await execCommand([
      'send-message',
      'C1234567890',
      'Hello inline',
      '--message-file',
      filePath,
    ])

    expect(exitCode).toBe(1)
    expect(stderr).toMatch(/either.*message.*or.*--message-file.*not both/i)
  })

  it('should accept only --message-file without positional message', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'sm-'))
    const filePath = join(tempDir, 'msg.md')
    writeFileSync(filePath, 'Hello from file')

    const { stderr, exitCode } = await execCommand([
      'send-message',
      'C1234567890',
      '--message-file',
      filePath,
    ])

    // Should not be invalid-args (1). Likely 2 for missing token in test env.
    expect(exitCode).not.toBe(1)
    // And should not complain about missing message since file is provided
    expect(stderr).not.toMatch(/missing.*message|message cannot be empty/i)
  })
})
