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
import type { ChannelConfiguration } from '../../src/models/channel-configuration.js'
import type { NamedChannelList } from '../../src/models/named-channel-list.js'
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
        expect(config.channelLists).toHaveLength(2)
        const developmentList = config.channelLists.find(
          list => list.name === 'development'
        )
        expect(developmentList).toBeDefined()
        expect(developmentList!.channels).toHaveLength(3)
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
        // Clear any existing cache first
        yamlService.clearCache()

        // Load the configuration (should trigger file read)
        const config1 = await yamlService.loadConfiguration(
          './cached-config.yml'
        )

        // Check if it's cached
        expect(yamlService.isCached('./cached-config.yml')).toBe(true)

        // Load again - should return from cache
        const config2 = await yamlService.loadConfiguration(
          './cached-config.yml'
        )

        // Both should be the same instance (cached)
        expect(config1).toBe(config2)
      })

      it('should reload configuration if file has changed', async () => {
        // Clear cache first
        yamlService.clearCache()

        // Load configuration initially
        const config1 = await yamlService.loadConfiguration(
          './changed-config.yml'
        )
        expect(config1.channelLists).toHaveLength(1)

        // Simulate file change by clearing cache (representing file modification time change)
        yamlService.clearCache()

        // Load again - should reload from file
        const config2 = await yamlService.loadConfiguration(
          './changed-config.yml'
        )
        expect(config2.channelLists).toHaveLength(1)

        // Should be different instances due to reload
        expect(config1).not.toBe(config2)
      })
    })
  })

  describe('ConfigValidationService', () => {
    describe('validateChannelConfiguration', () => {
      it('should validate correct configuration', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: [
            {
              name: 'test-team',
              channels: [
                { identifier: '#general', type: 'name' },
                { identifier: 'C1234567890', type: 'id' },
              ],
            },
          ],
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject empty channel lists', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: [],
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
          channelLists: [
            {
              name: 'empty-list',
              channels: [],
            },
          ],
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
          channelLists: [
            {
              name: 'large-list',
              channels,
            },
          ],
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(
              /cannot.*contain.*more.*than.*100.*channels/
            ),
          })
        )
      })

      it('should validate channel identifiers', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: [
            {
              name: 'test-list',
              channels: [
                { identifier: 'invalid-channel-name', type: 'name' }, // Missing #
                { identifier: 'INVALID123', type: 'id' }, // Invalid ID format
              ],
            },
          ],
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })

      it('should reject duplicate list names', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: [
            {
              name: 'duplicate-name',
              channels: [{ identifier: '#general', type: 'name' }],
            },
            {
              name: 'duplicate-name', // Same name as above
              channels: [{ identifier: '#announcements', type: 'name' }],
            },
          ],
        }

        const result = validationService.validateChannelConfiguration(config)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringMatching(/duplicate.*channel.*list.*name/i),
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
            message: 'Message is required and must be a string',
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
            message: 'List name is required and must be a string',
          })
        )
      })

      it('should reject message that is too long', () => {
        const longMessage = 'x'.repeat(40001) // Limit is 40,000 characters

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
            message: 'Message cannot exceed 40,000 characters',
          })
        )
      })
    })

    describe('validateListNameExists', () => {
      it('should validate existing list name', () => {
        const config: ChannelConfiguration = {
          filePath: './test.yml',
          channelLists: [
            {
              name: 'existing-list',
              channels: [{ identifier: '#general', type: 'name' }],
            },
          ],
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
          channelLists: [
            {
              name: 'existing-list',
              channels: [{ identifier: '#general', type: 'name' }],
            },
          ],
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

      const channelLists: NamedChannelList[] = []
      for (let i = 0; i < 10; i++) {
        channelLists.push({
          name: `list-${i}`,
          channels,
        })
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
