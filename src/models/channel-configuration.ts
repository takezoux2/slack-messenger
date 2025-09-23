import type { NamedChannelList } from './named-channel-list'

/**
 * Configuration structure representing the complete YAML configuration file
 */
export interface ChannelConfiguration {
  /** Map of list names to channel lists */
  channelLists: Record<string, NamedChannelList>

  /** Path to the configuration file */
  filePath: string

  /** Configuration file modification time */
  lastModified?: Date
}

/**
 * Validation rules for ChannelConfiguration:
 * - Must contain at least one named channel list
 * - Channel list names must be non-empty strings
 * - File path must exist and be readable
 * - YAML must be valid and parseable
 */
