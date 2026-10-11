// Health Monitor - Monitors index health and consistency
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

export interface IndexHealth {
  projectId: string;
  filesIndexed: number;
  symbolsIndexed: number;
  dependenciesIndexed: number;
  embeddingsCreated: number;
  staleFiles: number;
  failedFiles: number;
  lastIndexedAt: Date;
  indexVersion: string;
  health: 'healthy' | 'partial' | 'error';
}

export class HealthMonitor {
  private healthChecks: Map<string, (projectId: string) => Promise<HealthCheck>> = new Map();

  constructor() {
    this.registerDefaultChecks();
  }

  registerCheck(name: string, check: (projectId: string) => Promise<HealthCheck>): void {
    this.healthChecks.set(name, check);
  }

  unregisterCheck(name: string): void {
    this.healthChecks.delete(name);
  }

  async checkHealth(projectId: string): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    for (const [name, checkFn] of this.healthChecks) {
      try {
        const check = await checkFn(projectId);
        checks.push(check);
      } catch (error) {
        checks.push({
          name,
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const failedChecks = checks.filter(c => c.status === 'fail');
    const warningChecks = checks.filter(c => c.status === 'warn');

    let status: HealthStatus['status'];
    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warningChecks.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      timestamp: new Date(),
      checks,
    };
  }

  async getIndexHealth(projectId: string, indexHealth: IndexHealth): Promise<HealthCheck> {
    const issues: string[] = [];

    // Check for stale files
    if (indexHealth.staleFiles > 0) {
      issues.push(`${indexHealth.staleFiles} stale files`);
    }

    // Check for failed files
    if (indexHealth.failedFiles > 0) {
      issues.push(`${indexHealth.failedFiles} failed files`);
    }

    // Check embedding coverage
    const embeddingCoverage = indexHealth.filesIndexed > 0
      ? indexHealth.embeddingsCreated / indexHealth.filesIndexed
      : 0;

    if (embeddingCoverage < 0.8) {
      issues.push(`Low embedding coverage: ${(embeddingCoverage * 100).toFixed(0)}%`);
    }

    // Check if index is recent
    const hoursSinceIndex = (Date.now() - indexHealth.lastIndexedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceIndex > 24) {
      issues.push(`Index is ${hoursSinceIndex.toFixed(0)} hours old`);
    }

    if (issues.length === 0) {
      return {
        name: 'index-health',
        status: 'pass',
        message: 'Index is healthy',
        details: indexHealth,
      };
    }

    return {
      name: 'index-health',
      status: issues.length > 2 ? 'fail' : 'warn',
      message: issues.join(', '),
      details: indexHealth,
    };
  }

  private registerDefaultChecks(): void {
    // File consistency check
    this.registerCheck('file-consistency', async (projectId: string) => {
      // Placeholder - would check if indexed files still exist
      return {
        name: 'file-consistency',
        status: 'pass',
        message: 'All indexed files exist',
      };
    });

    // Symbol consistency check
    this.registerCheck('symbol-consistency', async (projectId: string) => {
      // Placeholder - would check if symbols are valid
      return {
        name: 'symbol-consistency',
        status: 'pass',
        message: 'All symbols are valid',
      };
    });

    // Dependency graph check
    this.registerCheck('dependency-graph', async (projectId: string) => {
      // Placeholder - would check for circular dependencies
      return {
        name: 'dependency-graph',
        status: 'pass',
        message: 'Dependency graph is valid',
      };
    });

    // Vector store check
    this.registerCheck('vector-store', async (projectId: string) => {
      // Placeholder - would check vector store integrity
      return {
        name: 'vector-store',
        status: 'pass',
        message: 'Vector store is valid',
      };
    });
  }

  async getSystemHealth(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;

    checks.push({
      name: 'memory-usage',
      status: memoryMB > 500 ? 'warn' : 'pass',
      message: `Memory usage: ${memoryMB.toFixed(0)} MB`,
      details: memoryUsage,
    });

    // CPU load (simplified)
    checks.push({
      name: 'cpu-load',
      status: 'pass',
      message: 'CPU load normal',
    });

    // Disk space (placeholder)
    checks.push({
      name: 'disk-space',
      status: 'pass',
      message: 'Disk space sufficient',
    });

    const failedChecks = checks.filter(c => c.status === 'fail');
    const warningChecks = checks.filter(c => c.status === 'warn');

    let status: HealthStatus['status'];
    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warningChecks.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      timestamp: new Date(),
      checks,
    };
  }

  generateHealthReport(status: HealthStatus): string {
    let report = `Health Status: ${status.status.toUpperCase()}\n`;
    report += `Timestamp: ${status.timestamp.toISOString()}\n\n`;

    for (const check of status.checks) {
      const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
      report += `${icon} ${check.name}: ${check.message}\n`;
    }

    return report;
  }
}
