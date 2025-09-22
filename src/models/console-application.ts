/**
 * Console Application entity representing the main application instance
 */
export class ConsoleApplication {
  private _state: 'INITIALIZED' | 'COMPILED' | 'RUNNING' | 'COMPLETED' =
    'INITIALIZED'

  constructor(
    public readonly name: string,
    public readonly version: string,
    public readonly entryPoint: string,
    public readonly outputDir: string
  ) {
    this.validateProperties()
  }

  /**
   * Get the current application state
   */
  get state(): string {
    return this._state
  }

  /**
   * Transition to COMPILED state
   */
  compile(): void {
    if (this._state !== 'INITIALIZED') {
      throw new Error(`Cannot transition from ${this._state} to COMPILED`)
    }
    this._state = 'COMPILED'
  }

  /**
   * Transition to RUNNING state
   */
  run(): void {
    if (this._state !== 'COMPILED') {
      throw new Error(`Cannot transition from ${this._state} to RUNNING`)
    }
    this._state = 'RUNNING'
  }

  /**
   * Transition to COMPLETED state
   */
  complete(): void {
    if (this._state !== 'RUNNING') {
      throw new Error(`Cannot transition from ${this._state} to COMPLETED`)
    }
    this._state = 'COMPLETED'
  }

  /**
   * Validate that entry point exists and is readable
   */
  validateEntryPoint(): void {
    // Implementation would check file system in real app
    // For console app initialization, we just validate non-empty path
    if (!this.entryPoint) {
      throw new Error('Entry point must be specified')
    }
  }

  /**
   * Validate that output directory is writable
   */
  validateOutputDir(): void {
    // Implementation would check file system permissions in real app
    // For console app initialization, we just validate non-empty path
    if (!this.outputDir) {
      throw new Error('Output directory must be specified')
    }
  }

  /**
   * Validate constructor properties according to data model rules
   */
  private validateProperties(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('name must be non-empty string')
    }

    if (!this.isValidSemanticVersion(this.version)) {
      throw new Error('version must follow semantic versioning format')
    }

    if (!this.entryPoint) {
      throw new Error('entryPoint must be specified')
    }

    if (!this.outputDir) {
      throw new Error('outputDir must be specified')
    }
  }

  /**
   * Check if version follows semantic versioning format
   */
  private isValidSemanticVersion(version: string): boolean {
    const semverRegex =
      /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?(\+[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?$/
    return semverRegex.test(version)
  }
}
