# Data Model: TypeScript Console Application

## Application Entities

### ConsoleApplication

**Description**: Main application entity representing the console application instance

**Properties**:

- `name`: string - Application name from package.json
- `version`: string - Application version from package.json
- `entryPoint`: string - Path to main entry file (src/main.ts)
- `outputDir`: string - Build output directory ("dist")

**Validation Rules**:

- `name` must be non-empty string
- `version` must follow semantic versioning format
- `entryPoint` must exist and be readable
- `outputDir` must be writable directory

**State Transitions**:

- INITIALIZED → COMPILED (after successful build)
- COMPILED → RUNNING (during execution)
- RUNNING → COMPLETED (after execution finishes)

### Configuration

**Description**: Application configuration settings

**Properties**:

- `nodeVersion`: string - Required Node.js version (">=21.0.0")
- `strict`: boolean - TypeScript strict mode (always true)
- `testFramework`: string - Testing framework name ("vitest")
- `buildTarget`: string - Compilation target directory

**Validation Rules**:

- `nodeVersion` must specify Node.js 21 or higher
- `strict` must be true (constitutional requirement)
- `testFramework` must be "vitest"
- `buildTarget` must be "dist"

### Message

**Description**: Console output message entity

**Properties**:

- `content`: string - Message text content
- `timestamp`: Date - When message was created
- `level`: MessageLevel - Output level (info, error, debug)

**Validation Rules**:

- `content` must be non-empty string
- `timestamp` must be valid Date object
- `level` must be valid MessageLevel enum value

**Enums**:

```typescript
enum MessageLevel {
  INFO = "info",
  ERROR = "error",
  DEBUG = "debug",
}
```

## Relationships

- ConsoleApplication contains one Configuration
- ConsoleApplication can output multiple Messages
- Configuration determines build and runtime behavior
- Messages are produced during application execution

## Domain Model Notes

This is a simple console application with minimal data complexity. The primary entities focus on:

1. Application metadata and configuration
2. Build process state management
3. Console output representation

No persistence layer required - all data is ephemeral during application lifecycle.
