import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CommandClassifier } from './CommandClassifier';
import { GitTools } from './gitTools';

const execAsync = promisify(exec);

export interface Tool {
  name: string;
  description: string;
  permission: 'read' | 'write' | 'execute' | 'system';
  execute(input: any): Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private commandClassifier: CommandClassifier;

  constructor() {
    this.commandClassifier = new CommandClassifier();
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.register(new ReadFileTool());
    this.register(new WriteFileTool());
    this.register(new EditFileTool());
    this.register(new DeleteFileTool());
    this.register(new ListFilesTool());
    this.register(new SearchCodeTool());
    this.register(new RunCommandTool(this.commandClassifier));
    this.register(new RunTestsTool());
    this.register(new GetProjectStructureTool());
    this.register(new GitStatusTool());
    this.register(new GitDiffTool());
    this.register(new GitBranchTool());
    this.register(new GitCommitTool());
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async execute(toolName: string, input: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    return tool.execute(input);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getCommandClassifier(): CommandClassifier {
    return this.commandClassifier;
  }
}

class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Read a file from the workspace';
  permission = 'read' as const;

  async execute(input: { path: string; projectId?: string }): Promise<string> {
    const filePath = path.resolve(input.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }
}

class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Write content to a file';
  permission = 'write' as const;

  async execute(input: { path: string; content: string; projectId?: string }): Promise<void> {
    const filePath = path.resolve(input.path);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, input.content, 'utf-8');
  }
}

class EditFileTool implements Tool {
  name = 'edit_file';
  description = 'Edit specific lines in a file';
  permission = 'write' as const;

  async execute(input: { path: string; changes: Array<{ startLine: number; endLine: number; replacement: string }>; projectId?: string }): Promise<void> {
    const filePath = path.resolve(input.path);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Apply changes in reverse order to maintain line numbers
    const sortedChanges = [...input.changes].sort((a, b) => b.startLine - a.startLine);

    for (const change of sortedChanges) {
      const before = lines.slice(0, change.startLine - 1);
      const after = lines.slice(change.endLine);
      lines.splice(change.startLine - 1, change.endLine - change.startLine + 1, ...change.replacement.split('\n'));
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }
}

class DeleteFileTool implements Tool {
  name = 'delete_file';
  description = 'Delete a file';
  permission = 'write' as const;

  async execute(input: { path: string; projectId?: string }): Promise<void> {
    const filePath = path.resolve(input.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

class ListFilesTool implements Tool {
  name = 'list_files';
  description = 'List files in a directory';
  permission = 'read' as const;

  async execute(input: { path?: string; projectId?: string }): Promise<string[]> {
    const dirPath = path.resolve(input.path || './');
    const files: string[] = [];

    const walk = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules') {
            walk(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    };

    walk(dirPath);
    return files;
  }
}

class SearchCodeTool implements Tool {
  name = 'search_code';
  description = 'Search for text in files';
  permission = 'read' as const;

  async execute(input: { query: string; path?: string; projectId?: string }): Promise<Array<{ file: string; line: number; content: string }>> {
    const dirPath = path.resolve(input.path || './');
    const results: Array<{ file: string; line: number; content: string }> = [];
    const query = input.query.toLowerCase();

    const walk = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules') {
            walk(fullPath);
          }
        } else {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(query)) {
              results.push({ file: fullPath, line: index + 1, content: line.trim() });
            }
          });
        }
      }
    };

    walk(dirPath);
    return results;
  }
}

class RunCommandTool implements Tool {
  name = 'run_command';
  description = 'Execute a shell command (with security classification)';
  permission = 'execute' as const;

  constructor(private commandClassifier: CommandClassifier) {}

  async execute(input: { command: string; projectId?: string }): Promise<{ exitCode: number; stdout: string; stderr: string; classification?: any }> {
    // Classify the command before execution
    const classification = this.commandClassifier.classify(input.command);

    // Reject system-level commands without explicit approval
    if (classification.riskLevel === 'system') {
      throw new Error(
        `System command blocked: ${input.command}\n` +
        `Reason: ${classification.description}\n` +
        `This command requires explicit user approval.`
      );
    }

    // For dangerous commands, this check allows the orchestrator to handle approval
    // The actual approval logic should be handled at the orchestrator level
    try {
      const { stdout, stderr } = await execAsync(input.command, {
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      });
      return {
        exitCode: 0,
        stdout,
        stderr,
        classification: {
          riskLevel: classification.riskLevel,
          description: classification.description,
          requiresApproval: classification.requiresApproval,
        },
      };
    } catch (error: any) {
      return {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        classification: {
          riskLevel: classification.riskLevel,
          description: classification.description,
          requiresApproval: classification.requiresApproval,
        },
      };
    }
  }
}

class RunTestsTool implements Tool {
  name = 'run_tests';
  description = 'Run the project test suite';
  permission = 'execute' as const;

  async execute(input: { projectId?: string }): Promise<{ passed: number; failed: number; output: string }> {
    try {
      const { stdout, stderr } = await execAsync('npm test', {
        timeout: 120000,
      });

      // Parse output to get passed/failed counts (simplified)
      const passedMatch = stdout.match(/(\d+)\s+passed/);
      const failedMatch = stdout.match(/(\d+)\s+failed/);

      return {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        output: stdout + stderr,
      };
    } catch (error: any) {
      return {
        passed: 0,
        failed: 1,
        output: error.stdout + error.stderr,
      };
    }
  }
}

class GetProjectStructureTool implements Tool {
  name = 'get_project_structure';
  description = 'Get project structure and metadata';
  permission = 'read' as const;

  async execute(input: { projectId?: string }): Promise<any> {
    const packageJsonPath = path.resolve('package.json');
    let packageJson: any = {};

    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }

    return {
      framework: this.detectFramework(packageJson),
      language: 'TypeScript',
      buildTool: this.detectBuildTool(packageJson),
      packageManager: this.detectPackageManager(),
      entry: this.detectEntry(packageJson),
      scripts: packageJson.scripts || {},
    };
  }

  private detectFramework(packageJson: any): string {
    if (packageJson.dependencies?.react) return 'React';
    if (packageJson.dependencies?.vue) return 'Vue';
    if (packageJson.dependencies?.angular) return 'Angular';
    if (packageJson.dependencies?.['@angular/core']) return 'Angular';
    return 'Unknown';
  }

  private detectBuildTool(packageJson: any): string {
    if (packageJson.devDependencies?.vite) return 'Vite';
    if (packageJson.devDependencies?.webpack) return 'Webpack';
    if (packageJson.devDependencies?.['@angular/cli']) return 'Angular CLI';
    return 'Unknown';
  }

  private detectPackageManager(): string {
    if (fs.existsSync('yarn.lock')) return 'yarn';
    if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
    return 'npm';
  }

  private detectEntry(packageJson: any): string {
    return packageJson.main || packageJson.module || 'src/index.ts';
  }
}

class GitStatusTool implements Tool {
  name = 'git_status';
  description = 'Get git repository status';
  permission = 'read' as const;

  async execute(input: { projectId?: string; workspacePath?: string }): Promise<any> {
    const workspacePath = input.workspacePath || './';
    const git = new GitTools(workspacePath);
    return await git.getStatus();
  }
}

class GitDiffTool implements Tool {
  name = 'git_diff';
  description = 'Get git diff';
  permission = 'read' as const;

  async execute(input: { file?: string; projectId?: string; workspacePath?: string }): Promise<any> {
    const workspacePath = input.workspacePath || './';
    const git = new GitTools(workspacePath);
    return await git.getDiff(input.file);
  }
}

class GitBranchTool implements Tool {
  name = 'git_branch';
  description = 'Create or checkout git branch';
  permission = 'write' as const;

  async execute(input: { branchName: string; create?: boolean; projectId?: string; workspacePath?: string }): Promise<void> {
    const workspacePath = input.workspacePath || './';
    const git = new GitTools(workspacePath);

    if (input.create) {
      await git.createBranch(input.branchName);
    } else {
      await git.checkoutBranch(input.branchName);
    }
  }
}

class GitCommitTool implements Tool {
  name = 'git_commit';
  description = 'Commit changes with a message';
  permission = 'write' as const;

  async execute(input: { message: string; files?: string[]; projectId?: string; workspacePath?: string }): Promise<void> {
    const workspacePath = input.workspacePath || './';
    const git = new GitTools(workspacePath);

    if (input.files) {
      for (const file of input.files) {
        await git.add(file);
      }
    } else {
      await git.add('.');
    }

    await git.commit(input.message);
  }
}
