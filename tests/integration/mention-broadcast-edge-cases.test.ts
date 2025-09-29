import { describe, it, expect } from 'vitest'
import path from 'path'
import { spawn } from 'child_process'

function runCli(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ exitCode: number; stdout: string; stderr: string }>(
    resolve => {
      const child = spawn(
        'npx',
        ['tsx', 'src/main.ts', 'broadcast', 'edge', ...args],
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

describe('integration: mention broadcast edge cases', () => {
  it('skips placeholders in excluded regions and handles built-ins', async () => {
    const configPath = path.join(
      process.cwd(),
      'tests/fixtures/mentions/channels.edge.yaml'
    )
    const messagePath = path.join(
      process.cwd(),
      'tests/fixtures/mentions/message.edge.md'
    )
    const { exitCode, stdout } = await runCli([
      '--config',
      configPath,
      '-F',
      messagePath,
      '--dry-run',
    ])
    expect(exitCode).toBe(0)
    // Only one team-lead replacement (end-of-line) plus two built-in here tokens
    expect(stdout).toMatch(/Replacements: here=2, team-lead=1 \(total=3\)/)
    // The punctuation adjacency case should remain unresolved literal '@team-lead,'
    expect(stdout).toMatch(/Unresolved: @team-lead,/)
  }, 25000)
})
