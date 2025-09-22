import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

describe('CLI Interface Contract', () => {
  const projectRoot = process.cwd()
  const distPath = join(projectRoot, 'dist')
  const mainJsPath = join(distPath, 'main.js')

  it('should build successfully with yarn build', () => {
    // This test will fail initially because src/main.ts doesn't exist
    expect(() => {
      execSync('yarn build', {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
      })
    }).not.toThrow()

    // Verify build outputs exist
    expect(existsSync(distPath)).toBe(true)
    expect(existsSync(mainJsPath)).toBe(true)
    expect(existsSync(join(distPath, 'main.js.map'))).toBe(true)
    expect(existsSync(join(distPath, 'main.d.ts'))).toBe(true)
  })

  it('should output "hello world" when executed with yarn start', () => {
    // This test will fail initially because main.ts doesn't output hello world
    const output = execSync('yarn start', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    })

    expect(output.trim()).toBe('hello world')
  })

  it('should exit with code 0 on successful execution', () => {
    // This test will fail initially because main.ts doesn't exist
    expect(() => {
      execSync('yarn start', {
        cwd: projectRoot,
        stdio: 'pipe',
      })
    }).not.toThrow()
  })

  it('should have Node.js 21+ requirement in package.json', () => {
    const packageJson = require(join(projectRoot, 'package.json'))
    expect(packageJson.engines.node).toBe('>=21.0.0')
  })

  it('should build in under 5 seconds (performance contract)', () => {
    const start = Date.now()

    execSync('yarn build', {
      cwd: projectRoot,
      stdio: 'pipe',
    })

    const buildTime = Date.now() - start
    expect(buildTime).toBeLessThan(5000) // 5 seconds
  })
})
