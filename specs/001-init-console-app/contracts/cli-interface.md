# CLI Interface Contract

## Command Line Interface

### Application Execution

```bash
# Build the application
yarn build

# Run the application
yarn start

# Expected output:
# hello world
```

### Exit Codes

- `0`: Successful execution
- `1`: General error (compilation failure, runtime error)

### Environment Requirements

- Node.js version: >=21.0.0
- Yarn package manager installed
- TypeScript compilation successful

## File System Contract

### Input Requirements

- `src/main.ts`: Main application entry point
- `package.json`: Project configuration with Node.js 21 requirement
- `tsconfig.json`: TypeScript configuration with "dist" output

### Output Guarantees

- `dist/main.js`: Compiled JavaScript entry point
- `dist/main.js.map`: Source map for debugging
- `dist/main.d.ts`: Type declarations

### Build Process Contract

1. TypeScript compiler validates all source files
2. Compilation produces no errors or warnings
3. Output files written to "dist" directory
4. Source maps generated for debugging support

## Runtime Contract

### Standard Output

```
Expected output: "hello world"
Format: Plain text with newline
Encoding: UTF-8
```

### Error Handling

- Compilation errors: Exit code 1, error to stderr
- Runtime errors: Exit code 1, stack trace to stderr
- Missing dependencies: Exit code 1, clear error message

### Performance Contract

- Application startup: <100ms
- Memory usage: <50MB resident
- Build time: <5 seconds for clean build

This contract defines the external interface and behavior expectations for the TypeScript console application.
