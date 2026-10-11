// Git Tools - Git operations for agent
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitStatusResult {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface GitDiffResult {
  file: string;
  additions: number;
  deletions: number;
  changes: string;
}

export class GitTools {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  async getStatus(): Promise<GitStatusResult> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.workspacePath,
      });

      const branch = await this.getCurrentBranch();
      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];

      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (!line) continue;
        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status.startsWith('M') || status.startsWith('A')) {
          staged.push(file);
        }
        if (status.includes('M')) {
          modified.push(file);
        }
        if (status.includes('??')) {
          untracked.push(file);
        }
      }

      return { branch, staged, modified, untracked };
    } catch (error) {
      throw new Error(`Git status failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getDiff(file?: string): Promise<GitDiffResult[]> {
    try {
      const command = file ? `git diff ${file}` : 'git diff';
      const { stdout } = await execAsync(command, {
        cwd: this.workspacePath,
      });

      const results: GitDiffResult[] = [];
      const lines = stdout.split('\n');
      let currentFile = '';
      let additions = 0;
      let deletions = 0;
      let changes: string[] = [];

      for (const line of lines) {
        if (line.startsWith('diff --git')) {
          if (currentFile) {
            results.push({
              file: currentFile,
              additions,
              deletions,
              changes: changes.join('\n'),
            });
          }
          const match = line.match(/b\/(.+)$/);
          currentFile = match ? match[1] : '';
          additions = 0;
          deletions = 0;
          changes = [];
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
          changes.push(line);
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
          changes.push(line);
        }
      }

      if (currentFile) {
        results.push({
          file: currentFile,
          additions,
          deletions,
          changes: changes.join('\n'),
        });
      }

      return results;
    } catch (error) {
      throw new Error(`Git diff failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createBranch(branchName: string): Promise<void> {
    try {
      await execAsync(`git checkout -b ${branchName}`, {
        cwd: this.workspacePath,
      });
    } catch (error) {
      throw new Error(`Git branch creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async checkoutBranch(branchName: string): Promise<void> {
    try {
      await execAsync(`git checkout ${branchName}`, {
        cwd: this.workspacePath,
      });
    } catch (error) {
      throw new Error(`Git checkout failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async commit(message: string): Promise<void> {
    try {
      await execAsync(`git commit -m "${message}"`, {
        cwd: this.workspacePath,
      });
    } catch (error) {
      throw new Error(`Git commit failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async add(file: string): Promise<void> {
    try {
      await execAsync(`git add ${file}`, {
        cwd: this.workspacePath,
      });
    } catch (error) {
      throw new Error(`Git add failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getLog(count: number = 10): Promise<any[]> {
    try {
      const { stdout } = await execAsync(`git log -${count} --pretty=format:"%H|%an|%ae|%s|%cd"`, {
        cwd: this.workspacePath,
      });

      const commits: any[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const [hash, author, email, message, date] = line.split('|');
        commits.push({
          hash,
          author,
          email,
          message,
          date,
        });
      }

      return commits;
    } catch (error) {
      throw new Error(`Git log failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workspacePath,
      });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }
}
