export type CommandRiskLevel = 'safe' | 'moderate' | 'dangerous' | 'system';

export interface CommandRule {
  pattern: string | RegExp;
  riskLevel: CommandRiskLevel;
  description: string;
  requiresApproval: boolean;
}

export class CommandClassifier {
  private rules: CommandRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // === SAFE COMMANDS (Read-only inspection) ===
    this.addRule({
      pattern: /^(pwd|whoami|hostname|ver|date|echo\s)/i,
      riskLevel: 'safe',
      description: 'System information command',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^(ls|dir|tree)/i,
      riskLevel: 'safe',
      description: 'List directory contents',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^(node|npm|python|pip|go|rust|cargo|java|mvn|git)\s+--version$/i,
      riskLevel: 'safe',
      description: 'Check version',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^cat\s/i,
      riskLevel: 'safe',
      description: 'Read file contents',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^Get-Content\s/i,
      riskLevel: 'safe',
      description: 'Read file contents (PowerShell)',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^grep\s/i,
      riskLevel: 'safe',
      description: 'Search in files',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^Select-String\s/i,
      riskLevel: 'safe',
      description: 'Search in files (PowerShell)',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^find\s/i,
      riskLevel: 'safe',
      description: 'Find files',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^Get-ChildItem\s/i,
      riskLevel: 'safe',
      description: 'List files (PowerShell)',
      requiresApproval: false,
    });

    // === SAFE PROJECT TESTING ===
    this.addRule({
      pattern: /^npm\s+(test|run\s+(lint|typecheck|build))/i,
      riskLevel: 'safe',
      description: 'Run project tests and checks',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^python\s+-m\s+(pytest|compileall)/i,
      riskLevel: 'safe',
      description: 'Run Python tests',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^cargo\s+(check|test|build)/i,
      riskLevel: 'safe',
      description: 'Run Rust checks and tests',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^go\s+(test|vet|build)/i,
      riskLevel: 'safe',
      description: 'Run Go tests and checks',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^mvn\s+(test|package)/i,
      riskLevel: 'safe',
      description: 'Run Maven tests',
      requiresApproval: false,
    });

    // === SAFE GIT COMMANDS ===
    this.addRule({
      pattern: /^git\s+(status|diff|log|branch|show|blame)/i,
      riskLevel: 'safe',
      description: 'Inspect git state',
      requiresApproval: false,
    });

    // === SAFE API TESTING ===
    this.addRule({
      pattern: /^curl\s+-?I\s/i,
      riskLevel: 'safe',
      description: 'Check HTTP headers',
      requiresApproval: false,
    });

    this.addRule({
      pattern: /^curl\s+(http|https):\/\/localhost/i,
      riskLevel: 'safe',
      description: 'Test local server',
      requiresApproval: false,
    });

    // === MODERATE COMMANDS (Modifies project but generally safe) ===
    this.addRule({
      pattern: /^npm\s+(install|uninstall|update)/i,
      riskLevel: 'moderate',
      description: 'Package management',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^pip\s+(install|uninstall)/i,
      riskLevel: 'moderate',
      description: 'Python package management',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^cargo\s+(add|remove)/i,
      riskLevel: 'moderate',
      description: 'Rust dependency management',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^go\s+(get|mod)/i,
      riskLevel: 'moderate',
      description: 'Go dependency management',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(mkdir|md)\s/i,
      riskLevel: 'moderate',
      description: 'Create directory',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^New-Item\s/i,
      riskLevel: 'moderate',
      description: 'Create item (PowerShell)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(touch|echo\s+.*>)/i,
      riskLevel: 'moderate',
      description: 'Create file',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(cp|copy|mv|move|ren|rename)\s/i,
      riskLevel: 'moderate',
      description: 'Copy/move/rename files',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^git\s+(add|commit|push|pull|checkout|merge|rebase)/i,
      riskLevel: 'moderate',
      description: 'Git operations',
      requiresApproval: true,
    });

    // === DANGEROUS COMMANDS (Destructive) ===
    this.addRule({
      pattern: /^rm\s+(-rf|--recursive)\s/i,
      riskLevel: 'dangerous',
      description: 'Recursive delete (dangerous)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^rm\s+(-rf|--recursive)\s+\/$/i,
      riskLevel: 'system',
      description: 'Delete root filesystem (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^rm\s+(-rf|--recursive)\s+\.$/i,
      riskLevel: 'system',
      description: 'Delete current directory (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(del|erase)\s+\/s\s+\/q/i,
      riskLevel: 'dangerous',
      description: 'Recursive delete Windows (dangerous)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(rmdir|rd)\s+\/s\s+\/q/i,
      riskLevel: 'dangerous',
      description: 'Recursive directory delete Windows (dangerous)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^rm\s/i,
      riskLevel: 'dangerous',
      description: 'Delete files',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^del\s/i,
      riskLevel: 'dangerous',
      description: 'Delete files Windows',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^rmdir\s/i,
      riskLevel: 'dangerous',
      description: 'Delete directory',
      requiresApproval: true,
    });

    // === SYSTEM COMMANDS (Require explicit approval) ===
    this.addRule({
      pattern: /^(format|diskpart|fdisk)/i,
      riskLevel: 'system',
      description: 'Disk operations (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(shutdown|reboot|restart|halt|poweroff)/i,
      riskLevel: 'system',
      description: 'System shutdown/reboot (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(sudo|su)\s/i,
      riskLevel: 'system',
      description: 'Elevated privileges (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^chmod\s+777/i,
      riskLevel: 'system',
      description: 'Make files world-writable (dangerous)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^chown\s/i,
      riskLevel: 'system',
      description: 'Change file ownership',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^curl.*\|\s*(sh|bash|zsh|fish|pwsh|powershell)/i,
      riskLevel: 'system',
      description: 'Pipe curl to shell (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^wget.*\|\s*(sh|bash|zsh|fish|pwsh|powershell)/i,
      riskLevel: 'system',
      description: 'Pipe wget to shell (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^powershell\s+-EncodedCommand/i,
      riskLevel: 'system',
      description: 'Encoded PowerShell command (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^powershell\s+-ExecutionPolicy\s+Bypass/i,
      riskLevel: 'system',
      description: 'Bypass execution policy (dangerous)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(iptables|ufw|firewall-cmd)/i,
      riskLevel: 'system',
      description: 'Firewall configuration (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(ssh|scp|sftp)/i,
      riskLevel: 'system',
      description: 'SSH operations (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(crontab|at|systemctl|service)/i,
      riskLevel: 'system',
      description: 'System service management (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^(useradd|userdel|usermod|groupadd|groupdel)/i,
      riskLevel: 'system',
      description: 'User management (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^net\s+(user|group|localgroup)/i,
      riskLevel: 'system',
      description: 'Windows user management (CRITICAL)',
      requiresApproval: true,
    });

    this.addRule({
      pattern: /^reg\s+(add|delete|copy)/i,
      riskLevel: 'system',
      description: 'Windows registry (CRITICAL)',
      requiresApproval: true,
    });
  }

  private addRule(rule: CommandRule): void {
    this.rules.push(rule);
  }

  classify(command: string): {
    riskLevel: CommandRiskLevel;
    description: string;
    requiresApproval: boolean;
    matched: boolean;
  } {
    // Check each rule in order
    for (const rule of this.rules) {
      const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'i');
      if (pattern.test(command)) {
        return {
          riskLevel: rule.riskLevel,
          description: rule.description,
          requiresApproval: rule.requiresApproval,
          matched: true,
        };
      }
    }

    // Default: unknown commands are treated as moderate and require approval
    return {
      riskLevel: 'moderate',
      description: 'Unknown command',
      requiresApproval: true,
      matched: false,
    };
  }

  isSafe(command: string): boolean {
    const classification = this.classify(command);
    return classification.riskLevel === 'safe' && !classification.requiresApproval;
  }

  isDangerous(command: string): boolean {
    const classification = this.classify(command);
    return classification.riskLevel === 'dangerous' || classification.riskLevel === 'system';
  }

  requiresApproval(command: string): boolean {
    const classification = this.classify(command);
    return classification.requiresApproval;
  }

  getSafeCommands(): string[] {
    return this.rules
      .filter(r => r.riskLevel === 'safe' && !r.requiresApproval)
      .map(r => (r.pattern instanceof RegExp ? r.pattern.source : r.pattern));
  }

  getDangerousCommands(): string[] {
    return this.rules
      .filter(r => r.riskLevel === 'dangerous' || r.riskLevel === 'system')
      .map(r => (r.pattern instanceof RegExp ? r.pattern.source : r.pattern));
  }
}
