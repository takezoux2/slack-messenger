# Research Findings: Config-based Posting Identity

## Slack display identity customization
- **Decision**: Use Slack `chat.postMessage` parameters (`username`, `icon_emoji`, `icon_url`) when the token includes the `chat:write.customize` scope, and fall back to the bot's default identity when the scope is absent.
- **Rationale**: Slack's Web API allows overriding the displayed sender name and icon through these optional fields for workspace apps with the customize scope. Attempting to set them without the scope yields `invalid_arguments`, so the CLI must detect this failure and report it without blocking message delivery.
- **Alternatives considered**: (1) Using legacy incoming webhooks—rejected because the CLI already depends on bot tokens. (2) Creating a custom Slack app per identity—rejected as it multiplies operational overhead.

## Configuration schema for sender identity
- **Decision**: Extend the YAML configuration with a top-level `sender_identity` object containing `name` plus either `icon_emoji` or `icon_url`, keeping optional legacy shorthand `icon` that maps to `icon_emoji` when it matches `:shortcode:` syntax.
- **Rationale**: This structure mirrors Slack's parameter model and keeps validation straightforward. Supporting a legacy `icon` field preserves user expectations from the specification while guiding teams toward explicit emoji vs. URL fields.
- **Alternatives considered**: (1) Allowing free-form `icon` strings and attempting automatic detection at runtime—rejected for increasing runtime failure risk. (2) Embedding identity inside each channel list—rejected because the feature scope defines a single shared identity.

## Non-interactive confirmation strategy
- **Decision**: Require explicit operator consent before using the default Slack identity by prompting interactively when `stdin` is a TTY, and falling back to a `--allow-default-identity` flag (or an explicit override via CLI flags) for non-interactive contexts.
- **Rationale**: Interactive confirmation satisfies the requirement for human acknowledgement while the flag keeps automation pipelines unblocked. Treating CLI overrides as consent ensures operators can bypass the prompt when they intentionally set custom identity values.
- **Alternatives considered**: (1) Always failing when identity is incomplete—rejected because it adds friction for emergency use. (2) Automatically proceeding with warnings—rejected as it violates the requirement for explicit confirmation.
