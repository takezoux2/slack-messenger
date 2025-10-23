# Quickstart: Config-based Posting Identity

1. **Update configuration**
   - Add a `sender_identity` block to your Slack YAML configuration:
     ```yaml
     sender_identity:
       name: "Notification Bot"
       icon_emoji: ":bell:"
     ```
   - Commit the change alongside channel list updates so operators share the same defaults.

2. **Run send-message with defaults**
   - Execute `yarn start send-message C1234567890 "Deployment complete"`.
   - The CLI loads the configuration, resolves the identity, and posts with the configured name and icon.

3. **Override for special cases**
   - Use `--sender-name` / `--sender-icon-emoji` or `--sender-icon-url` to override the defaults for a single run.
   - Overrides are logged as `source=cli-override` in verbose mode.

4. **Handle missing identity**
   - If the configuration lacks name or icon, the CLI prompts for confirmation (TTY) or requires `--allow-default-identity` in scripts before falling back to the default Slack bot appearance.

5. **Verify delivery**
   - Run with `--verbose` to see which identity was applied and whether Slack accepted the customization (scope errors downgrade to the default identity with a warning).
