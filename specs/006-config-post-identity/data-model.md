# Data Model: Config-based Posting Identity

## SenderIdentity (new)
- **Purpose**: Represents the resolved display identity applied to any outgoing Slack message.
- **Fields**:
  - `displayName: string | null` — human-readable name shown in Slack. Required when sourced from configuration or CLI override.
  - `iconEmoji: string | null` — Slack emoji shortcode (e.g., `:bell:`). Mutually exclusive with `iconUrl`.
  - `iconUrl: string | null` — HTTPS URL pointing to the icon image. Mutually exclusive with `iconEmoji`.
  - `source: 'config' | 'cli-override' | 'fallback-default'` — indicates where the values originated.
  - `warnings: string[]` — captures validation or fallback notices for verbose/audit logging.
  - `applied: boolean` — flags whether the identity was successfully forwarded to Slack (false when scope prevented customization).

## ChannelConfiguration (updated)
- **Existing fields**: `channelLists: NamedChannelList[]`, `mentions?: MentionMapping`, `filePath: string`, `lastModified?: Date`.
- **New field**: `senderIdentity?: SenderIdentityConfig` — optional configuration block.
  - `SenderIdentityConfig` fields:
    - `name: string` — required, non-empty.
    - `icon_emoji?: string` — optional emoji shortcode.
    - `icon_url?: string` — optional HTTPS URL.
    - `icon?: string` — legacy shorthand; treated as emoji when it matches `:shortcode:`.

## CommandLineOptions (updated)
- **New getters**: `senderName?: string`, `senderIconEmoji?: string`, `senderIconUrl?: string`, `allowDefaultIdentity?: boolean`.
- **Validation rules**:
  - Overrides must respect mutual exclusion between emoji and URL.
  - CLI override values short-circuit configuration defaults.
  - `allowDefaultIdentity` implies consent to continue without configured values.

## IdentityResolutionContext (new helper structure)
- **Inputs**: `configIdentity?: SenderIdentityConfig`, `cliOverrides`, `environment: { isInteractive: boolean }`.
- **Outputs**: `resolved: SenderIdentity`, `needsConfirmation: boolean`.
- **Relationships**: Consumed by both `SendMessageCommand` and `BroadcastMessageCommand` prior to Slack API calls.

## SlackMessage (unchanged core)
- **Augmentation**: Accepts optional `senderIdentity` parameter during `SlackService.sendMessage` to carry display metadata into API payload construction.

## PromptConsentResult (new utility type)
- **Fields**: `confirmed: boolean`, `reason?: string`.
- **Usage**: Standardizes the response from the TTY-aware prompt utility so commands can uniformly enforce fallback consent.
