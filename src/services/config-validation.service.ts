import type { ChannelConfiguration } from '../models/channel-configuration'
import type { NamedChannelList } from '../models/named-channel-list'
import type { ChannelTarget } from '../models/channel-target'
import type { BroadcastOptions } from '../models/broadcast-options'
import type { SenderIdentityConfig } from '../models/sender-identity'

/**
 * Validation error details
 */
export interface ValidationError {
  field: string
  message: string
  value?: string | number | boolean | null | undefined | Date
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

/**
 * Service for validating configuration data
 */
export class ConfigValidationService {
  /**
   * Validate a complete channel configuration
   */
  validateChannelConfiguration(config: ChannelConfiguration): ValidationResult {
    const errors: ValidationError[] = []

    // Validate file path
    if (!config.filePath || typeof config.filePath !== 'string') {
      errors.push({
        field: 'filePath',
        message: 'File path is required and must be a string',
        value: config.filePath,
      })
    } else if (config.filePath.trim().length === 0) {
      errors.push({
        field: 'filePath',
        message: 'File path cannot be empty',
        value: config.filePath,
      })
    }

    // Validate channel lists exist and is array
    if (!Array.isArray(config.channelLists)) {
      errors.push({
        field: 'channelLists',
        message: 'Channel lists must be an array',
      })
    } else {
      // Validate we have at least one list
      if (config.channelLists.length === 0) {
        errors.push({
          field: 'channelLists',
          message: 'Configuration must contain at least one channel list',
        })
      }

      // Validate each channel list
      for (let i = 0; i < config.channelLists.length; i++) {
        const list = config.channelLists[i]
        if (list) {
          const listResult = this.validateNamedChannelList(
            list,
            `channelLists[${i}]`
          )
          errors.push(...listResult.errors)
        } else {
          errors.push({
            field: `channelLists[${i}]`,
            message: 'Channel list cannot be null or undefined',
          })
        }
      }

      // Check for duplicate list names
      const listNames = new Set<string>()
      for (let i = 0; i < config.channelLists.length; i++) {
        const list = config.channelLists[i]
        if (list && list.name) {
          if (listNames.has(list.name)) {
            errors.push({
              field: `channelLists[${i}].name`,
              message: `Duplicate channel list name: "${list.name}"`,
              value: list.name,
            })
          } else {
            listNames.add(list.name)
          }
        }
      }
    }

    // Validate last modified date if present
    if (config.lastModified !== undefined) {
      if (!(config.lastModified instanceof Date)) {
        errors.push({
          field: 'lastModified',
          message: 'Last modified must be a Date object',
          value: config.lastModified,
        })
      } else if (isNaN(config.lastModified.getTime())) {
        errors.push({
          field: 'lastModified',
          message: 'Last modified must be a valid Date',
          value: config.lastModified,
        })
      }
    }

    // Validate mentions mapping (T026)
    if (config.mentions !== undefined) {
      const mentions = config.mentions as Record<string, any>
      if (mentions && typeof mentions === 'object') {
        for (const [key, value] of Object.entries(mentions)) {
          const baseField = `mentions.${key}`
          if (!key || key.trim().length === 0) {
            errors.push({
              field: baseField,
              message: 'Mention key must be a non-empty string',
              value: key,
            })
            continue
          }
          if (!value || typeof value !== 'object') {
            errors.push({
              field: baseField,
              message:
                'Mention entry must be an object with at least an id property',
              value: value as any,
            })
            continue
          }
          if (
            !('id' in value) ||
            typeof (value as any).id !== 'string' ||
            (value as any).id.trim().length === 0
          ) {
            errors.push({
              field: `${baseField}.id`,
              message: 'Mention entry must contain non-empty string id',
              value: (value as any).id,
            })
          }
          if ('type' in value) {
            const t = (value as any).type
            if (t !== undefined && t !== 'user' && t !== 'team') {
              errors.push({
                field: `${baseField}.type`,
                message: 'Mention type, if provided, must be "user" or "team"',
                value: t,
              })
            }
          }
        }
      } else {
        errors.push({
          field: 'mentions',
          message: 'Mentions mapping must be an object',
          value: config.mentions as any,
        })
      }
    }

    if (config.senderIdentity !== undefined) {
      const senderIdentityErrors = this.validateSenderIdentity(
        config.senderIdentity as SenderIdentityConfig
      )
      errors.push(...senderIdentityErrors)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate a named channel list
   */
  validateNamedChannelList(
    list: NamedChannelList,
    contextName?: string
  ): ValidationResult {
    const errors: ValidationError[] = []
    const listContext = contextName || list.name || 'unknown'

    // Validate name
    if (!list.name || typeof list.name !== 'string') {
      errors.push({
        field: `${listContext}.name`,
        message: 'List name is required and must be a non-empty string',
        value: list.name,
      })
    } else if (list.name.trim().length === 0) {
      errors.push({
        field: `${listContext}.name`,
        message: 'List name cannot be empty or whitespace only',
        value: list.name,
      })
    }

    // Validate channels array
    if (!Array.isArray(list.channels)) {
      errors.push({
        field: `${listContext}.channels`,
        message: 'Channels must be an array',
      })
    } else {
      if (list.channels.length === 0) {
        errors.push({
          field: `${listContext}.channels`,
          message: 'Channel list must contain at least one channel',
        })
      }

      if (list.channels.length > 100) {
        errors.push({
          field: `${listContext}.channels`,
          message: 'Channel list cannot contain more than 100 channels',
          value: list.channels.length,
        })
      }

      // Validate each channel
      list.channels.forEach((channel, index) => {
        const channelValidation = this.validateChannelTarget(
          channel,
          `${listContext}.channels[${index}]`
        )
        errors.push(...channelValidation.errors)
      })
    }

    // Validate resolved channels if present
    if (list.resolvedChannels) {
      if (!Array.isArray(list.resolvedChannels)) {
        errors.push({
          field: `${listContext}.resolvedChannels`,
          message: 'Resolved channels must be an array',
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate a channel target
   */
  validateChannelTarget(
    target: ChannelTarget,
    contextPath?: string
  ): ValidationResult {
    const errors: ValidationError[] = []
    const context = contextPath || 'channelTarget'

    // Validate identifier
    if (!target.identifier || typeof target.identifier !== 'string') {
      errors.push({
        field: `${context}.identifier`,
        message: 'Channel identifier is required and must be a string',
        value: target.identifier,
      })
    } else {
      const trimmed = target.identifier.trim()
      if (trimmed.length === 0) {
        errors.push({
          field: `${context}.identifier`,
          message: 'Channel identifier cannot be empty',
          value: target.identifier,
        })
      } else {
        // Validate identifier format based on type
        if (target.type === 'name') {
          if (!trimmed.startsWith('#')) {
            errors.push({
              field: `${context}.identifier`,
              message: 'Channel name must start with #',
              value: target.identifier,
            })
          } else {
            const channelName = trimmed.slice(1)
            if (!/^[a-z0-9-_]+$/.test(channelName)) {
              errors.push({
                field: `${context}.identifier`,
                message:
                  'Channel name must contain only lowercase letters, numbers, hyphens, and underscores',
                value: target.identifier,
              })
            }
          }
        } else if (target.type === 'id') {
          if (!/^C[A-Z0-9]{10}$/i.test(trimmed)) {
            errors.push({
              field: `${context}.identifier`,
              message: 'Channel ID must match pattern C[A-Z0-9]{10}',
              value: target.identifier,
            })
          }
        }
      }
    }

    // Validate type
    if (!target.type || (target.type !== 'id' && target.type !== 'name')) {
      errors.push({
        field: `${context}.type`,
        message: 'Channel type must be either "id" or "name"',
        value: target.type,
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate broadcast options
   */
  validateBroadcastOptions(options: BroadcastOptions): ValidationResult {
    const errors: ValidationError[] = []

    // Validate config path
    if (!options.configPath || typeof options.configPath !== 'string') {
      errors.push({
        field: 'configPath',
        message: 'Config path is required and must be a string',
        value: options.configPath,
      })
    } else if (options.configPath.trim().length === 0) {
      errors.push({
        field: 'configPath',
        message: 'Config path cannot be empty',
        value: options.configPath,
      })
    }

    // Validate list name
    if (!options.listName || typeof options.listName !== 'string') {
      errors.push({
        field: 'listName',
        message: 'List name is required and must be a string',
        value: options.listName,
      })
    } else if (options.listName.trim().length === 0) {
      errors.push({
        field: 'listName',
        message: 'List name cannot be empty',
        value: options.listName,
      })
    }

    // Validate message
    if (!options.message || typeof options.message !== 'string') {
      errors.push({
        field: 'message',
        message: 'Message is required and must be a string',
        value: options.message,
      })
    } else {
      const trimmed = options.message.trim()
      if (trimmed.length === 0) {
        errors.push({
          field: 'message',
          message: 'Message cannot be empty or whitespace only',
          value: options.message,
        })
      } else if (trimmed.length > 40000) {
        errors.push({
          field: 'message',
          message: 'Message cannot exceed 40,000 characters',
          value: trimmed.length,
        })
      }
    }

    // Validate boolean flags
    if (typeof options.dryRun !== 'boolean') {
      errors.push({
        field: 'dryRun',
        message: 'Dry run must be a boolean',
        value: options.dryRun,
      })
    }

    if (typeof options.verbose !== 'boolean') {
      errors.push({
        field: 'verbose',
        message: 'Verbose must be a boolean',
        value: options.verbose,
      })
    }

    // Validate token if present
    if (options.token && typeof options.token !== 'string') {
      errors.push({
        field: 'token',
        message: 'Token must be a string',
        value: options.token,
      })
    } else if (options.token && options.token.trim().length === 0) {
      errors.push({
        field: 'token',
        message: 'Token cannot be empty if provided',
        value: options.token,
      })
    }

    if (options.senderName !== undefined) {
      if (typeof options.senderName !== 'string') {
        errors.push({
          field: 'senderName',
          message: 'Sender name override must be a string',
          value: options.senderName,
        })
      } else if (options.senderName.trim().length === 0) {
        errors.push({
          field: 'senderName',
          message: 'Sender name override cannot be empty',
          value: options.senderName,
        })
      }
    }

    if (options.senderIconEmoji && options.senderIconUrl) {
      errors.push({
        field: 'senderIconEmoji',
        message: 'Provide either senderIconEmoji or senderIconUrl, not both',
        value: options.senderIconEmoji,
      })
    }

    if (options.senderIconEmoji) {
      if (!/^:[^:\s]+:$/.test(options.senderIconEmoji.trim())) {
        errors.push({
          field: 'senderIconEmoji',
          message: 'senderIconEmoji must be in :shortcode: format',
          value: options.senderIconEmoji,
        })
      }
    }

    if (options.senderIconUrl) {
      if (!/^https:\/\//i.test(options.senderIconUrl.trim())) {
        errors.push({
          field: 'senderIconUrl',
          message: 'senderIconUrl must be an https URL',
          value: options.senderIconUrl,
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate that a list name exists in configuration
   */
  validateListNameExists(
    config: ChannelConfiguration,
    listName: string
  ): ValidationResult {
    const errors: ValidationError[] = []

    if (!config.channelLists.find(list => list.name === listName)) {
      const availableNames = config.channelLists.map(list => list.name)
      errors.push({
        field: 'listName',
        message: `Channel list "${listName}" not found. Available lists: ${availableNames.join(', ')}`,
        value: listName,
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get human-readable error summary
   */
  getErrorSummary(validation: ValidationResult): string {
    if (validation.isValid) {
      return 'No validation errors'
    }

    const errorCount = validation.errors.length
    const errorLines = validation.errors.map(
      error => `- ${error.field}: ${error.message}`
    )

    return `${errorCount} validation error${errorCount === 1 ? '' : 's'}:\n${errorLines.join('\n')}`
  }

  /**
   * Check if configuration has any channels that could be resolved
   */
  hasResolvableChannels(config: ChannelConfiguration): boolean {
    return config.channelLists.some(list => list.channels.length > 0)
  }

  /**
   * Get configuration statistics
   */
  getConfigurationStats(config: ChannelConfiguration): {
    totalLists: number
    totalChannels: number
    averageChannelsPerList: number
    channelsByType: { names: number; ids: number }
  } {
    const lists = config.channelLists
    const totalLists = lists.length
    const totalChannels = lists.reduce(
      (sum, list) => sum + list.channels.length,
      0
    )

    let nameCount = 0
    let idCount = 0
    for (const list of lists) {
      for (const channel of list.channels) {
        if (channel.type === 'name') nameCount++
        else if (channel.type === 'id') idCount++
      }
    }

    return {
      totalLists,
      totalChannels,
      averageChannelsPerList:
        totalLists > 0 ? Math.round((totalChannels / totalLists) * 10) / 10 : 0,
      channelsByType: { names: nameCount, ids: idCount },
    }
  }

  private validateSenderIdentity(
    identity: SenderIdentityConfig
  ): ValidationError[] {
    const errors: ValidationError[] = []
    const fieldBase = 'senderIdentity'

    const name =
      typeof identity.name === 'string' ? identity.name.trim() : undefined
    const iconEmoji =
      typeof identity.iconEmoji === 'string'
        ? identity.iconEmoji.trim()
        : undefined
    const iconUrl =
      typeof identity.iconUrl === 'string' ? identity.iconUrl.trim() : undefined

    if (!name) {
      errors.push({
        field: `${fieldBase}.name`,
        message: 'Sender identity must include a non-empty name',
        value: identity.name ?? null,
      })
    }

    if (iconEmoji && iconUrl) {
      errors.push({
        field: `${fieldBase}.iconEmoji`,
        message: 'Specify either iconEmoji or iconUrl, not both',
        value: iconEmoji,
      })
    }

    if (!iconEmoji && !iconUrl) {
      errors.push({
        field: `${fieldBase}.icon`,
        message: 'Sender identity must include an icon emoji or icon URL',
      })
    }

    if (iconEmoji && !/^:[^:\s]+:$/.test(iconEmoji)) {
      errors.push({
        field: `${fieldBase}.iconEmoji`,
        message: 'Sender identity iconEmoji must be in :shortcode: format',
        value: iconEmoji,
      })
    }

    if (iconUrl && !/^https:\/\//i.test(iconUrl)) {
      errors.push({
        field: `${fieldBase}.iconUrl`,
        message: 'Sender identity iconUrl must be an https URL',
        value: iconUrl,
      })
    }

    if (
      identity.allowDefaultIdentity !== undefined &&
      typeof identity.allowDefaultIdentity !== 'boolean'
    ) {
      errors.push({
        field: `${fieldBase}.allowDefaultIdentity`,
        message: 'allowDefaultIdentity must be a boolean when provided',
        value: identity.allowDefaultIdentity,
      })
    }

    return errors
  }
}
