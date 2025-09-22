# TypeScript Console Application - Quickstart Guide

## Prerequisites

- Node.js 21.x or higher installed
- Yarn package manager installed
- VS Code or similar TypeScript-capable editor

## Setup Instructions

### 1. Install Dependencies

```powershell
# Install project dependencies
yarn install

# Verify Node.js version
node --version  # Should show v21.x.x or higher
```

### 2. Build the Application

```powershell
# Compile TypeScript to JavaScript
yarn build

# Verify build output
ls dist/  # Should show main.js, main.d.ts, main.js.map
```

### 3. Run the Application

```powershell
# Execute the console application
yarn start

# Expected output:
# hello world
```

## Development Workflow

### Running Tests

```powershell
# Run test suite
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:run --coverage
```

### Development Mode

```powershell
# Start TypeScript compiler in watch mode
yarn dev

# In another terminal, run the application
yarn start
```

### Code Quality

```powershell
# Check code style and quality
yarn lint

# Auto-fix linting issues
yarn lint:fix

# Format code with Prettier
yarn format
```

## Project Structure

```
slack-messenger/
├── src/
│   └── main.ts          # Application entry point
├── tests/
│   └── main.test.ts     # Unit tests
├── dist/                # Compiled output (generated)
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vitest.config.ts     # Test configuration
└── .eslintrc.json       # Linting rules
```

## Validation Steps

### ✅ Verify Setup

1. **Dependencies installed**: `yarn install` completes successfully
2. **TypeScript compiles**: `yarn build` produces dist/ directory
3. **Application runs**: `yarn start` outputs "hello world"
4. **Tests pass**: `yarn test` shows all tests passing

### ✅ Verify Constitution Compliance

1. **TypeScript strict mode**: Check tsconfig.json has `"strict": true`
2. **Yarn lockfile**: Verify yarn.lock exists and is committed
3. **Test coverage**: Tests exist for main functionality
4. **Code quality**: ESLint and Prettier configured

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**:

- Check tsconfig.json configuration
- Verify all imports have proper types
- Run `yarn lint` to check for code quality issues

**Application doesn't output "hello world"**:

- Verify src/main.ts contains console.log("hello world")
- Check that yarn build completed successfully
- Ensure dist/main.js exists and is executable

**Tests fail**:

- Verify Vitest configuration in vitest.config.ts
- Check test files are in tests/ directory with .test.ts extension
- Run `yarn test --verbose` for detailed output

**Node.js version issues**:

- Verify Node.js 21+ with `node --version`
- Check package.json engines field specifies correct version
- Consider using nvm or similar to manage Node.js versions

## Next Steps

After successful setup:

1. Explore the TypeScript configuration in tsconfig.json
2. Add additional console output or functionality to src/main.ts
3. Write additional tests in tests/ directory
4. Configure your IDE for optimal TypeScript development experience

This quickstart provides a working TypeScript console application foundation following constitutional principles and best practices.
