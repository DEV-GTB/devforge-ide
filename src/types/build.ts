// Build Session Types
export interface BuildSession {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  tasks: BuildTask[];
  startedAt: Date;
  completedAt?: Date;
  output: string[];
  errors: BuildError[];
}

export interface BuildTask {
  id: string;
  type: 'build' | 'test' | 'lint' | 'typecheck' | 'install';
  command: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  output: string[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  code?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface TestResult {
  id: string;
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  coverage?: CoverageReport;
}

export interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface Checkpoint {
  id: string;
  buildSessionId: string;
  name: string;
  description: string;
  files: string[];
  changes: string;
  timestamp: Date;
  approved: boolean;
}
