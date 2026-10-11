import * as crypto from 'crypto';

export interface SecurityConfig {
  jwtSecret: string;
  sessionSecret: string;
  rateLimitWindow: number;
  rateLimitMax: number;
  enableCSRF: boolean;
  enableXSS: boolean;
}

export interface SecurityAudit {
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  ip?: string;
  userId?: string;
}

/**
 * Security Manager
 * Purpose: Handle security operations for DevForge Studio
 * Features:
 * - JWT token generation/validation
 * - Session management
 * - Rate limiting
 * - CSRF protection
 * - XSS prevention
 * - Security auditing
 * - Input sanitization
 */
export class SecurityManager {
  private config: SecurityConfig;
  private auditLog: SecurityAudit[] = [];
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  generateJWT(payload: any, expiresIn: string = '1h'): string {
    // In a real implementation, use jsonwebtoken library
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Date.now();
    const exp = now + this.parseExpiration(expiresIn);

    const tokenPayload = {
      ...payload,
      iat: Math.floor(now / 1000),
      exp: Math.floor(exp / 1000),
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(tokenPayload));
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  validateJWT(token: string): any | null {
    try {
      const [header, payload, signature] = token.split('.');

      const expectedSignature = this.sign(`${header}.${payload}`);
      if (signature !== expectedSignature) {
        this.logAudit('JWT validation failed', 'high', 'Invalid signature');
        return null;
      }

      const decoded = JSON.parse(this.base64UrlDecode(payload));
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp < now) {
        this.logAudit('JWT validation failed', 'medium', 'Token expired');
        return null;
      }

      return decoded;
    } catch (error) {
      this.logAudit('JWT validation error', 'high', String(error));
      return null;
    }
  }

  generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateSessionToken(token: string): boolean {
    // In a real implementation, check against session store
    return token.length === 64;
  }

  checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow,
      });
      return true;
    }

    if (record.count >= this.config.rateLimitMax) {
      this.logAudit('Rate limit exceeded', 'medium', `Identifier: ${identifier}`);
      return false;
    }

    record.count++;
    return true;
  }

  generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateCSRFToken(token: string, sessionToken: string): boolean {
    // In a real implementation, validate against session
    return token.length === 64;
  }

  sanitizeInput(input: string): string {
    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  sanitizeHTML(html: string): string {
    // In a real implementation, use DOMPurify or similar
    return this.sanitizeInput(html);
  }

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.config.sessionSecret, 'hex'), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.config.sessionSecret, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  logAudit(type: string, severity: SecurityAudit['severity'], details: string, ip?: string, userId?: string): void {
    const audit: SecurityAudit = {
      timestamp: new Date(),
      type,
      severity,
      details,
      ip,
      userId,
    };

    this.auditLog.push(audit);

    // Keep only last 1000 audit entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  getAuditLog(limit: number = 100): SecurityAudit[] {
    return this.auditLog.slice(-limit);
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  private sign(data: string): string {
    return crypto
      .createHmac('sha256', this.config.jwtSecret)
      .update(data)
      .digest('base64url');
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str).toString('base64url');
  }

  private base64UrlDecode(str: string): string {
    return Buffer.from(str, 'base64url').toString('utf-8');
  }

  private parseExpiration(exp: string): number {
    const unit = exp.slice(-1);
    const value = parseInt(exp.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000; // Default 1 hour
    }
  }
}
