# Feature Specification: Config-based Posting Identity

**Feature Branch**: `006-config-post-identity`
**Created**: 2025-10-22
**Status**: Draft
**Input**: User description: "投稿時に、configファイルから投稿者の名前とアイコンを取得し、その名前とアイコンで投稿できるようにして"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Post message with configured identity (Priority: P1)

As a release manager running the CLI, I want each message I send to Slack to automatically show the sender name and icon defined in our shared configuration file so that recipients immediately recognize the notification source without me providing identity options every time.

**Why this priority**: Ensures all standard notifications present a consistent brand identity, which is critical for trust and recognition.

**Independent Test**: Execute the CLI `send-message` command using a config file that defines a sender identity and confirm the resulting Slack message displays the configured name and icon without additional command parameters.

**Acceptance Scenarios**:

1. **Given** the configuration file specifies `notification-bot` as the display name and a bell emoji as the icon, **When** a user sends a message via the CLI without overriding identity fields, **Then** the Slack message shows `notification-bot` with the bell icon.
2. **Given** the configuration file provides a sender identity and Slack confirms message delivery, **When** the CLI sends a message, **Then** the audit log or verbose output indicates which identity was applied so operators can verify the configuration used.

---

### User Story 2 - Broadcast with shared identity (Priority: P2)

As a communications specialist sending a broadcast to multiple channels, I want the CLI to apply the same configured name and icon across all targets so the announcement looks unified everywhere.

**Why this priority**: Consistency across multi-channel broadcasts avoids confusion caused by different sender appearances and reduces the risk of mistaken authenticity.

**Independent Test**: Run the `broadcast` command using a configuration file that defines a sender identity and verify each channel receives the message with identical display name and icon attributes.

**Acceptance Scenarios**:

1. **Given** a configuration with a sender identity and a channel list named `release-alerts`, **When** a broadcast is sent, **Then** each channel in the list shows the configured name and icon.
2. **Given** verbose mode is enabled, **When** the broadcast completes, **Then** the CLI output lists the identity applied for the broadcast to confirm consistency.

---

### User Story 3 - Override fallback handling (Priority: P3)

As a CLI operator preparing a one-off announcement, I want the tool to tell me if the configuration lacks a sender name or icon and fall back to the default Slack identity only after explicit confirmation, so that I avoid sending unattributed or confusing alerts by mistake.

**Why this priority**: Protects against misconfiguration by ensuring operators notice missing identity data before sending high-impact messages.

**Independent Test**: Modify the configuration file to omit the icon value, attempt to send a message, and confirm the CLI surfaces a warning and requires confirmation or explicit override before using a fallback identity.

**Acceptance Scenarios**:

1. **Given** the configuration file is missing an icon value, **When** an operator runs the send command, **Then** the CLI warns that the icon is not configured and explains the fallback behavior before sending.
2. **Given** the configuration lacks both name and icon, **When** the operator chooses to proceed after the warning, **Then** the CLI sends the message using Slack's default bot identity and logs that the default was used.

---

### Edge Cases

- Configuration file contains multiple sender identity entries; the CLI should clearly document which section controls send-message and broadcast commands and ignore unrelated values.
- Configuration file exists but is unreadable due to permissions; the CLI should fail fast with guidance to fix access before attempting to send.
- Configuration provides an icon URL that Slack rejects; the CLI should surface the API error and advise the operator to update the configuration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CLI MUST read sender name and icon attributes from the designated configuration file before executing send or broadcast commands.
- **FR-002**: The CLI MUST apply the configured sender name and icon to Slack messages for both single-channel and broadcast operations when the configuration supplies valid values.
- **FR-003**: The CLI MUST provide a clear warning and fallback explanation when either the name or icon is missing from the configuration before sending any message.
- **FR-004**: Operators MUST be able to override the configured identity at runtime via existing or documented CLI options, with the override taking precedence over configuration values.
- **FR-005**: The system MUST log (in verbose output or audit logs) the resolved sender identity used for each message attempt, including whether the values came from configuration or were overridden.
- **FR-006**: The CLI MUST validate the sender identity section of the configuration during startup or command execution and report structured errors if required fields are malformed (e.g., unsupported icon formats).

### Key Entities *(include if feature involves data)*

- **SenderIdentity**: Represents the display information applied to Slack messages; includes display name, icon reference (emoji short code or image URL), and metadata indicating whether values originated from configuration or runtime override.
- **MessagingCommand**: Abstract representation of a CLI operation that sends messages (send-message, broadcast); uses SenderIdentity to assemble the final request payload for Slack and records which configuration file supplied the identity.
- **ConfigFile**: The YAML configuration file that now includes a sender identity section alongside channel lists; stores default sender details and validation rules such as required fields and acceptable icon formats.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of messages sent via the CLI with a valid configuration display the configured sender name and icon in Slack confirmation screenshots.
- **SC-002**: 95% of send or broadcast attempts with missing identity fields alert the operator before any network call is made, measured across test executions.
- **SC-003**: Operator satisfaction with sender identity handling (captured via post-release feedback or survey) reaches at least 4 out of 5 for clarity and consistency.
- **SC-004**: Support requests related to incorrect sender identity drop by 80% within one month of release compared to the previous month.

## Assumptions *(optional)*

- The configuration file will gain a clearly defined `sender_identity` section containing `name` and `icon` fields, and optionally support `icon_emoji` or `icon_url` values following Slack's standard semantics.
- Operators already know how to provide runtime overrides for sender name and icon through existing CLI flags; documentation updates will reference these options alongside the new configuration defaults.
- Slack API permissions already allow setting custom display names and icons for the bot token in use, so no additional scopes are required.
- Configuration validation currently performed for channel lists can be extended to cover the new sender identity schema without introducing new third-party dependencies.

## Out of Scope *(optional)*

- Managing different sender identities per channel list; this feature focuses on a single default identity shared across commands.
- Providing UI tools for editing the configuration file; updates remain manual via text editors or existing workflows.
- Implementing dynamic identity selection based on message content or scheduling logic.

