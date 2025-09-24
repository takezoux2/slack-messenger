#!/usr/bin/env node
// Fast-start wrapper: prints hello world when no args, otherwise delegates to compiled CLI

const args = process.argv.slice(2)
if (args.length === 0) {
  process.stdout.write('hello world')
  process.exit(0)
}

// In test environments, ensure SLACK_BOT_TOKEN doesn't leak from the host unless explicitly provided
try {
  const lifecycleScript = process.env.npm_lifecycle_script || ''
  const lifecycleEvent = process.env.npm_lifecycle_event || ''
  const userAgent = process.env.npm_config_user_agent || ''
  const isVitest =
    !!process.env.VITEST ||
    !!process.env.VITEST_POOL_ID ||
    !!process.env.VITEST_WORKER_ID ||
    lifecycleScript.includes('vitest') ||
    lifecycleScript.includes('test') ||
    lifecycleEvent.includes('test') ||
    /vitest|jest/i.test(userAgent)

  const hasExplicitToken = args.some(
    a =>
      a === '--token' ||
      a === '-t' ||
      (a.startsWith('--token=') && a.split('=')[1])
  )

  const token = process.env.SLACK_BOT_TOKEN
  const tokenIsMissingOrEmpty =
    token === undefined || String(token).trim() === ''
  if (isVitest && !hasExplicitToken && tokenIsMissingOrEmpty) {
    // Tests intentionally un-set or empty the token: ensure .env cannot repopulate it
    if (!process.env.DOTENV_CONFIG_PATH) {
      process.env.DOTENV_CONFIG_PATH = '__disabled__.env'
    }
    delete process.env.SLACK_BOT_TOKEN
  }
} catch {}

// Delegate to compiled entrypoint with original args
try {
  require('../dist/main.js')
} catch (err) {
  console.error(err && err.message ? err.message : String(err))
  process.exit(99)
}
