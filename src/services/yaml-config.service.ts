import fs from 'fs/promises'
import yaml from 'js-yaml'
import type { ChannelConfiguration } from '../models/channel-configuration'
import type { NamedChannelList } from '../models/named-channel-list'
import type { ChannelTarget } from '../models/channel-target'

/**
 * Service for loading and parsing YAML configuration files
 */
export class YamlConfigService {
  private configCache = new Map<string, ChannelConfiguration>()
  private lastModifiedCache = new Map<string, Date>()

  /**
   * Load configuration from YAML file
   */
  async loadConfiguration(filePath: string): Promise<ChannelConfiguration> {
    try {
      // Check if file has been modified since last load
      const fileStats = await fs.stat(filePath)
      const lastModified = fileStats.mtime

      const cachedModified = this.lastModifiedCache.get(filePath)
      if (cachedModified && lastModified <= cachedModified) {
        const cached = this.configCache.get(filePath)
        if (cached) {
          return cached
        }
      }

      // Read and parse YAML file
      const fileContent = await fs.readFile(filePath, 'utf8')
      const parsedYaml = yaml.load(fileContent) as any

      if (!parsedYaml || typeof parsedYaml !== 'object') {
        throw new Error('Configuration file must contain a valid YAML object')
      }

      // Validate required structure
      if (!parsedYaml.channel_lists) {
        throw new Error(
          'Configuration file must contain a "channel_lists" section'
        )
      }

      // Transform raw YAML to typed configuration
      const channelLists: Record<string, NamedChannelList> = {}

      for (const [listName, rawChannels] of Object.entries(
        parsedYaml.channel_lists
      )) {
        if (!Array.isArray(rawChannels)) {
          throw new Error(`Channel list "${listName}" must be an array`)
        }

        if (rawChannels.length === 0) {
          throw new Error(`Channel list "${listName}" cannot be empty`)
        }

        if (rawChannels.length > 100) {
          throw new Error(
            `Channel list "${listName}" cannot contain more than 100 channels`
          )
        }

        const channels: ChannelTarget[] = rawChannels.map((channel, index) => {
          if (typeof channel !== 'string') {
            throw new Error(
              `Channel at index ${index} in list "${listName}" must be a string`
            )
          }

          return this.parseChannelIdentifier(channel, listName, index)
        })

        // Check for duplicates within the list
        const identifiers = new Set()
        for (const channel of channels) {
          if (identifiers.has(channel.identifier)) {
            throw new Error(
              `Duplicate channel "${channel.identifier}" in list "${listName}"`
            )
          }
          identifiers.add(channel.identifier)
        }

        channelLists[listName] = {
          name: listName,
          channels,
        }
      }

      const configuration: ChannelConfiguration = {
        channelLists,
        filePath,
        lastModified,
      }

      // Cache the configuration
      this.configCache.set(filePath, configuration)
      this.lastModifiedCache.set(filePath, lastModified)

      return configuration
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Configuration file not found: ${filePath}`)
        }
        if (error.message.includes('EACCES')) {
          throw new Error(
            `Permission denied reading configuration file: ${filePath}`
          )
        }
      }
      throw error
    }
  }

  /**
   * Parse and validate a channel identifier
   */
  private parseChannelIdentifier(
    identifier: string,
    listName: string,
    index: number
  ): ChannelTarget {
    const trimmed = identifier.trim()

    if (!trimmed) {
      throw new Error(
        `Empty channel identifier at index ${index} in list "${listName}"`
      )
    }

    // Channel name format: starts with # followed by valid characters
    if (trimmed.startsWith('#')) {
      const channelName = trimmed.slice(1)
      if (!channelName) {
        throw new Error(
          `Invalid channel name "${trimmed}" at index ${index} in list "${listName}" - missing name after #`
        )
      }

      // Validate channel name format (lowercase letters, numbers, hyphens, underscores)
      if (!/^[a-z0-9-_]+$/.test(channelName)) {
        throw new Error(
          `Invalid channel name "${trimmed}" at index ${index} in list "${listName}" - must contain only lowercase letters, numbers, hyphens, and underscores`
        )
      }

      return {
        identifier: trimmed,
        type: 'name',
      }
    }

    // Channel ID format: C followed by 10 alphanumeric characters
    if (/^C[A-Z0-9]{10}$/i.test(trimmed)) {
      return {
        identifier: trimmed.toUpperCase(), // Normalize to uppercase
        type: 'id',
      }
    }

    throw new Error(
      `Invalid channel identifier "${trimmed}" at index ${index} in list "${listName}" - must be a channel name starting with # or a channel ID like C1234567890`
    )
  }

  /**
   * Get a specific named channel list from configuration
   */
  async getChannelList(
    filePath: string,
    listName: string
  ): Promise<NamedChannelList | null> {
    const config = await this.loadConfiguration(filePath)
    return config.channelLists[listName] || null
  }

  /**
   * Get all available channel list names
   */
  async getChannelListNames(filePath: string): Promise<string[]> {
    const config = await this.loadConfiguration(filePath)
    return Object.keys(config.channelLists)
  }

  /**
   * Check if a configuration file exists and is readable
   */
  async validateConfigurationFile(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.R_OK)
    } catch (error) {
      throw new Error(`Configuration file is not accessible: ${filePath}`)
    }
  }

  /**
   * Clear configuration cache (useful for testing)
   */
  clearCache(): void {
    this.configCache.clear()
    this.lastModifiedCache.clear()
  }

  /**
   * Get configuration cache size (useful for monitoring)
   */
  getCacheSize(): number {
    return this.configCache.size
  }

  /**
   * Check if configuration is cached
   */
  isCached(filePath: string): boolean {
    return this.configCache.has(filePath)
  }

  /**
   * Get total number of channels across all lists in configuration
   */
  async getTotalChannelCount(filePath: string): Promise<number> {
    const config = await this.loadConfiguration(filePath)
    return Object.values(config.channelLists).reduce(
      (total, list) => total + list.channels.length,
      0
    )
  }

  /**
   * Get unique channels across all lists (deduplicated by identifier)
   */
  async getUniqueChannels(filePath: string): Promise<ChannelTarget[]> {
    const config = await this.loadConfiguration(filePath)
    const uniqueChannels = new Map<string, ChannelTarget>()

    for (const list of Object.values(config.channelLists)) {
      for (const channel of list.channels) {
        uniqueChannels.set(channel.identifier, channel)
      }
    }

    return Array.from(uniqueChannels.values())
  }
}
