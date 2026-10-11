// Context Budget Manager - Manages token limits for AI context
export interface BudgetAllocation {
  system: number;
  task: number;
  projectSummary: number;
  retrievedCode: number;
  symbols: number;
  relationships: number;
  memories: number;
  decisions: number;
  tests: number;
  buffer: number;
}

export interface BudgetReport {
  totalBudget: number;
  allocated: number;
  remaining: number;
  allocation: BudgetAllocation;
  usage: BudgetAllocation;
  overage: number;
}

export class ContextBudgetManager {
  private defaultAllocation: BudgetAllocation = {
    system: 5000,
    task: 2000,
    projectSummary: 3000,
    retrievedCode: 70000,
    symbols: 5000,
    relationships: 3000,
    memories: 3000,
    decisions: 2000,
    tests: 5000,
    buffer: 10000,
  };

  private maxBudget: number = 100000;

  constructor(maxBudget?: number) {
    if (maxBudget) {
      this.maxBudget = maxBudget;
      this.recalculateAllocation();
    }
  }

  setMaxBudget(max: number): void {
    this.maxBudget = max;
    this.recalculateAllocation();
  }

  getMaxBudget(): number {
    return this.maxBudget;
  }

  getAllocation(): BudgetAllocation {
    return { ...this.defaultAllocation };
  }

  setAllocation(allocation: Partial<BudgetAllocation>): void {
    this.defaultAllocation = { ...this.defaultAllocation, ...allocation };
  }

  calculateUsage(contextPack: any): BudgetAllocation {
    const usage: BudgetAllocation = {
      system: 0,
      task: 0,
      projectSummary: 0,
      retrievedCode: 0,
      symbols: 0,
      relationships: 0,
      memories: 0,
      decisions: 0,
      tests: 0,
      buffer: 0,
    };

    // Project summary
    if (contextPack.projectSummary) {
      usage.projectSummary = this.estimateTokens(JSON.stringify(contextPack.projectSummary));
    }

    // Files
    if (contextPack.files) {
      for (const file of contextPack.files) {
        if (file.content) {
          usage.retrievedCode += this.estimateTokens(file.content);
        } else {
          usage.retrievedCode += this.estimateTokens(file.path);
        }
      }
    }

    // Symbols
    if (contextPack.symbols) {
      usage.symbols = this.estimateTokens(JSON.stringify(contextPack.symbols));
    }

    // Relationships
    if (contextPack.relationships) {
      usage.relationships = this.estimateTokens(JSON.stringify(contextPack.relationships));
    }

    // Memories
    if (contextPack.memories) {
      usage.memories = this.estimateTokens(JSON.stringify(contextPack.memories));
    }

    // Decisions
    if (contextPack.decisions) {
      usage.decisions = this.estimateTokens(JSON.stringify(contextPack.decisions));
    }

    // Tests
    if (contextPack.tests) {
      usage.tests = this.estimateTokens(JSON.stringify(contextPack.tests));
    }

    return usage;
  }

  generateReport(contextPack: any): BudgetReport {
    const allocation = this.getAllocation();
    const usage = this.calculateUsage(contextPack);

    const allocated = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    const used = Object.values(usage).reduce((sum, val) => sum + val, 0);
    const remaining = this.maxBudget - used;
    const overage = Math.max(0, used - this.maxBudget);

    return {
      totalBudget: this.maxBudget,
      allocated,
      remaining,
      allocation,
      usage,
      overage,
    };
  }

  isOverBudget(contextPack: any): boolean {
    const usage = this.calculateUsage(contextPack);
    const used = Object.values(usage).reduce((sum, val) => sum + val, 0);
    return used > this.maxBudget;
  }

  getOverage(contextPack: any): number {
    const usage = this.calculateUsage(contextPack);
    const used = Object.values(usage).reduce((sum, val) => sum + val, 0);
    return Math.max(0, used - this.maxBudget);
  }

  compress(contextPack: any, targetBudget: number): any {
    const currentUsage = this.calculateUsage(contextPack);
    const used = Object.values(currentUsage).reduce((sum, val) => sum + val, 0);

    if (used <= targetBudget) {
      return contextPack;
    }

    const compressed = JSON.parse(JSON.stringify(contextPack));
    const reductionNeeded = used - targetBudget;

    // Reduce file content first
    if (compressed.files && currentUsage.retrievedCode > reductionNeeded) {
      const ratio = (currentUsage.retrievedCode - reductionNeeded) / currentUsage.retrievedCode;

      for (const file of compressed.files) {
        if (file.content) {
          const newLength = Math.floor(file.content.length * ratio);
          file.content = file.content.substring(0, newLength) + '...';
        }
      }
    }

    // Reduce symbols if still over
    const newUsage = this.calculateUsage(compressed);
    const newUsed = Object.values(newUsage).reduce((sum, val) => sum + val, 0);

    if (newUsed > targetBudget && compressed.symbols) {
      const ratio = Math.floor(compressed.symbols.length * 0.7);
      compressed.symbols = compressed.symbols.slice(0, ratio);
    }

    // Reduce relationships if still over
    const newerUsage = this.calculateUsage(compressed);
    const newerUsed = Object.values(newerUsage).reduce((sum, val) => sum + val, 0);

    if (newerUsed > targetBudget && compressed.relationships) {
      const ratio = Math.floor(compressed.relationships.length * 0.5);
      compressed.relationships = compressed.relationships.slice(0, ratio);
    }

    return compressed;
  }

  private recalculateAllocation(): void {
    const total = Object.values(this.defaultAllocation).reduce((sum, val) => sum + val, 0);
    const ratio = this.maxBudget / total;

    for (const key in this.defaultAllocation) {
      this.defaultAllocation[key as keyof BudgetAllocation] = Math.floor(
        this.defaultAllocation[key as keyof BudgetAllocation] * ratio
      );
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  getRecommendedBudget(projectSize: 'small' | 'medium' | 'large'): number {
    switch (projectSize) {
      case 'small':
        return 50000;
      case 'medium':
        return 100000;
      case 'large':
        return 200000;
      default:
        return 100000;
    }
  }

  optimizeAllocation(taskType: 'coding' | 'explanation' | 'debugging' | 'refactoring'): BudgetAllocation {
    const base = { ...this.defaultAllocation };

    switch (taskType) {
      case 'coding':
        base.retrievedCode = Math.floor(base.retrievedCode * 1.2);
        base.symbols = Math.floor(base.symbols * 1.2);
        base.relationships = Math.floor(base.relationships * 1.2);
        base.tests = Math.floor(base.tests * 1.2);
        base.memories = Math.floor(base.memories * 0.8);
        base.decisions = Math.floor(base.decisions * 0.8);
        break;

      case 'explanation':
        base.retrievedCode = Math.floor(base.retrievedCode * 0.8);
        base.symbols = Math.floor(base.symbols * 1.3);
        base.relationships = Math.floor(base.relationships * 1.3);
        base.memories = Math.floor(base.memories * 1.2);
        base.decisions = Math.floor(base.decisions * 1.2);
        break;

      case 'debugging':
        base.retrievedCode = Math.floor(base.retrievedCode * 1.3);
        base.tests = Math.floor(base.tests * 1.5);
        base.relationships = Math.floor(base.relationships * 1.3);
        break;

      case 'refactoring':
        base.retrievedCode = Math.floor(base.retrievedCode * 1.4);
        base.symbols = Math.floor(base.symbols * 1.3);
        base.relationships = Math.floor(base.relationships * 1.4);
        base.memories = Math.floor(base.memories * 1.2);
        break;
    }

    return base;
  }
}
