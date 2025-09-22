import { describe, it, expect, beforeEach } from 'vitest'
import { Configuration } from '../../src/models/configuration.js'

describe('Configuration Entity', () => {
  let config: Configuration

  beforeEach(() => {
    // This will fail initially because Configuration doesn't exist
    config = new Configuration('>=21.0.0', true, 'vitest', 'dist')
  })

  describe('constructor', () => {
    it('should create instance with valid properties', () => {
      expect(config.nodeVersion).toBe('>=21.0.0')
      expect(config.strict).toBe(true)
      expect(config.testFramework).toBe('vitest')
      expect(config.buildTarget).toBe('dist')
    })

    it('should throw error for Node.js version below 21', () => {
      expect(() => {
        new Configuration('>=20.0.0', true, 'vitest', 'dist')
      }).toThrow('nodeVersion must specify Node.js 21 or higher')
    })

    it('should throw error when strict mode is false', () => {
      expect(() => {
        new Configuration('>=21.0.0', false, 'vitest', 'dist')
      }).toThrow('strict must be true (constitutional requirement)')
    })

    it('should throw error for non-vitest test framework', () => {
      expect(() => {
        new Configuration('>=21.0.0', true, 'jest', 'dist')
      }).toThrow('testFramework must be "vitest"')
    })

    it('should throw error for non-dist build target', () => {
      expect(() => {
        new Configuration('>=21.0.0', true, 'vitest', 'build')
      }).toThrow('buildTarget must be "dist"')
    })
  })

  describe('validation', () => {
    it('should validate Node.js version format', () => {
      // This will fail initially because validation logic doesn't exist
      expect(config.isValidNodeVersion()).toBe(true)
    })

    it('should reject invalid version formats', () => {
      // Test that invalid version format throws error in constructor
      expect(() => {
        new Configuration('21', true, 'vitest', 'dist')
      }).toThrow('nodeVersion must specify Node.js 21 or higher')
    })

    it('should validate constitutional compliance', () => {
      // This will fail initially because validation logic doesn't exist
      expect(config.isConstitutionallyCompliant()).toBe(true)
    })
  })

  describe('static factory methods', () => {
    it('should create default configuration', () => {
      // This will fail initially because static method doesn't exist
      const defaultConfig = Configuration.createDefault()
      expect(defaultConfig.nodeVersion).toBe('>=21.0.0')
      expect(defaultConfig.strict).toBe(true)
      expect(defaultConfig.testFramework).toBe('vitest')
      expect(defaultConfig.buildTarget).toBe('dist')
    })
  })
})
