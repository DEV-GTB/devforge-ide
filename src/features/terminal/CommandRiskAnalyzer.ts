// Command Risk Analyzer - Analyzes command risk levels
export interface RiskAnalysis {
  riskLevel: 'safe' | 'moderate' | 'high' | 'dangerous';
  reasons: string[];
  requiresApproval: boolean;
  suggestion?: string;
}

export class CommandRiskAnalyzer {
  private dangerousPatterns: DangerousPattern[] = [
    {
      pattern: /rm\s+-rf/i,
      riskLevel: 'dangerous',
      reason: 'Force delete directory - irreversible data loss',
      requiresApproval: true,
    },
    {
      pattern: /rm\s+-f/i,
      riskLevel: 'high',
      reason: 'Force delete without confirmation',
      requiresApproval: true,
    },
    {
      pattern: /del\s+\/f/i,
      riskLevel: 'dangerous',
      reason: 'Force delete on Windows - irreversible',
      requiresApproval: true,
    },
    {
      pattern: /format\s+/i,
      riskLevel: 'dangerous',
      reason: 'Format disk - complete data loss',
      requiresApproval: true,
    },
    {
      pattern: /shutdown/i,
      riskLevel: 'high',
      reason: 'System shutdown',
      requiresApproval: true,
    },
    {
      pattern: /reboot/i,
      riskLevel: 'high',
      reason: 'System reboot',
      requiresApproval: true,
    },
    {
      pattern: /dd\s+if=/i,
      riskLevel: 'dangerous',
      reason: 'Disk write - can destroy data',
      requiresApproval: true,
    },
    {
      pattern: /mkfs\./i,
      riskLevel: 'dangerous',
      reason: 'Create filesystem - destroys data',
      requiresApproval: true,
    },
    {
      pattern: /:\s*\(\s*\)/i,
      riskLevel: 'dangerous',
      reason: 'Fork bomb - can crash system',
      requiresApproval: true,
    },
    {
      pattern: /chmod\s+777/i,
      riskLevel: 'moderate',
      reason: 'Makes files world-writable - security risk',
      requiresApproval: true,
    },
    {
      pattern: /sudo\s+rm/i,
      riskLevel: 'dangerous',
      reason: 'Root delete - system-wide impact',
      requiresApproval: true,
    },
    {
      pattern: />\s*\/dev\/\w+/i,
      riskLevel: 'moderate',
      reason: 'Overwriting device files',
      requiresApproval: true,
    },
    {
      pattern: /curl\s+\|\s*(sh|bash)/i,
      riskLevel: 'high',
      reason: 'Pipe curl to shell - arbitrary code execution',
      requiresApproval: true,
    },
    {
      pattern: /wget\s+\|\s*(sh|bash)/i,
      riskLevel: 'high',
      reason: 'Pipe wget to shell - arbitrary code execution',
      requiresApproval: true,
    },
    {
      pattern: /eval\s+\$/i,
      riskLevel: 'high',
      reason: 'Eval with variable - code injection risk',
      requiresApproval: true,
    },
  ];

  private safePatterns: SafePattern[] = [
    { pattern: /^ls$/, reason: 'List files - safe' },
    { pattern: /^pwd$/, reason: 'Show directory - safe' },
    { pattern: /^cat\s+/, reason: 'Read file - safe' },
    { pattern: /^head\s+/, reason: 'Read file start - safe' },
    { pattern: /^tail\s+/, reason: 'Read file end - safe' },
    { pattern: /^grep\s+/, reason: 'Search in file - safe' },
    { pattern: /^git\s+status$/, reason: 'Git status - safe' },
    { pattern: /^git\s+log$/, reason: 'Git log - safe' },
    { pattern: /^git\s+diff$/, reason: 'Git diff - safe' },
    { pattern: /^git\s+branch$/, reason: 'Git branch - safe' },
    { pattern: /^npm\s+--version$/, reason: 'Check version - safe' },
    { pattern: /^node\s+--version$/, reason: 'Check version - safe' },
    { pattern: /^python\s+--version$/, reason: 'Check version - safe' },
    { pattern: /^pip\s+--version$/, reason: 'Check version - safe' },
    { pattern: /^echo\s+/, reason: 'Echo - safe' },
  ];

  analyze(command: string): RiskAnalysis {
    const reasons: string[] = [];
    let riskLevel: 'safe' | 'moderate' | 'high' | 'dangerous' = 'safe';
    let requiresApproval = false;

    // Check for dangerous patterns
    for (const dangerous of this.dangerousPatterns) {
      if (dangerous.pattern.test(command)) {
        riskLevel = dangerous.riskLevel;
        reasons.push(dangerous.reason);
        requiresApproval = dangerous.requiresApproval;
      }
    }

    // If not dangerous, check if safe
    if (riskLevel === 'safe') {
      const isSafe = this.safePatterns.some(safe => safe.pattern.test(command));
      if (isSafe) {
        const safePattern = this.safePatterns.find(safe => safe.pattern.test(command));
        reasons.push(safePattern?.reason || 'Recognized safe command');
      } else {
        // Unknown command - moderate risk
        riskLevel = 'moderate';
        requiresApproval = true;
        reasons.push('Unknown command pattern - review recommended');
      }
    }

    // Additional checks
    if (command.includes('sudo') && riskLevel !== 'dangerous') {
      riskLevel = 'high';
      requiresApproval = true;
      reasons.push('Sudo command - elevated privileges');
    }

    if (command.includes('chmod') && command.includes('777') && riskLevel !== 'dangerous') {
      riskLevel = 'moderate';
      requiresApproval = true;
      reasons.push('Changing permissions to 777 - security concern');
    }

    if (command.includes('npm') && command.includes('uninstall')) {
      riskLevel = 'moderate';
      requiresApproval = true;
      reasons.push('Package uninstall - verify dependencies');
    }

    return {
      riskLevel,
      reasons,
      requiresApproval,
      suggestion: this.getSuggestion(riskLevel, command),
    };
  }

  private getSuggestion(riskLevel: string, command: string): string {
    switch (riskLevel) {
      case 'safe':
        return 'Safe to execute';
      case 'moderate':
        return 'Review command before execution';
      case 'high':
        return 'High risk - strongly recommend approval';
      case 'dangerous':
        return 'DANGEROUS - manual review required';
      default:
        return 'Review recommended';
    }
  }

  analyzeMultiple(commands: string[]): RiskAnalysis {
    const allReasons: string[] = [];
    let maxRiskLevel: 'safe' | 'moderate' | 'high' | 'dangerous' = 'safe';
    let requiresApproval = false;

    for (const cmd of commands) {
      const analysis = this.analyze(cmd);
      allReasons.push(...analysis.reasons);
      requiresApproval = requiresApproval || analysis.requiresApproval;

      // Update max risk level
      const riskOrder = ['safe', 'moderate', 'high', 'dangerous'];
      if (riskOrder.indexOf(analysis.riskLevel) > riskOrder.indexOf(maxRiskLevel)) {
        maxRiskLevel = analysis.riskLevel;
      }
    }

    return {
      riskLevel: maxRiskLevel,
      reasons: [...new Set(allReasons)], // Deduplicate
      requiresApproval,
      suggestion: this.getSuggestion(maxRiskLevel, 'multiple commands'),
    };
  }
}

interface DangerousPattern {
  pattern: RegExp;
  riskLevel: 'moderate' | 'high' | 'dangerous';
  reason: string;
  requiresApproval: boolean;
}

interface SafePattern {
  pattern: RegExp;
  reason: string;
}
