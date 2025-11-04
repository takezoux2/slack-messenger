/**
 * Sender Identity Models
 *
 * Represents the configured and resolved sender identity that can be applied
 * to Slack messages. The identity consists of a display name plus either an
 * emoji icon or image URL.
 */

export type SenderIdentitySource = 'config' | 'cli'

/**
 * Raw sender identity as defined in configuration files.
 */
export interface SenderIdentityConfig {
  name?: string | null
  iconEmoji?: string | null
  iconUrl?: string | null
  allowDefaultIdentity?: boolean | null
}

/**
 * Runtime overrides coming from CLI flags.
 */
export interface SenderIdentityOverrides {
  name?: string | undefined
  iconEmoji?: string | undefined
  iconUrl?: string | undefined
}

/**
 * Resolved sender identity that will be applied to Slack API requests.
 */
export interface ResolvedSenderIdentity {
  name?: string
  iconEmoji?: string
  iconUrl?: string
  source: SenderIdentitySource
}

/**
 * Result of merging configuration and overrides.
 */
export interface SenderIdentityResolution {
  identity?: ResolvedSenderIdentity
  warnings: string[]
  sourceDescription?: string
}

/**
 * Utility helpers for resolving sender identity information.
 */
export class SenderIdentity {
  /**
   * Merge configuration identity with CLI overrides.
   */
  static resolve(
    configIdentity?: SenderIdentityConfig,
    overrides?: SenderIdentityOverrides
  ): SenderIdentityResolution {
    const warnings: string[] = []

    const trimmedConfig = SenderIdentity.trimIdentity(configIdentity)
    const trimmedOverrides = SenderIdentity.trimOverrides(overrides)

    const merged = { ...trimmedConfig }
    let source: SenderIdentitySource | undefined

    if (trimmedOverrides) {
      if (trimmedOverrides.name !== undefined) {
        merged.name = trimmedOverrides.name
      }
      if (trimmedOverrides.iconEmoji !== undefined) {
        merged.iconEmoji = trimmedOverrides.iconEmoji
        if (trimmedOverrides.iconEmoji) {
          delete merged.iconUrl
        }
      }
      if (trimmedOverrides.iconUrl !== undefined) {
        merged.iconUrl = trimmedOverrides.iconUrl
        if (trimmedOverrides.iconUrl) {
          delete merged.iconEmoji
        }
      }
      if (
        trimmedOverrides.name !== undefined ||
        trimmedOverrides.iconEmoji !== undefined ||
        trimmedOverrides.iconUrl !== undefined
      ) {
        source = 'cli'
      }
    }

    const hasName = !!merged.name
    const hasIcon = !!merged.iconEmoji || !!merged.iconUrl

    if (!hasName && !hasIcon) {
      return { warnings }
    }

    if (!source) {
      source = 'config'
    }

    const identityPayload: ResolvedSenderIdentity = {
      source,
      ...(merged.name ? { name: merged.name } : {}),
      ...(merged.iconEmoji ? { iconEmoji: merged.iconEmoji } : {}),
      ...(merged.iconUrl ? { iconUrl: merged.iconUrl } : {}),
    }

    return {
      identity: identityPayload,
      warnings,
      sourceDescription: source === 'cli' ? 'CLI overrides' : 'configuration',
    }
  }

  /**
   * Check if a resolved identity is complete (has name and icon).
   */
  static isComplete(identity?: ResolvedSenderIdentity | null): boolean {
    if (!identity) return false
    return !!identity.name && (!!identity.iconEmoji || !!identity.iconUrl)
  }

  private static trimIdentity(
    identity?: SenderIdentityConfig
  ): SenderIdentityConfig {
    if (!identity) {
      return {}
    }

    const name = SenderIdentity.normalizeString(identity.name)
    const iconEmoji = SenderIdentity.normalizeString(identity.iconEmoji)
    const iconUrl = SenderIdentity.normalizeString(identity.iconUrl)

    const result: SenderIdentityConfig = {}
    if (name) result.name = name
    if (iconEmoji) result.iconEmoji = iconEmoji
    if (iconUrl) result.iconUrl = iconUrl
    return result
  }

  private static trimOverrides(
    overrides?: SenderIdentityOverrides
  ): SenderIdentityOverrides | undefined {
    if (!overrides) return undefined

    const name = SenderIdentity.normalizeString(overrides.name)
    const iconEmoji = SenderIdentity.normalizeString(overrides.iconEmoji)
    const iconUrl = SenderIdentity.normalizeString(overrides.iconUrl)

    const result: SenderIdentityOverrides = {}
    if (name !== undefined) {
      result.name = name
    }
    if (iconEmoji !== undefined) {
      result.iconEmoji = iconEmoji
    }
    if (iconUrl !== undefined) {
      result.iconUrl = iconUrl
    }

    if (
      result.name !== undefined ||
      result.iconEmoji !== undefined ||
      result.iconUrl !== undefined
    ) {
      return result
    }

    return undefined
  }

  private static normalizeString(value?: string | null): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
}
