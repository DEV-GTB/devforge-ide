// Git Analyzer - Analyzes Git history for project intelligence
import * as child_process from 'child_process';
import * as path from 'path';

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  files: string[];
  branch: string;
}

export interface GitFileHistory {
  path: string;
  commits: GitCommit[];
  lastModified: Date;
  modificationCount: number;
  authors: string[];
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  lastCommit: string;
  lastCommitDate: Date;
}

export interface GitChangePattern {
  files: string[];
  frequency: number;
  lastSeen: Date;
}

export class GitAnalyzer {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.exec('git rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const result = await this.exec('git rev-parse --abbrev-ref HEAD');
      return result.trim();
    } catch {
      return 'unknown';
    }
  }

  async getBranches(): Promise<GitBranch[]> {
    try {
      const result = await this.exec('git branch -a');
      const currentBranch = await this.getCurrentBranch();
      const branches: GitBranch[] = [];

      const lines = result.trim().split('\n');
      for (const line of lines) {
        const isCurrent = line.startsWith('*');
        const name = line.replace(/^\*\s*/, '').trim().replace('remotes/origin/', '');

        if (name && !name.includes('HEAD')) {
          const lastCommit = await this.exec(`git rev-parse ${name}`);
          const lastCommitDate = await this.getCommitDate(lastCommit.trim());

          branches.push({
            name,
            isCurrent,
            lastCommit: lastCommit.trim(),
            lastCommitDate,
          });
        }
      }

      return branches;
    } catch {
      return [];
    }
  }

  async getRecentCommits(limit: number = 50): Promise<GitCommit[]> {
    try {
      const currentBranch = await this.getCurrentBranch();
      const result = await this.exec(`git log -${limit} --pretty=format:"%H|%an|%ae|%ai|%s" --name-only`);
      const lines = result.trim().split('\n');
      const commits: GitCommit[] = [];

      let currentCommit: Partial<GitCommit> | null = null;

      for (const line of lines) {
        if (line.includes('|')) {
          // Commit header
          if (currentCommit) {
            commits.push(currentCommit as GitCommit);
          }

          const [hash, author, email, date, message] = line.split('|');
          currentCommit = {
            hash,
            author,
            email,
            date: new Date(date),
            message,
            files: [],
            branch: currentBranch,
          };
        } else if (line.trim() && currentCommit) {
          // File path
          currentCommit.files!.push(line.trim());
        }
      }

      if (currentCommit) {
        commits.push(currentCommit as GitCommit);
      }

      return commits;
    } catch {
      return [];
    }
  }

  async getFileHistory(filePath: string, limit: number = 20): Promise<GitFileHistory> {
    try {
      const result = await this.exec(`git log -${limit} --pretty=format:"%H|%an|%ae|%ai|%s" -- "${filePath}"`);
      const lines = result.trim().split('\n');
      const commits: GitCommit[] = [];
      const authors = new Set<string>();
      const currentBranch = await this.getCurrentBranch();

      for (const line of lines) {
        const [hash, author, email, date, message] = line.split('|');
        authors.add(author);
        commits.push({
          hash,
          author,
          email,
          date: new Date(date),
          message,
          files: [filePath],
          branch: currentBranch,
        });
      }

      return {
        path: filePath,
        commits,
        lastModified: commits.length > 0 ? commits[0].date : new Date(),
        modificationCount: commits.length,
        authors: Array.from(authors),
      };
    } catch {
      return {
        path: filePath,
        commits: [],
        lastModified: new Date(),
        modificationCount: 0,
        authors: [],
      };
    }
  }

  async getChangedFiles(since?: string): Promise<string[]> {
    try {
      const command = since
        ? `git diff --name-only ${since} HEAD`
        : 'git diff --name-only HEAD~1 HEAD';
      const result = await this.exec(command);
      return result.trim().split('\n').filter(f => f.trim());
    } catch {
      return [];
    }
  }

  async getFileBlame(filePath: string, line?: number): Promise<Map<number, GitCommit>> {
    try {
      const command = line
        ? `git blame -L ${line},${line} --line-porcelain "${filePath}"`
        : `git blame --line-porcelain "${filePath}"`;
      const result = await this.exec(command);
      const lines = result.trim().split('\n');
      const blameMap = new Map<number, GitCommit>();
      const currentBranch = await this.getCurrentBranch();

      let currentCommit: Partial<GitCommit> | null = null;
      let currentLine = 0;

      for (const line of lines) {
        if (line.startsWith('\t')) {
          // Content line
          currentLine++;
          if (currentCommit) {
            blameMap.set(currentLine, currentCommit as GitCommit);
          }
        } else if (line.match(/^[0-9a-f]{40}/)) {
          // Commit hash
          if (currentCommit) {
            currentCommit = null;
          }
        } else if (line.startsWith('author ')) {
          currentCommit = currentCommit || {};
          currentCommit.author = line.substring(7);
        } else if (line.startsWith('author-mail ')) {
          currentCommit = currentCommit || {};
          currentCommit.email = line.substring(12);
        } else if (line.startsWith('author-time ')) {
          currentCommit = currentCommit || {};
          currentCommit.date = new Date(parseInt(line.substring(12)) * 1000);
        } else if (line.startsWith('summary ')) {
          currentCommit = currentCommit || {};
          currentCommit.message = line.substring(8);
          currentCommit.branch = currentBranch;
          currentCommit.files = [filePath];
        }
      }

      return blameMap;
    } catch {
      return new Map();
    }
  }

  async detectChangePatterns(commits: GitCommit[]): Promise<GitChangePattern[]> {
    const patterns = new Map<string, { count: number; lastSeen: Date; files: Set<string> }>();

    for (const commit of commits) {
      // Analyze file co-changes
      for (let i = 0; i < commit.files.length; i++) {
        for (let j = i + 1; j < commit.files.length; j++) {
          const key = [commit.files[i], commit.files[j]].sort().join(',');
          const existing = patterns.get(key) || { count: 0, lastSeen: commit.date, files: new Set() };

          existing.count++;
          existing.lastSeen = commit.date;
          existing.files.add(commit.files[i]);
          existing.files.add(commit.files[j]);

          patterns.set(key, existing);
        }
      }
    }

    // Convert to array and filter by frequency
    return Array.from(patterns.entries())
      .map(([key, value]) => ({
        files: Array.from(value.files),
        frequency: value.count,
        lastSeen: value.lastSeen,
      }))
      .filter(p => p.frequency >= 2)
      .sort((a, b) => b.frequency - a.frequency);
  }

  async getCommitStats(since?: string): Promise<{
    totalCommits: number;
    totalFilesChanged: number;
    totalAdditions: number;
    totalDeletions: number;
    authors: Map<string, number>;
  }> {
    try {
      const command = since
        ? `git diff --stat ${since} HEAD`
        : 'git diff --stat HEAD~1 HEAD';
      const result = await this.exec(command);

      const lines = result.trim().split('\n');
      const stats = {
        totalCommits: 0,
        totalFilesChanged: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        authors: new Map<string, number>(),
      };

      for (const line of lines) {
        const match = line.match(/(\d+) files? changed, (\d+) insertions?\(\+\), (\d+) deletions?\(-\)/);
        if (match) {
          stats.totalFilesChanged += parseInt(match[1]);
          stats.totalAdditions += parseInt(match[2]);
          stats.totalDeletions += parseInt(match[3]);
        }
      }

      // Get commit count and authors
      const commitCount = await this.exec('git rev-list --count HEAD');
      stats.totalCommits = parseInt(commitCount.trim());

      const authors = await this.exec('git shortlog -sn --all');
      const authorLines = authors.trim().split('\n');
      for (const authorLine of authorLines) {
        const match = authorLine.match(/^\s*(\d+)\s+(.+)$/);
        if (match) {
          stats.authors.set(match[2], parseInt(match[1]));
        }
      }

      return stats;
    } catch {
      return {
        totalCommits: 0,
        totalFilesChanged: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        authors: new Map(),
      };
    }
  }

  async getRelatedFiles(filePath: string, threshold: number = 3): Promise<string[]> {
    const commits = await this.getRecentCommits(100);
    const relatedFiles = new Map<string, number>();

    for (const commit of commits) {
      if (commit.files.includes(filePath)) {
        for (const file of commit.files) {
          if (file !== filePath) {
            relatedFiles.set(file, (relatedFiles.get(file) || 0) + 1);
          }
        }
      }
    }

    return Array.from(relatedFiles.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([file]) => file);
  }

  private async exec(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      child_process.exec(
        command,
        { cwd: this.projectRoot },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        }
      );
    });
  }

  private async getCommitDate(commitHash: string): Promise<Date> {
    try {
      const result = await this.exec(`git show -s --format=%ai ${commitHash}`);
      return new Date(result.trim());
    } catch {
      return new Date();
    }
  }
}
