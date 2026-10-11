// Secret Scanner - Enhanced detection of sensitive information
export interface SecretMatch {
  type: string;
  value: string;
  path: string;
  line: number;
  column: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: string;
}

export interface ScanResult {
  path: string;
  hasSecrets: boolean;
  matches: SecretMatch[];
  isSensitiveFile: boolean;
}

export class SecretScanner {
  private patterns: Array<{
    type: string;
    pattern: RegExp;
    severity: SecretMatch['severity'];
  }> = [
    // API Keys
    {
      type: 'api-key',
      pattern: /(?:api[_-]?key|apikey|api-key)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
      severity: 'critical',
    },
    {
      type: 'openai-key',
      pattern: /sk-[a-zA-Z0-9]{48}/gi,
      severity: 'critical',
    },
    {
      type: 'aws-access-key',
      pattern: /AKIA[0-9A-Z]{16}/gi,
      severity: 'critical',
    },
    {
      type: 'aws-secret-key',
      pattern: /[a-zA-Z0-9+/]{40}/gi,
      severity: 'critical',
    },
    // Secrets
    {
      type: 'secret-key',
      pattern: /(?:secret[_-]?key|secretkey|secret-key)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
      severity: 'critical',
    },
    {
      type: 'private-key',
      pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
      severity: 'critical',
    },
    {
      type: 'password',
      pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]?[a-zA-Z0-9\-_@#$%^&*]{8,}['"]?/gi,
      severity: 'high',
    },
    // Database URLs
    {
      type: 'database-url',
      pattern: /(?:mongodb|postgres|mysql|mariadb|redis|elastic):\/\/[^'"\s]+/gi,
      severity: 'high',
    },
    // Tokens
    {
      type: 'jwt-secret',
      pattern: /(?:jwt[_-]?secret|jwtsecret)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
      severity: 'critical',
    },
    {
      type: 'bearer-token',
      pattern: /Bearer\s+[a-zA-Z0-9\-_]{20,}/gi,
      severity: 'high',
    },
    {
      type: 'oauth-token',
      pattern: /oauth[_-]?token\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
      severity: 'high',
    },
    // Service credentials
    {
      type: 'service-account',
      pattern: /service[_-]?account[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
      severity: 'critical',
    },
    {
      type: 'refresh-token',
      pattern: /refresh[_-]?token\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
      severity: 'high',
    },
    // Cloud providers
    {
      type: 'google-cloud-key',
      pattern: /['"]?type['"]?\s*:\s*['"]service_account['"]/gi,
      severity: 'high',
    },
    {
      type: 'azure-key',
      pattern: /azure[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{32,}['"]?/gi,
      severity: 'high',
    },
    // Webhooks
    {
      type: 'webhook-url',
      pattern: /webhook[_-]?url\s*[:=]\s*['"]?https?:\/\/[^'"\s]+['"]?/gi,
      severity: 'medium',
    },
    // Certificates
    {
      type: 'certificate',
      pattern: /-----BEGIN\s+CERTIFICATE-----/gi,
      severity: 'medium',
    },
  ];

  private sensitiveFiles: string[] = [
    '.env',
    '.env.local',
    '.env.*.local',
    '.env.production',
    '.env.development',
    '.env.test',
    '.env.staging',
    'secrets',
    'credentials',
    'config/secrets',
    '*.pem',
    '*.key',
    '*.cert',
    '*.crt',
    'id_rsa',
    'id_ed25519',
    'id_dsa',
    'id_ecdsa',
    '*.secret',
    '*.credentials',
  ];

  scan(content: string, filePath: string): ScanResult {
    const matches: SecretMatch[] = [];
    const lines = content.split('\n');

    // Check if file itself is sensitive
    const isSensitiveFile = this.isSensitiveFile(filePath);

    // Scan content for secrets
    for (const { type, pattern, severity } of this.patterns) {
      let match;

      while ((match = pattern.exec(content)) !== null) {
        const lineIndex = content.substring(0, match.index).split('\n').length - 1;
        const line = lines[lineIndex] || '';
        const column = match.index - content.lastIndexOf('\n', match.index - 1) - 1;

        matches.push({
          type,
          value: this.redactValue(match[0]),
          path: filePath,
          line: lineIndex + 1,
          column,
          severity,
          pattern: pattern.source,
        });
      }
    }

    return {
      path: filePath,
      hasSecrets: matches.length > 0 || isSensitiveFile,
      matches,
      isSensitiveFile,
    };
  }

  scanFile(filePath: string): ScanResult {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.scan(content, filePath);
    } catch (error) {
      return {
        path: filePath,
        hasSecrets: false,
        matches: [],
        isSensitiveFile: this.isSensitiveFile(filePath),
      };
    }
  }

  isSensitiveFile(filePath: string): boolean {
    const filename = filePath.split('/').pop() || filePath;

    return this.sensitiveFiles.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      return regex.test(filename) || regex.test(filePath);
    });
  }

  redactSecrets(content: string): string {
    let redacted = content;

    for (const { pattern } of this.patterns) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }

    return redacted;
  }

  redactValue(value: string): string {
    // Show first 4 and last 4 characters for context
    if (value.length <= 16) {
      return '[REDACTED]';
    }

    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }

  getSecretsBySeverity(matches: SecretMatch[], severity: SecretMatch['severity']): SecretMatch[] {
    return matches.filter(m => m.severity === severity);
  }

  getSecretsByType(matches: SecretMatch[], type: string): SecretMatch[] {
    return matches.filter(m => m.type === type);
  }

  getSecretCountByType(matches: SecretMatch[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const match of matches) {
      counts.set(match.type, (counts.get(match.type) || 0) + 1);
    }

    return counts;
  }

  generateReport(results: ScanResult[]): string {
    const totalFiles = results.length;
    const filesWithSecrets = results.filter(r => r.hasSecrets).length;
    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

    const bySeverity = new Map<SecretMatch['severity'], number>();
    const byType = new Map<string, number>();

    for (const result of results) {
      for (const match of result.matches) {
        bySeverity.set(match.severity, (bySeverity.get(match.severity) || 0) + 1);
        byType.set(match.type, (byType.get(match.type) || 0) + 1);
      }
    }

    let report = `Secret Scan Report\n`;
    report += `================\n`;
    report += `Total files scanned: ${totalFiles}\n`;
    report += `Files with secrets: ${filesWithSecrets}\n`;
    report += `Total secret matches: ${totalMatches}\n\n`;

    report += `By Severity:\n`;
    for (const [severity, count] of bySeverity) {
      report += `  ${severity}: ${count}\n`;
    }

    report += `\nBy Type:\n`;
    for (const [type, count] of byType) {
      report += `  ${type}: ${count}\n`;
    }

    return report;
  }
}
