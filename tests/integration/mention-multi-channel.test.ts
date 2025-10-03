import { describe, it, expect } from 'vitest'
import path from 'path'
import { spawn } from 'child_process'

function runCli(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ exitCode: number; stdout: string; stderr: string }>(
    resolve => {
      const child = spawn(
        'npx',
        ['tsx', 'src/main.ts', 'broadcast', 'multi', ...args],
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

describe('integration: mention broadcast multi-channel mapping reuse (T027)', () => {
  it('applies same mapping across multiple channels producing identical replacements', async () => {
    const configPath = path.join(
      process.cwd(),
      'tests/fixtures/mentions/channels.multi.yaml'
    )
    const messagePath = path.join(
      process.cwd(),
      'tests/fixtures/mentions/message.basic.md'
    )
    const { exitCode, stdout } = await runCli([
      '--config',
      configPath,
      '-F',
      messagePath,
      '--dry-run',
    ])
    expect(exitCode).toBe(0)
    // Should still show 2 replacements (alice + team-lead) independent of channel count
    expect(stdout).toMatch(/Replacements: alice=1, team-lead=1 \(total=2\)/)
  }, 25000)
})
