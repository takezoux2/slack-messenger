# Implementation Plan: Config-based Posting Identity

**Branch**: `006-config-post-identity-plan` | **Date**: 2025-10-22 | **Spec**: [/specs/006-config-post-identity/spec.md](/specs/006-config-post-identity/spec.md)
**Input**: Feature specification from `/specs/006-config-post-identity/spec.md`

## Summary

- Extend the YAML configuration schema with a `sender_identity` object (name + emoji/url icon) and validation coverage aligned with Slack's `chat.postMessage` parameters.
- Add a reusable identity resolution service that merges CLI overrides, configuration defaults, and fallback behaviour while logging provenance for verbose/audit output.
- Update `send-message` and `broadcast` command flows to load configuration when needed, enforce explicit confirmation before falling back to the default bot identity, and expose new CLI override flags.
- Enhance Slack API integration to pass the resolved identity fields, report scope-related errors clearly, and keep non-interactive runs deterministic.

## Technical Context

**Language/Version**: TypeScript 5.3+ on Node.js 22
**Primary Dependencies**: `@slack/web-api`, `commander`, `js-yaml`, `vitest`
**Storage**: YAML configuration files on disk (channel + sender identity metadata)
**Testing**: Vitest unit/integration suites with existing mocking of Slack service interactions
**Target Platform**: Node.js CLI executed in CI pipelines and operator laptops
**Project Type**: Single-package CLI application under `src/`
**Performance Goals**: Maintain current single API call per message; identity resolution should add <5 ms overhead locally
**Constraints**: Must gracefully handle tokens lacking `chat:write.customize` by warning and falling back after explicit consent; confirmation UX cannot block non-interactive automation
**Scale/Scope**: Designed for small team broadcasts (≤100 channels per list) with shared sender identity defaults

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- No ratified constitution content is provided in `.specify/memory/constitution.md`; treating constitutional gates as non-applicable. **Status: PASS**

## Project Structure

### Documentation (this feature)

```
specs/006-config-post-identity/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── commands/
│   ├── broadcast-message.command.ts       # apply identity to multi-channel sends
│   └── send-message.command.ts            # apply identity + confirmation flow
├── config/
│   └── app-config.ts                      # surface config loader helpers
├── models/
│   ├── channel-configuration.ts           # add sender identity structure
│   ├── command-line-options.ts            # expose override fields
│   └── sender-identity.ts                 # NEW: typed identity value object
├── services/
│   ├── cli.service.ts                     # register new CLI flags
│   ├── config-validation.service.ts       # validate identity section
│   ├── identity-resolution.service.ts     # NEW: merge config/CLI/defaults
│   ├── slack.service.ts                   # pass username/icon to API
│   └── yaml-config.service.ts             # parse sender identity from YAML
└── utils/
    └── prompt.service.ts                  # NEW: centralized confirmation helper (TTY-aware)

tests/
├── unit/
│   ├── services/identity-resolution.service.test.ts
│   ├── services/yaml-config.service.test.ts
│   ├── services/config-validation.service.test.ts
│   └── commands/send-message.command.test.ts
└── integration/
    └── cli-identity-flows.test.ts
```

**Structure Decision**: Retain the existing single-package CLI layout while introducing focused services (`identity-resolution`, `prompt`) and corresponding unit test suites under `tests/unit`; add an integration suite to cover end-to-end CLI identity behaviour.

## Complexity Tracking

*No constitutional violations identified; no additional complexity justification required.*
