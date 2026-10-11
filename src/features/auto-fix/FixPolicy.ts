// Fix Policy Engine - Controls what operations are allowed
import { Fix } from './FixOrchestrator';

export enum ApprovalLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum FixCategory {
  SYNTAX = 'SYNTAX',
  TYPE = 'TYPE',
  IMPORT = 'IMPORT',
  DEPENDENCY = 'DEPENDENCY',
  LINT = 'LINT',
  BUILD = 'BUILD',
  TEST = 'TEST',
  RUNTIME = 'RUNTIME',
  SECURITY = 'SECURITY',
  DATABASE = 'DATABASE',
  DEPLOYMENT = 'DEPLOYMENT',
}

export interface PolicyRule {
  id: string;
  category: FixCategory;
  approvalLevel: ApprovalLevel;
  maxFilesChanged?: number;
  allowedPaths?: string[];
  blockedPaths?: string[];
  requiresReview?: boolean;
  description: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  approvalLevel: ApprovalLevel;
  requiresManualApproval: boolean;
}

export class FixPolicy {
  private rules: Map<FixCategory, PolicyRule> = new Map();
  private mode: 'strict' | 'standard' | 'permissive' = 'standard';

  constructor(mode: 'strict' | 'standard' | 'permissive' = 'standard') {
    this.mode = mode;
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Default policies based on category
    this.rules.set(FixCategory.SYNTAX, {
      id: 'syntax-rule',
      category: FixCategory.SYNTAX,
      approvalLevel: ApprovalLevel.LOW,
      maxFilesChanged: 1,
      requiresReview: false,
      description: 'Syntax errors can be auto-fixed with low risk',
    });

    this.rules.set(FixCategory.TYPE, {
      id: 'type-rule',
      category: FixCategory.TYPE,
      approvalLevel: ApprovalLevel.LOW,
      maxFilesChanged: 3,
      requiresReview: false,
      description: 'Type errors can be auto-fixed when confident',
    });

    this.rules.set(FixCategory.IMPORT, {
      id: 'import-rule',
      category: FixCategory.IMPORT,
      approvalLevel: ApprovalLevel.LOW,
      maxFilesChanged: 1,
      requiresReview: false,
      description: 'Import errors are usually safe to fix',
    });

    this.rules.set(FixCategory.DEPENDENCY, {
      id: 'dependency-rule',
      category: FixCategory.DEPENDENCY,
      approvalLevel: ApprovalLevel.MEDIUM,
      maxFilesChanged: 2,
      requiresReview: true,
      description: 'Dependency changes require review',
    });

    this.rules.set(FixCategory.LINT, {
      id: 'lint-rule',
      category: FixCategory.LINT,
      approvalLevel: ApprovalLevel.LOW,
      maxFilesChanged: 5,
      requiresReview: false,
      description: 'Lint errors are generally safe to fix',
    });

    this.rules.set(FixCategory.BUILD, {
      id: 'build-rule',
      category: FixCategory.BUILD,
      approvalLevel: ApprovalLevel.MEDIUM,
      maxFilesChanged: 5,
      requiresReview: true,
      description: 'Build errors may require careful review',
    });

    this.rules.set(FixCategory.TEST, {
      id: 'test-rule',
      category: FixCategory.TEST,
      approvalLevel: ApprovalLevel.MEDIUM,
      maxFilesChanged: 3,
      requiresReview: true,
      description: 'Test changes should be reviewed',
    });

    this.rules.set(FixCategory.RUNTIME, {
      id: 'runtime-rule',
      category: FixCategory.RUNTIME,
      approvalLevel: ApprovalLevel.MEDIUM,
      maxFilesChanged: 5,
      requiresReview: true,
      description: 'Runtime fixes require verification',
    });

    this.rules.set(FixCategory.SECURITY, {
      id: 'security-rule',
      category: FixCategory.SECURITY,
      approvalLevel: ApprovalLevel.CRITICAL,
      maxFilesChanged: 0,
      requiresReview: true,
      description: 'Security changes always require manual approval',
    });

    this.rules.set(FixCategory.DATABASE, {
      id: 'database-rule',
      category: FixCategory.DATABASE,
      approvalLevel: ApprovalLevel.HIGH,
      maxFilesChanged: 1,
      requiresReview: true,
      description: 'Database changes require manual approval',
    });

    this.rules.set(FixCategory.DEPLOYMENT, {
      id: 'deployment-rule',
      category: FixCategory.DEPLOYMENT,
      approvalLevel: ApprovalLevel.CRITICAL,
      maxFilesChanged: 0,
      requiresReview: true,
      description: 'Deployment changes are never auto-approved',
    });
  }

  canModifyFile(filePath: string): boolean {
    // Block sensitive files
    const blockedPatterns = [
      '.env',
      '.env.local',
      '.env.production',
      'credentials',
      'secrets',
      'private.key',
      '.pem',
      '.cert',
      '.crt',
    ];

    const lowerPath = filePath.toLowerCase();
    for (const pattern of blockedPatterns) {
      if (lowerPath.includes(pattern)) {
        return false;
      }
    }

    // Block files outside project
    if (filePath.includes('..')) {
      return false;
    }

    return true;
  }

  canRunCommand(command: string): boolean {
    // Allow safe commands
    const allowedCommands = ['npm', 'node', 'pnpm', 'yarn', 'git', 'tsc', 'eslint', 'vitest', 'jest'];

    const commandParts = command.trim().split(/\s+/);
    const baseCommand = commandParts[0];

    return allowedCommands.includes(baseCommand);
  }

  canInstallDependency(packageName: string): boolean {
    // Block dangerous packages
    const blockedPatterns = ['eval', 'exec', 'system', 'shell'];

    const lowerName = packageName.toLowerCase();
    for (const pattern of blockedPatterns) {
      if (lowerName.includes(pattern)) {
        return false;
      }
    }

    return true;
  }

  evaluateFix(fix: Fix, category: FixCategory): PolicyDecision {
    // Check file modification permission
    if (!this.canModifyFile(fix.file)) {
      return {
        allowed: false,
        reason: `File ${fix.file} is protected or contains sensitive content`,
        approvalLevel: ApprovalLevel.CRITICAL,
        requiresManualApproval: true,
      };
    }

    // Get rule for category
    const rule = this.rules.get(category);
    if (!rule) {
      return {
        allowed: false,
        reason: `No policy rule defined for category: ${category}`,
        approvalLevel: ApprovalLevel.HIGH,
        requiresManualApproval: true,
      };
    }

    // Mode-based overrides
    if (this.mode === 'strict') {
      return {
        allowed: false,
        reason: 'Strict mode: all fixes require manual approval',
        approvalLevel: rule.approvalLevel,
        requiresManualApproval: true,
      };
    }

    if (this.mode === 'permissive') {
      return {
        allowed: true,
        reason: 'Permissive mode: fix auto-approved',
        approvalLevel: ApprovalLevel.LOW,
        requiresManualApproval: false,
      };
    }

    // Standard mode: apply rules
    if (rule.requiresReview) {
      return {
        allowed: false,
        reason: `Category ${category} requires manual review`,
        approvalLevel: rule.approvalLevel,
        requiresManualApproval: true,
      };
    }

    if (rule.maxFilesChanged && rule.maxFilesChanged === 0) {
      return {
        allowed: false,
        reason: `Category ${category} does not allow automatic fixes`,
        approvalLevel: rule.approvalLevel,
        requiresManualApproval: true,
      };
    }

    return {
      allowed: true,
      reason: `Category ${category} allows automatic fixes`,
      approvalLevel: rule.approvalLevel,
      requiresManualApproval: false,
    };
  }

  evaluateBatchFix(fixes: Fix[], category: FixCategory): PolicyDecision {
    const rule = this.rules.get(category);
    if (!rule) {
      return {
        allowed: false,
        reason: `No policy rule defined for category: ${category}`,
        approvalLevel: ApprovalLevel.HIGH,
        requiresManualApproval: true,
      };
    }

    // Check file count limit
    if (rule.maxFilesChanged && fixes.length > rule.maxFilesChanged) {
      return {
        allowed: false,
        reason: `Batch fix changes ${fixes.length} files, but limit is ${rule.maxFilesChanged}`,
        approvalLevel: rule.approvalLevel,
        requiresManualApproval: true,
      };
    }

    // Check each file
    for (const fix of fixes) {
      if (!this.canModifyFile(fix.file)) {
        return {
          allowed: false,
          reason: `File ${fix.file} is protected`,
          approvalLevel: ApprovalLevel.CRITICAL,
          requiresManualApproval: true,
        };
      }
    }

    return {
      allowed: true,
      reason: `Batch fix approved for ${fixes.length} files`,
      approvalLevel: rule.approvalLevel,
      requiresManualApproval: rule.requiresReview,
    };
  }

  setMode(mode: 'strict' | 'standard' | 'permissive'): void {
    this.mode = mode;
  }

  getMode(): string {
    return this.mode;
  }

  getRule(category: FixCategory): PolicyRule | undefined {
    return this.rules.get(category);
  }

  getAllRules(): PolicyRule[] {
    return Array.from(this.rules.values());
  }
}
