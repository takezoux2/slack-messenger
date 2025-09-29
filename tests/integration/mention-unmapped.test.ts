import { describe, it, expect } from 'vitest'
import path from 'path'
import { spawn } from 'child_process'

function runCli(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ exitCode: number; stdout: string; stderr: string }>(
    resolve => {
      const child = spawn(
        'npx',
        ['tsx', 'src/main.ts', 'broadcast', 'basic', ...args],
        {
          env: { ...process.env, ...env },
          stdio: 'pipe',
          shell: true,
        }
      )
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', d => (stdout += d.toString()))
      child.stderr.on('data', d => (stderr += d.toString()))
      child.on('close', code =>
        resolve({ exitCode: code ?? 0, stdout, stderr })
      )
    }
  )
}

describe('integration: mention unmapped placeholders summary (T028)', () => {
  it('leaves unmapped tokens literal and lists them as unresolved', async () => {
    const configPath = path.join(
      process.cwd(),
      'tests/fixtures/mentions/channels.basic.yaml'
    )
    const messagePath = path.join(
      process.cwd(),
      'tests/fixtures/mentions/message.unmapped.md'
    )
    const { exitCode, stdout } = await runCli([
      '--config',
      configPath,
      '-F',
      messagePath,
      '--dry-run',
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/Replacements: alice=1 \(total=1\)/)
    expect(stdout).toMatch(/Unresolved: @{ghost}, @unknown/)
  }, 25000)
})
