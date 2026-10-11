import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Secure configuration loader with validation
export class Config {
  private static instance: Config;
  private config: Map<string, string> = new Map();

  private constructor() {
    this.loadConfig();
    this.validateConfig();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): void {
    // Cloudflare Workers AI
    this.set('CLOUDFLARE_ACCOUNT_ID', process.env.CLOUDFLARE_ACCOUNT_ID || '');
    this.set('CLOUDFLARE_API_KEY', process.env.CLOUDFLARE_API_KEY || '');

    // Server
    this.set('PORT', process.env.PORT || '3001');
    this.set('NODE_ENV', process.env.NODE_ENV || 'development');
    this.set('HOST', process.env.HOST || 'localhost');

    // Security
    this.set('JWT_SECRET', process.env.JWT_SECRET || this.generateSecret());
    this.set('SESSION_SECRET', process.env.SESSION_SECRET || this.generateSecret());

    // Workspace
    this.set('WORKSPACE_ROOT', process.env.WORKSPACE_ROOT || './workspaces');
    this.set('MAX_WORKSPACE_SIZE', process.env.MAX_WORKSPACE_SIZE || '1024');

    // Agent
    this.set('AGENT_MAX_ITERATIONS', process.env.AGENT_MAX_ITERATIONS || '10');
    this.set('AGENT_TIMEOUT', process.env.AGENT_TIMEOUT || '300000');
    this.set('AGENT_AUTO_APPROVE_SAFE', process.env.AGENT_AUTO_APPROVE_SAFE || 'true');
    this.set('AGENT_REQUIRE_APPROVAL_DESTRUCTIVE', process.env.AGENT_REQUIRE_APPROVAL_DESTRUCTIVE || 'true');

    // Licensing
    this.set('LICENSE_KEY', process.env.LICENSE_KEY || '');
    this.set('LICENSE_SERVER_URL', process.env.LICENSE_SERVER_URL || '');

    // Logging
    this.set('LOG_LEVEL', process.env.LOG_LEVEL || 'info');
    this.set('LOG_FILE', process.env.LOG_FILE || '');

    // Web search (India & Kerala Search feature)
    this.set('BRAVE_SEARCH_API_KEY', process.env.BRAVE_SEARCH_API_KEY || '');
    this.set('TAVILY_API_KEY', process.env.TAVILY_API_KEY || '');
    this.set('SEARCH_PROVIDER', process.env.SEARCH_PROVIDER || '');
  }

  private validateConfig(): void {
    // Validate required fields
    const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_KEY'];
    const missing = required.filter(key => !this.get(key));

    if (missing.length > 0) {
      console.warn(`Missing required environment variables: ${missing.join(', ')}`);
      console.warn('Please set these in your .env file');
    }

    // Validate secrets
    if (this.get('JWT_SECRET') === this.generateSecret()) {
      console.warn('Using default JWT_SECRET. Please set a secure value in production.');
    }
  }

  private set(key: string, value: string): void {
    this.config.set(key, value);
  }

  get(key: string): string {
    return this.config.get(key) || '';
  }

  getNumber(key: string): number {
    return parseInt(this.get(key), 10) || 0;
  }

  getBoolean(key: string): boolean {
    return this.get(key).toLowerCase() === 'true';
  }

  private generateSecret(): string {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36)[2]
    ).join('');
  }

  // Safe access to sensitive values (never logs)
  getCloudflareAccountId(): string {
    return this.get('CLOUDFLARE_ACCOUNT_ID');
  }

  getCloudflareApiKey(): string {
    return this.get('CLOUDFLARE_API_KEY');
  }

  // Web search credentials (never logged)
  getBraveSearchApiKey(): string {
    return this.get('BRAVE_SEARCH_API_KEY');
  }

  getTavilyApiKey(): string {
    return this.get('TAVILY_API_KEY');
  }

  getSearchProvider(): string {
    return this.get('SEARCH_PROVIDER');
  }

  // Non-sensitive getters (can be logged)
  getPort(): number {
    return this.getNumber('PORT');
  }

  getEnv(): string {
    return this.get('NODE_ENV');
  }

  isDevelopment(): boolean {
    return this.getEnv() === 'development';
  }

  isProduction(): boolean {
    return this.getEnv() === 'production';
  }

  // Export config as safe object (never includes secrets)
  toSafeObject(): Record<string, string | number | boolean> {
    return {
      PORT: this.getPort(),
      NODE_ENV: this.getEnv(),
      HOST: this.get('HOST'),
      WORKSPACE_ROOT: this.get('WORKSPACE_ROOT'),
      MAX_WORKSPACE_SIZE: this.getNumber('MAX_WORKSPACE_SIZE'),
      AGENT_MAX_ITERATIONS: this.getNumber('AGENT_MAX_ITERATIONS'),
      AGENT_TIMEOUT: this.getNumber('AGENT_TIMEOUT'),
      AGENT_AUTO_APPROVE_SAFE: this.getBoolean('AGENT_AUTO_APPROVE_SAFE'),
      AGENT_REQUIRE_APPROVAL_DESTRUCTIVE: this.getBoolean('AGENT_REQUIRE_APPROVAL_DESTRUCTIVE'),
      LOG_LEVEL: this.get('LOG_LEVEL'),
    };
  }
}

export const config = Config.getInstance();
