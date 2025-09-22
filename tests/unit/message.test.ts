import { describe, it, expect, beforeEach } from 'vitest'
import { Message, MessageLevel } from '../../src/models/message.js'

describe('Message Entity', () => {
  let message: Message
  const testDate = new Date('2024-01-01T00:00:00.000Z')

  beforeEach(() => {
    // This will fail initially because Message doesn't exist
    message = new Message('hello world', testDate, MessageLevel.INFO)
  })

  describe('constructor', () => {
    it('should create instance with valid properties', () => {
      expect(message.content).toBe('hello world')
      expect(message.timestamp).toEqual(testDate)
      expect(message.level).toBe(MessageLevel.INFO)
    })

    it('should throw error for empty content', () => {
      expect(() => {
        new Message('', testDate, MessageLevel.INFO)
      }).toThrow('content must be non-empty string')
    })

    it('should throw error for invalid timestamp', () => {
      expect(() => {
        new Message('test', new Date('invalid'), MessageLevel.INFO)
      }).toThrow('timestamp must be valid Date object')
    })

    it('should throw error for invalid message level', () => {
      expect(() => {
        // @ts-expect-error Testing invalid enum value
        new Message('test', testDate, 'INVALID')
      }).toThrow('level must be valid MessageLevel enum value')
    })
  })

  describe('MessageLevel enum', () => {
    it('should have INFO level', () => {
      // This will fail initially because MessageLevel doesn't exist
      expect(MessageLevel.INFO).toBe('info')
    })

    it('should have ERROR level', () => {
      expect(MessageLevel.ERROR).toBe('error')
    })

    it('should have DEBUG level', () => {
      expect(MessageLevel.DEBUG).toBe('debug')
    })
  })

  describe('message formatting', () => {
    it('should format message with timestamp and level', () => {
      // This will fail initially because formatting method doesn't exist
      const formatted = message.format()
      expect(formatted).toContain('hello world')
      expect(formatted).toContain('[INFO]')
      expect(formatted).toContain('2024-01-01')
    })

    it('should format different levels correctly', () => {
      const errorMessage = new Message(
        'error occurred',
        testDate,
        MessageLevel.ERROR
      )
      const formatted = errorMessage.format()
      expect(formatted).toContain('[ERROR]')
    })
  })

  describe('static factory methods', () => {
    it('should create info message', () => {
      // This will fail initially because static method doesn't exist
      const infoMsg = Message.info('info message')
      expect(infoMsg.level).toBe(MessageLevel.INFO)
      expect(infoMsg.content).toBe('info message')
    })

    it('should create error message', () => {
      const errorMsg = Message.error('error message')
      expect(errorMsg.level).toBe(MessageLevel.ERROR)
      expect(errorMsg.content).toBe('error message')
    })

    it('should create debug message', () => {
      const debugMsg = Message.debug('debug message')
      expect(debugMsg.level).toBe(MessageLevel.DEBUG)
      expect(debugMsg.content).toBe('debug message')
    })
  })

  describe('validation', () => {
    it('should validate content length', () => {
      // This will fail initially because validation doesn't exist
      expect(message.isValidContent()).toBe(true)
    })

    it('should handle special characters in content', () => {
      const specialMessage = new Message(
        'Hello 🌍 World!',
        testDate,
        MessageLevel.INFO
      )
      expect(specialMessage.isValidContent()).toBe(true)
    })
  })
})
