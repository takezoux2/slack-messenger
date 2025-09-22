# Tasks: Initialize TypeScript Console Application

**Input**: Design documents from `/specs/001-init-console-app/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack: TypeScript 5.x, Node.js 22, Vitest, ESLint, Prettier
   → Structure: Single project with src/, tests/ directories
2. Load optional design documents:
   → data-model.md: ConsoleApplication, Configuration, Message entities
   → contracts/cli-interface.md: CLI execution contract
   → research.md: TypeScript decisions, Vitest framework choice
   → quickstart.md: Build, run, test scenarios
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: build scripts, error handling
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests? ✓
   → All entities have models? ✓
   → All endpoints implemented? N/A (console app)
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths assume single project structure per plan.md

## Phase 3.1: Setup
- [x] T001 Create project structure with src/{models,services,config}/ and tests/{contract,unit,integration}/ directories
- [x] T002 Initialize package.json with Node.js 22 requirement, Yarn package manager, and build scripts
- [x] T003 [P] Configure TypeScript with strict mode and "dist" output in tsconfig.json
- [x] T004 [P] Configure Vitest testing framework in vitest.config.ts
- [x] T005 [P] Configure ESLint with TypeScript parser in .eslintrc.json
- [x] T006 [P] Configure Prettier code formatting in .prettierrc
- [x] T007 Install project dependencies with yarn install

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T008 [P] CLI interface contract test in tests/contract/cli-interface.test.ts
- [x] T009 [P] ConsoleApplication entity unit test in tests/unit/console-application.test.ts
- [x] T010 [P] Configuration entity unit test in tests/unit/configuration.test.ts
- [x] T011 [P] Message entity unit test in tests/unit/message.test.ts
- [x] T012 [P] Main application integration test in tests/integration/main.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T013 [P] ConsoleApplication model with state transitions in src/models/console-application.ts
- [x] T014 [P] Configuration model with validation in src/models/configuration.ts
- [x] T015 [P] Message model and MessageLevel enum in src/models/message.ts
- [x] T016 [P] Console service for message output in src/services/console.service.ts
- [x] T017 Main application entry point with "hello world" output in src/main.ts
- [x] T018 Application configuration loader in src/config/app-config.ts

## Phase 3.4: Integration
- [x] T019 Verify TypeScript compilation to "dist" directory
- [x] T020 Runtime environment validation for Node.js 22+
- [x] T021 Error handling and exit code management in main.ts
- [x] T022 Source map generation for debugging support

## Phase 3.5: Polish
- [x] T023 [P] Package.json dependencies audit and validation
- [x] T024 [P] TypeScript declaration file generation verification
- [x] T025 [P] ESLint and Prettier rules validation across codebase
- [x] T026 Execute quickstart guide validation scenarios
- [x] T027 Performance contract verification (startup <100ms, memory <50MB)
- [x] T028 Build process contract verification (clean build <5 seconds)

## Dependencies
- Setup (T001-T007) before all other phases
- Tests (T008-T012) before implementation (T013-T018)
- T013-T015 (models) before T016-T018 (services and main)
- T017 (main entry) blocks T019-T022 (integration)
- Implementation before polish (T023-T028)

## Parallel Example
```
# Launch contract and entity tests together (Phase 3.2):
Task: "CLI interface contract test in tests/contract/cli-interface.test.ts"
Task: "ConsoleApplication entity unit test in tests/unit/console-application.test.ts" 
Task: "Configuration entity unit test in tests/unit/configuration.test.ts"
Task: "Message entity unit test in tests/unit/message.test.ts"

# Launch model implementations together (Phase 3.3):
Task: "ConsoleApplication model with state transitions in src/models/console-application.ts"
Task: "Configuration model with validation in src/models/configuration.ts"
Task: "Message model and MessageLevel enum in src/models/message.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - cli-interface.md → contract test task [P] → T008
   - Build/runtime contracts → integration tasks → T019-T022, T027-T028
   
2. **From Data Model**:
   - ConsoleApplication entity → model creation task [P] → T009 (test), T013 (model)
   - Configuration entity → model creation task [P] → T010 (test), T014 (model)
   - Message entity → model creation task [P] → T011 (test), T015 (model)
   
3. **From User Stories/Quickstart**:
   - Build and run scenarios → integration test [P] → T012
   - Quickstart validation → validation tasks → T026
   - Main application execution → T017 (implementation)

4. **From Research Decisions**:
   - TypeScript 5.x setup → T003
   - Vitest framework → T004
   - ESLint + Prettier → T005, T006
   - Yarn package manager → T002, T007

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests
- [x] All entities have model tasks
- [x] All tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
