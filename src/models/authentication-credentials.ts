/**
 * AuthenticationCredentials Model
 *
 * Represents Slack authentication credentials with security and validation.
 * This model handles token management and security considerations.
 */

export interface AuthenticationCredentialsParams {
  token: string
  tokenType?: 'bot' | 'user' | 'app'
  expiresAt?: Date | undefined
  scopes?: string[] | undefined
}

export class AuthenticationCredentials {
  private readonly _token: string
  private readonly _tokenType: 'bot' | 'user' | 'app'
  private readonly _expiresAt: Date | undefined
  private readonly _scopes: string[] | undefined

  constructor(params: AuthenticationCredentialsParams) {
    this.validateToken(params.token)

    this._token = params.token
    this._tokenType = params.tokenType || this.detectTokenType(params.token)
    this._expiresAt = params.expiresAt
    this._scopes = params.scopes
  }

  /**
   * Get the authentication token (for API calls)
   */
  get token(): string {
    return this._token
  }

  /**
   * Get the token type
   */
  get tokenType(): 'bot' | 'user' | 'app' {
    return this._tokenType
  }

  /**
   * Get token expiration date (if available)
   */
  get expiresAt(): Date | undefined {
    return this._expiresAt
  }

  /**
   * Get token scopes (if available)
   */
  get scopes(): string[] | undefined {
    return this._scopes
  }

  /**
   * Check if this is a bot token
   */
  get isBotToken(): boolean {
    return this._tokenType === 'bot'
  }

  /**
   * Check if this is a user token
   */
  get isUserToken(): boolean {
    return this._tokenType === 'user'
  }

  /**
   * Check if this is an app token
   */
  get isAppToken(): boolean {
    return this._tokenType === 'app'
  }

  /**
   * Check if token is expired
   */
  get isExpired(): boolean {
    if (!this._expiresAt) {
      return false // No expiration date means it doesn't expire
    }
    return new Date() >= this._expiresAt
  }

  /**
   * Check if token is valid (not expired and properly formatted)
   */
  get isValid(): boolean {
    return !this.isExpired && this.isTokenFormatValid()
  }

  /**
   * Get masked token for logging (shows only first and last few characters)
   */
  get maskedToken(): string {
    if (this._token.length <= 8) {
      return '*'.repeat(this._token.length)
    }

    const start = this._token.substring(0, 4)
    const end = this._token.substring(this._token.length - 4)
    const middle = '*'.repeat(this._token.length - 8)

    return `${start}${middle}${end}`
  }

  /**
   * Get token prefix (e.g., 'xoxb', 'xoxp', 'xapp')
   */
  get tokenPrefix(): string {
    const match = this._token.match(/^(xox[bpusra]|xapp)/)
    return match?.[1] || ''
  }

  /**
   * Validate token format and content
   */
  private validateToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new Error('Authentication token is required and must be a string')
    }

    const trimmedToken = token.trim()
    if (trimmedToken.length === 0) {
      throw new Error('Authentication token cannot be empty or whitespace only')
    }

    if (trimmedToken.length < 10) {
      throw new Error(
        'Authentication token appears to be too short to be valid'
      )
    }

    // Check for common Slack token patterns
    const slackTokenPattern = /^(xox[bpusra]|xapp)-/
    if (!slackTokenPattern.test(trimmedToken)) {
      throw new Error(
        'Invalid token format. Expected Slack token starting with xoxb-, xoxp-, xoxu-, xoxs-, xoxr-, xoxa-, or xapp-'
      )
    }
  }

  /**
   * Detect token type from token prefix
   */
  private detectTokenType(token: string): 'bot' | 'user' | 'app' {
    if (token.startsWith('xoxb-')) {
      return 'bot'
    } else if (token.startsWith('xoxp-') || token.startsWith('xoxu-')) {
      return 'user'
    } else if (token.startsWith('xapp-') || token.startsWith('xoxa-')) {
      return 'app'
    }

    // Default to bot if can't determine
    return 'bot'
  }

  /**
   * Check if token format is valid
   */
  private isTokenFormatValid(): boolean {
    try {
      this.validateToken(this._token)
      return true
    } catch {
      return false
    }
  }

  /**
   * Create AuthenticationCredentials from environment variable
   */
  static fromEnvironment(
    envVarName: string = 'SLACK_BOT_TOKEN'
  ): AuthenticationCredentials {
    const token = process.env[envVarName]
    if (!token) {
      throw new Error(
        `Environment variable ${envVarName} is required but not set`
      )
    }
    return new AuthenticationCredentials({ token })
  }

  /**
   * Create AuthenticationCredentials from bot token
   */
  static forBotToken(token: string): AuthenticationCredentials {
    return new AuthenticationCredentials({ token, tokenType: 'bot' })
  }

  /**
   * Create AuthenticationCredentials from user token
   */
  static forUserToken(token: string): AuthenticationCredentials {
    return new AuthenticationCredentials({ token, tokenType: 'user' })
  }

  /**
   * Create AuthenticationCredentials from app token
   */
  static forAppToken(token: string): AuthenticationCredentials {
    return new AuthenticationCredentials({ token, tokenType: 'app' })
  }

  /**
   * Create AuthenticationCredentials with expiration
   */
  static withExpiration(
    token: string,
    expiresAt: Date
  ): AuthenticationCredentials {
    return new AuthenticationCredentials({ token, expiresAt })
  }

  /**
   * Create AuthenticationCredentials with scopes
   */
  static withScopes(
    token: string,
    scopes: string[]
  ): AuthenticationCredentials {
    return new AuthenticationCredentials({ token, scopes })
  }

  /**
   * Check if token has required scope
   */
  hasScope(scope: string): boolean {
    if (!this._scopes) {
      return true // If scopes are unknown, assume permission is granted
    }
    return this._scopes.includes(scope)
  }

  /**
   * Check if token has all required scopes
   */
  hasAllScopes(requiredScopes: string[]): boolean {
    if (!this._scopes) {
      return true // If scopes are unknown, assume permission is granted
    }
    return requiredScopes.every(scope => this._scopes!.includes(scope))
  }

  /**
   * Get authorization header value for API requests
   */
  getAuthorizationHeader(): string {
    return `Bearer ${this._token}`
  }

  /**
   * Serialize to JSON for logging/debugging (token is masked)
   */
  toJSON(): object {
    return {
      tokenType: this._tokenType,
      tokenPrefix: this.tokenPrefix,
      maskedToken: this.maskedToken,
      expiresAt: this._expiresAt?.toISOString(),
      scopes: this._scopes,
      isBotToken: this.isBotToken,
      isUserToken: this.isUserToken,
      isAppToken: this.isAppToken,
      isExpired: this.isExpired,
      isValid: this.isValid,
    }
  }

  /**
   * String representation for debugging (token is masked)
   */
  toString(): string {
    const expiry = this._expiresAt
      ? ` expires=${this._expiresAt.toISOString()}`
      : ''
    return `AuthenticationCredentials(type=${this._tokenType}, token=${this.maskedToken}${expiry})`
  }
}
