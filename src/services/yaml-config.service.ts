import fs from 'fs/promises'
import yaml from 'js-yaml'
import type { ChannelConfiguration } from '../models/channel-configuration'
import type { MentionMapping } from '../models/mention-mapping'
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

      let parsedYaml: any
      try {
        parsedYaml = yaml.load(fileContent)
      } catch (yamlError) {
        if (yamlError instanceof Error) {
          throw new Error(`Invalid YAML syntax: ${yamlError.message}`)
        }
        throw new Error('Failed to parse YAML file')
      }

      if (!parsedYaml || typeof parsedYaml !== 'object') {
        throw new Error('Configuration file must contain a valid YAML object')
      }

      // Validate required structure (channel_lists still required)
      if (!parsedYaml.channel_lists) {
        throw new Error(
          'Configuration file must contain a "channel_lists" section'
        )
      }

      if (!Array.isArray(parsedYaml.channel_lists)) {
        throw new Error(
          'Configuration "channel_lists" must be an array of channel list objects'
        )
      }

      if (parsedYaml.channel_lists.length === 0) {
        throw new Error('Configuration must contain at least one channel list')
      }

      // Transform raw YAML to typed configuration
      const channelLists: NamedChannelList[] = []
      const seenListNames = new Set<string>()

      for (let i = 0; i < parsedYaml.channel_lists.length; i++) {
        const listItem = parsedYaml.channel_lists[i]

        if (!listItem || typeof listItem !== 'object') {
          throw new Error(`Channel list at index ${i} must be an object`)
        }

        if (!listItem.name || typeof listItem.name !== 'string') {
          throw new Error(
            `Channel list at index ${i} must have a "name" property`
          )
        }

        if (listItem.name.trim().length === 0) {
          throw new Error(`Channel list name at index ${i} cannot be empty`)
        }

        if (seenListNames.has(listItem.name)) {
          throw new Error(`Duplicate channel list name: "${listItem.name}"`)
        }
        seenListNames.add(listItem.name)

        if (!listItem.channels || !Array.isArray(listItem.channels)) {
          throw new Error(
            `Channel list "${listItem.name}" must have a "channels" array`
          )
        }

        if (listItem.channels.length === 0) {
          throw new Error(`Channel list "${listItem.name}" cannot be empty`)
        }

        if (listItem.channels.length > 100) {
          throw new Error(
            `Channel list "${listItem.name}" cannot contain more than 100 channels`
          )
        }

        const channels: ChannelTarget[] = listItem.channels.map(
          (channel: any, index: number) => {
            if (typeof channel !== 'string') {
              throw new Error(
                `Channel at index ${index} in list "${listItem.name}" must be a string`
              )
            }

            return this.parseChannelIdentifier(channel, listItem.name, index)
          }
        )

        // Check for duplicates within the list
        const identifiers = new Set()
        for (const channel of channels) {
          if (identifiers.has(channel.identifier)) {
            throw new Error(
              `Duplicate channel "${channel.identifier}" in list "${listItem.name}"`
            )
          }
          identifiers.add(channel.identifier)
        }

        channelLists.push({
          name: listItem.name,
          channels,
        })
      }

      // Parse optional mentions mapping (root-level 'mentions')
      let mentions: MentionMapping | undefined
      if (parsedYaml.mentions && typeof parsedYaml.mentions === 'object') {
        mentions = {}
        for (const [key, value] of Object.entries(parsedYaml.mentions)) {
          if (!key || typeof key !== 'string') continue
          if (value && typeof value === 'object') {
            const id = (value as any).id
            const typeRaw = (value as any).type
            if (typeof id === 'string' && id.trim().length > 0) {
              const type = typeRaw === 'team' ? 'team' : 'user'
              mentions[key] = { id: id.trim(), type }
            }
          } else if (typeof value === 'string') {
            // Future-backcompat: plain string value means user id
            if (value.trim().length > 0) {
              mentions[key] = { id: value.trim(), type: 'user' }
            }
          }
        }
        if (Object.keys(mentions).length === 0) {
          mentions = undefined
        }
      }

      const configuration: ChannelConfiguration = {
        channelLists,
        mentions,
        filePath,
        lastModified,
      }

      // Cache the configuration
      this.configCache.set(filePath, configuration)
      this.lastModifiedCache.set(filePath, lastModified)

      return configuration
    } catch (error) {
      if (error instanceof Error) {
        // File system errors
        if (error.message.includes('ENOENT')) {
          throw new Error(`Configuration file not found: ${filePath}`)
        }
        if (error.message.includes('EACCES')) {
          throw new Error(
            `Permission denied reading configuration file: ${filePath}`
          )
        }
        if (error.message.includes('EISDIR')) {
          throw new Error(
            `Configuration path is a directory, not a file: ${filePath}`
          )
        }

        // Re-throw validation and parsing errors as-is
        if (
          error.message.includes('Invalid YAML') ||
          error.message.includes('Configuration') ||
          error.message.includes('Channel list') ||
          error.message.includes('Duplicate') ||
          error.message.includes('Invalid channel')
        ) {
          throw error
        }
      }

      // Unexpected errors
      throw new Error(
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
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
    if (typeof identifier !== 'string') {
      throw new Error(
        `Channel identifier at index ${index} in list "${listName}" must be a string, got ${typeof identifier}`
      )
    }

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

      if (channelName.length > 80) {
        throw new Error(
          `Invalid channel name "${trimmed}" at index ${index} in list "${listName}" - name too long (max 80 characters)`
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
    return config.channelLists.find(list => list.name === listName) || null
  }

  /**
   * Get all available channel list names
   */
  async getChannelListNames(filePath: string): Promise<string[]> {
    const config = await this.loadConfiguration(filePath)
    return config.channelLists.map(list => list.name)
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
    return config.channelLists.reduce(
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

    for (const list of config.channelLists) {
      for (const channel of list.channels) {
        uniqueChannels.set(channel.identifier, channel)
      }
    }

    return Array.from(uniqueChannels.values())
  }
}
