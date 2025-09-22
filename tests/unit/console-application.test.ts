import { describe, it, expect, beforeEach } from 'vitest'
import { ConsoleApplication } from '../../src/models/console-application.js'

describe('ConsoleApplication Entity', () => {
  let app: ConsoleApplication

  beforeEach(() => {
    // This will fail initially because ConsoleApplication doesn't exist
    app = new ConsoleApplication(
      'slack-messenger',
      '1.0.0',
      'src/main.ts',
      'dist'
    )
  })

  describe('constructor', () => {
    it('should create instance with valid properties', () => {
      expect(app.name).toBe('slack-messenger')
      expect(app.version).toBe('1.0.0')
      expect(app.entryPoint).toBe('src/main.ts')
      expect(app.outputDir).toBe('dist')
    })

    it('should throw error for empty name', () => {
      expect(() => {
        new ConsoleApplication('', '1.0.0', 'src/main.ts', 'dist')
      }).toThrow('name must be non-empty string')
    })

    it('should throw error for invalid version format', () => {
      expect(() => {
        new ConsoleApplication('test', 'invalid', 'src/main.ts', 'dist')
      }).toThrow('version must follow semantic versioning format')
    })
  })

  describe('state transitions', () => {
    it('should start in INITIALIZED state', () => {
      expect(app.state).toBe('INITIALIZED')
    })

    it('should transition from INITIALIZED to COMPILED', () => {
      app.compile()
      expect(app.state).toBe('COMPILED')
    })

    it('should transition from COMPILED to RUNNING', () => {
      app.compile()
      app.run()
      expect(app.state).toBe('RUNNING')
    })

    it('should transition from RUNNING to COMPLETED', () => {
      app.compile()
      app.run()
      app.complete()
      expect(app.state).toBe('COMPLETED')
    })

    it('should throw error for invalid state transition', () => {
      expect(() => {
        app.run() // Can't run from INITIALIZED
      }).toThrow('Cannot transition from INITIALIZED to RUNNING')
    })
  })

  describe('validation', () => {
    it('should validate entry point exists', () => {
      // This will fail initially because validation logic doesn't exist
      expect(() => {
        app.validateEntryPoint()
      }).not.toThrow()
    })

    it('should validate output directory is writable', () => {
      // This will fail initially because validation logic doesn't exist
      expect(() => {
        app.validateOutputDir()
      }).not.toThrow()
    })
  })
})
