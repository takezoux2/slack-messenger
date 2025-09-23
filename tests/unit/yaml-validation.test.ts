/**
 * Unit Tests: YAML Configuration Validation
 *
 * Tests the YAML configuration loading and validation logic for broadcast
 * message functionality. Validates parsing, error handling, and configuration
 * structure verification.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { YamlConfigService } from '../../src/services/yaml-config.service.js'
import { ConfigValidationService } from '../../src/services/config-validation.service.js'
import type { ChannelConfiguration } from '../../src/models/channel-configuration'
import fs from 'fs'

describe('YAML Configuration Validation', () => {
  let yamlService: YamlConfigService
  let validationService: ConfigValidationService

  beforeEach(() => {
    yamlService = new YamlConfigService()
    validationService = new ConfigValidationService()
  })

  describe('YamlConfigService', () => {
    describe('loadConfiguration', () => {
      it('should load valid YAML configuration', async () => {
        const config = await yamlService.loadConfiguration('./test-config.yml')

        expect(config).toBeDefined()
        expect(config.channelLists).toBeDefined()
        expect(Object.keys(config.channelLists)).toHaveLength(2)
        expect(config.channelLists['development']).toBeDefined()
        expect(config.channelLists['development'].channels).toHaveLength(3)
        expect(config.filePath).toBe('./test-config.yml')
      })

      it('should throw error for invalid YAML syntax', async () => {
        await expect(
          yamlService.loadConfiguration('./invalid-config.yml')
        ).rejects.toThrow(/YAML/)
      })

      it('should throw error for non-existent file', async () => {
        await expect(
          yamlService.loadConfiguration('./non-existent-file.yml')
        ).rejects.toThrow(/not found/)
      })

      it('should handle configuration without channel_lists', async () => {
        await expect(
          yamlService.loadConfiguration('./no-channels.yml')
        ).rejects.toThrow(/channel_lists/)
      })
    })

    describe('caching', () => {
      it('should cache loaded configurations', async () => {
        const mockReadFile = vi.fn().mockReturnValue(`
channel_lists:
  test-team:
    - '#general'
        `)

        vi.doMock('fs', () => ({
          readFileSync: mockReadFile,
          existsSync: vi.fn().mockReturnValue(true),
          statSync: vi.fn().mockReturnValue({ mtime: new Date() }),
        }))

        // Load twice
        await yamlService.loadConfiguration('./cached-config.yml')
        await yamlService.loadConfiguration('./cached-config.yml')

        // Should only read file once due to caching
        expect(mockReadFile).toHaveBeenCalledTimes(1)
      })

      it('should reload configuration if file has changed', async () => {
        const mockReadFile = vi.fn().mockReturnValueOnce(`
channel_lists:
  test-team:
    - '#general'
          `).mockReturnValueOnce(`
channel_lists:
  test-team:
    - '#general'
    - '#updates'
          `)

        const oldDate = new Date('2023-01-01')
        const newDate = new Date('2023-01-02')

        vi.doMock('fs', () => ({
          readFileSync: mockReadFile,
          existsSync: vi.fn().mockReturnValue(true),
          statSync: vi
            .fn()
            .mockReturnValueOnce({ mtime: oldDate })
            .mockReturnValueOnce({ mtime: newDate }),
        }))

        // Load twice with different modification times
        const config1 = await yamlService.loadConfiguration(
          './changed-config.yml'
        )
        const config2 = await yamlService.loadConfiguration(
          './changed-config.yml'
        )

        expect(mockReadFile).toHaveBeenCalledTimes(2)
        expect(config1.channelLists['test-team'].channels).toHaveLength(1)
        expect(config2.channelLists['test-team'].channels).toHaveLength(2)
      })
    })
  })

  describe('ConfigValidationService', () => {
    describe('validateChannelConfiguration', () => {
      it('should validate correct configuration', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: {
            'test-team': {
              name: 'test-team',
              channels: [
                { identifier: '#general', type: 'name' },
                { identifier: 'C1234567890', type: 'id' },
              ],
            },
          },
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject empty channel lists', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: {},
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(/at least one channel list/),
          })
        )
      })

      it('should reject lists with empty channels', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: {
            'empty-list': {
              name: 'empty-list',
              channels: [],
            },
          },
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(/at least one channel/),
          })
        )
      })

      it('should reject lists with too many channels', () => {
        const channels = Array.from({ length: 101 }, (_, i) => ({
          identifier: `#channel-${i}`,
          type: 'name' as const,
        }))

        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: {
            'large-list': {
              name: 'large-list',
              channels,
            },
          },
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(/maximum.*100.*channels/),
          })
        )
      })

      it('should validate channel identifiers', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: {
            'test-list': {
              name: 'test-list',
              channels: [
                { identifier: 'invalid-channel-name', type: 'name' }, // Missing #
                { identifier: 'INVALID123', type: 'id' }, // Invalid ID format
              ],
            },
          },
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })

      it('should reject duplicate list names', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: {
            'duplicate-name': {
              name: 'duplicate-name',
              channels: [{ identifier: '#general', type: 'name' }],
            },
            'duplicate-name-2': {
              name: 'duplicate-name', // Same name as above
              channels: [{ identifier: '#announcements', type: 'name' }],
            },
          },
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(/duplicate.*list.*name/),
          })
        )
      })
    })

    describe('validateBroadcastOptions', () => {
      it('should validate correct broadcast options', () => {
        const options = {
          configPath: './config.yml',
          listName: 'test-team',
          message: 'Hello, team!',
          dryRun: false,
          verbose: true,
        }

        const result = validationService.validateBroadcastOptions(options)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject empty message', () => {
        const options = {
          configPath: './config.yml',
          listName: 'test-team',
          message: '',
          dryRun: false,
          verbose: false,
        }

        const result = validationService.validateBroadcastOptions(options)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(/message.*cannot.*be.*empty/),
          })
        )
      })

      it('should reject empty list name', () => {
        const options = {
          configPath: './config.yml',
          listName: '',
          message: 'Hello, team!',
          dryRun: false,
          verbose: false,
        }

        const result = validationService.validateBroadcastOptions(options)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(/list.*name.*cannot.*be.*empty/),
          })
        )
      })

      it('should reject message that is too long', () => {
        const longMessage = 'x'.repeat(4001) // Slack limit is ~4000 characters

        const options = {
          configPath: './config.yml',
          listName: 'test-team',
          message: longMessage,
          dryRun: false,
          verbose: false,
        }

        const result = validationService.validateBroadcastOptions(options)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(/message.*too.*long/),
          })
        )
      })
    })

    describe('validateListNameExists', () => {
      it('should validate existing list name', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: {
            'existing-list': {
              name: 'existing-list',
              channels: [{ identifier: '#general', type: 'name' }],
            },
          },
        }

        const result = validationService.validateListNameExists(
          config,
          'existing-list'
        )

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject non-existing list name', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: {
            'existing-list': {
              name: 'existing-list',
              channels: [{ identifier: '#general', type: 'name' }],
            },
          },
        }

        const result = validationService.validateListNameExists(
          config,
          'non-existing-list'
        )

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(
              /list.*"non-existing-list".*not.*found/
            ),
          })
        )
      })
    })
  })

  describe('Error Scenarios', () => {
    it('should handle malformed YAML gracefully', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn().mockReturnValue(`
channel_lists:
  test-team:
    - '#general'
    - invalid: yaml: [unclosed
        `),
        existsSync: vi.fn().mockReturnValue(true),
      }))

      await expect(
        yamlService.loadConfiguration('./malformed.yml')
      ).rejects.toThrow()
    })

    it('should provide helpful error messages for common mistakes', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn().mockReturnValue(`
# Missing channel_lists key
teams:
  dev-team:
    - '#general'
        `),
        existsSync: vi.fn().mockReturnValue(true),
      }))

      await expect(
        yamlService.loadConfiguration('./missing-key.yml')
      ).rejects.toThrow(/channel_lists/)
    })
  })

  describe('Performance', () => {
    it('should handle large configurations efficiently', () => {
      const channels = Array.from({ length: 99 }, (_, i) => ({
        identifier: `#channel-${i}`,
        type: 'name' as const,
      }))

      const channelLists: Record<string, any> = {}
      for (let i = 0; i < 10; i++) {
        channelLists[`list-${i}`] = {
          name: `list-${i}`,
          channels,
        }
      }

      const config: ChannelConfiguration = {
        filePath: './large-config.yml',
        channelLists,
      }

      const startTime = Date.now()
      const result = validationService.validateChannelConfiguration(config)
      const endTime = Date.now()

      expect(result.isValid).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})
