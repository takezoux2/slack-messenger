/**
 * Application configuration settings
 */
export class Configuration {
  constructor(
    public readonly nodeVersion: string,
    public readonly strict: boolean,
    public readonly testFramework: string,
    public readonly buildTarget: string
  ) {
    this.validateProperties()
  }

  /**
   * Check if Node.js version format is valid
   */
  isValidNodeVersion(): boolean {
    // Check if version follows proper format like ">=21.0.0"
    const versionRegex = /^>=\d+\.\d+\.\d+$/
    return versionRegex.test(this.nodeVersion) && this.isNodeVersion21OrHigher()
  }

  /**
   * Check if configuration meets constitutional requirements
   */
  isConstitutionallyCompliant(): boolean {
    return (
      this.strict === true &&
      this.testFramework === 'vitest' &&
      this.buildTarget === 'dist' &&
      this.isNodeVersion21OrHigher()
    )
  }

  /**
   * Create default configuration following constitutional principles
   */
  static createDefault(): Configuration {
    return new Configuration('>=21.0.0', true, 'vitest', 'dist')
  }

  /**
   * Validate constructor properties according to data model rules
   */
  private validateProperties(): void {
    if (!this.isNodeVersion21OrHigher()) {
      throw new Error('nodeVersion must specify Node.js 21 or higher')
    }

    if (this.strict !== true) {
      throw new Error('strict must be true (constitutional requirement)')
    }

    if (this.testFramework !== 'vitest') {
      throw new Error('testFramework must be "vitest"')
    }

    if (this.buildTarget !== 'dist') {
      throw new Error('buildTarget must be "dist"')
    }
  }

  /**
   * Check if Node.js version is 21 or higher
   */
  private isNodeVersion21OrHigher(): boolean {
    // Extract major version from string like ">=21.0.0"
    const match = this.nodeVersion.match(/>=(\d+)/)
    if (!match || !match[1]) return false

    const majorVersion = parseInt(match[1], 10)
    return majorVersion >= 21
  }
}
