// NodeTestRuntime - server-side execution backend for the testing engine.
// This is the only place that touches the real filesystem and shell, keeping
// the orchestrator itself portable and sandboxable.
import { promises as fs } from 'fs';
import { spawn, SpawnOptions } from 'child_process';
import { resolve, sep } from 'path';
import {
  CommandResult,
  TestInvocation,
  TestFramework,
} from '../../src/features/testing/types/testing.types';
import {
  DetectResult,
  DetectOptions,
  TestRuntime,
} from '../../src/features/testing/engine/TestRuntime';
import { detectFrameworkFromPackage } from '../../src/features/testing/framework/FrameworkDetector';

export interface NodeTestRuntimeOptions {
  /** Extra env vars to pass to the test process. */
  env?: Record<string, string>;
  /** Maximum combined output captured (stdout+stderr) per run. */
  maxOutputBytes?: number;
}

const CONFIG_FILES: Record<string, string[]> = {
  vitest: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.workspace.ts'],
  jest: ['jest.config.js', 'jest.config.ts', 'jest.config.json', 'jest.config.mjs'],
  mocha: ['.mocharc.json', '.mocharc.jsonc', '.mocharc.yml', '.mocharc.js'],
};

const TEST_FILE_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i,
  /(__tests__\/.*\.(ts|tsx|js|jsx)$)/,
];

export class NodeTestRuntime implements TestRuntime {
  private readonly projectRoot: string;
  private readonly options: NodeTestRuntimeOptions;
  private cachedPackageJson: string | null = null;
  private cachedRunnerPaths = new Map<string, string | undefined>();

  constructor(projectPath: string, options: NodeTestRuntimeOptions = {}) {
    this.projectRoot = resolve(projectPath);
    this.options = options;
  }

  private resolvePath(file: string): string {
    const full = resolve(this.projectRoot, file);
    if (full !== this.projectRoot && !full.startsWith(this.projectRoot + sep)) {
      const err: any = new Error(`Path escapes workspace: ${file}`);
      err.code = 'WORKSPACE_FORBIDDEN';
      throw err;
    }
    return full;
  }

  private async readPackageJson(): Promise<string | null> {
    if (this.cachedPackageJson !== null) return this.cachedPackageJson;
    try {
      this.cachedPackageJson = await fs.readFile(resolve(this.projectRoot, 'package.json'), 'utf-8');
    } catch {
      this.cachedPackageJson = null;
    }
    return this.cachedPackageJson;
  }

  async detectFramework(options: DetectOptions = {}): Promise<DetectResult> {
    const packageJson = options.packageJson ?? (await this.readPackageJson()) ?? undefined;
    const fromPackage = packageJson ? detectFrameworkFromPackage(packageJson) : 'none';

    const hasConfig = async (names: string[]): Promise<boolean> => {
      for (const name of names) {
        try {
          await fs.access(resolve(this.projectRoot, name));
          return true;
        } catch {
          /* keep looking */
        }
      }
      return false;
    };

    const configMatches: TestFramework[] = [];
    for (const [fw, names] of Object.entries(CONFIG_FILES)) {
      if (await hasConfig(names)) configMatches.push(fw as TestFramework);
    }

    const installed: TestFramework[] = [];
    const installedPaths = new Map<string, string | undefined>();
    for (const fw of Object.keys(CONFIG_FILES) as TestFramework[]) {
      const runner = await this.checkRunnerInstalled(fw);
      if (runner.installed) {
        installed.push(fw);
        installedPaths.set(fw, runner.path);
      }
    }

    const candidates = [
      { fw: fromPackage, source: 'package.json', weight: 1 },
      ...configMatches.map((fw) => ({ fw, source: 'config file', weight: 0.8 })),
      ...installed.map((fw) => ({ fw, source: 'installed runner', weight: 0.6 })),
    ].filter((c) => c.fw !== 'none');

    if (candidates.length === 0) {
      return { framework: 'none', confidence: 1, reason: 'No supported test framework detected.', runnerInstalled: false };
    }

    candidates.sort((a, b) => b.weight - a.weight);
    const top = candidates[0];
    const agreement = candidates.filter((c) => c.fw === top.fw).length;
    const confidence = Math.min(1, 0.5 + agreement * 0.2);
    const runnerPath = installedPaths.get(top.fw);

    return {
      framework: top.fw,
      confidence,
      reason: `Detected ${top.fw} via ${top.source}`,
      runnerInstalled: runnerPath !== undefined || installed.length > 0,
      runnerPath,
    };
  }

  async discoverTestFiles(): Promise<string[]> {
    const results: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      let entries: import('fs').Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'coverage') {
          continue;
        }
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile() && TEST_FILE_PATTERNS.some((re) => re.test(entry.name))) {
          const relative = full.startsWith(this.projectRoot + sep)
            ? full.slice(this.projectRoot.length + 1)
            : full;
          results.push(relative);
        }
      }
    };
    await walk(this.projectRoot);
    return results.slice(0, 500); // cap discovery
  }

  private async resolveRunner(runner: string): Promise<string | undefined> {
    if (this.cachedRunnerPaths.has(runner)) {
      return this.cachedRunnerPaths.get(runner);
    }
    const resolved = await this.resolveRunnerEntry(runner);
    this.cachedRunnerPaths.set(runner, resolved);
    return resolved;
  }

  /**
   * Resolve the actual JS entry file for a runner so we can execute it through
   * `node` directly. This avoids shell/`.cmd` differences across platforms
   * while keeping the invocation deterministic and policy-safe.
   */
  private async resolveRunnerEntry(runner: string): Promise<string | undefined> {
    const candidates: string[] = [];
    switch (runner) {
      case 'vitest':
        candidates.push(
          'node_modules/vitest/vitest.mjs',
          'node_modules/vitest/dist/cli.js',
        );
        break;
      case 'jest':
        candidates.push('node_modules/jest/bin/jest.js');
        break;
      case 'mocha':
        candidates.push('node_modules/mocha/bin/mocha.js');
        break;
      default:
        return undefined;
    }
    for (const candidate of candidates) {
      try {
        await fs.access(resolve(this.projectRoot, candidate));
        return resolve(this.projectRoot, candidate);
      } catch {
        /* try next */
      }
    }
    return undefined;
  }

  async checkRunnerInstalled(runner: string): Promise<{ installed: boolean; path?: string }> {
    const path = await this.resolveRunner(runner);
    return path ? { installed: true, path } : { installed: false };
  }

  async run(invocation: TestInvocation): Promise<CommandResult> {
    const timeoutMs = invocation.timeoutMs ?? 120_000;
    const start = Date.now();

    // The invocation.command is 'npx' with 'vitest'/'jest'/'mocha' as first
    // arg. Resolve the real binary from node_modules/.bin when present.
    let realCommand = invocation.command;
    let realArgs = invocation.args;

    if (invocation.command === 'npx' && invocation.args.length > 0) {
      const runner = invocation.args[0];
      const binary = await this.resolveRunner(runner);
      if (binary) {
        realCommand = process.execPath;
        realArgs = this.buildNodeInvocation(binary, invocation.args.slice(1));
      } else {
        // Fall back to npx (may attempt network). Still policy-approved.
        realCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        realArgs = invocation.args;
      }
    }

    return new Promise<CommandResult>((resolvePromise) => {
      const child = spawn(realCommand, realArgs, this.spawnOptions());
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const maxOutputBytes = this.options.maxOutputBytes ?? 2_000_000;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        // Give it a moment then force-kill.
        setTimeout(() => {
          if (!child.killed) child.kill('SIGKILL');
        }, 1000);
      }, timeoutMs);

      const appendStdout = (chunk: Buffer | string) => {
        if (stdout.length < maxOutputBytes) {
          stdout += chunk.toString();
          if (stdout.length > maxOutputBytes) stdout = stdout.slice(0, maxOutputBytes);
        }
      };
      const appendStderr = (chunk: Buffer | string) => {
        if (stderr.length < maxOutputBytes) {
          stderr += chunk.toString();
          if (stderr.length > maxOutputBytes) stderr = stderr.slice(0, maxOutputBytes);
        }
      };

      child.stdout?.on('data', appendStdout);
      child.stderr?.on('data', appendStderr);

      child.on('error', (err) => {
        clearTimeout(timer);
        resolvePromise({
          exitCode: 1,
          stdout,
          stderr: `${stderr}\n${err.message}`,
          durationMs: Date.now() - start,
          timedOut,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolvePromise({
          exitCode: typeof code === 'number' ? code : 1,
          stdout,
          stderr,
          durationMs: Date.now() - start,
          timedOut,
        });
      });
    });
  }

  private spawnOptions(): SpawnOptions {
    return {
      cwd: this.projectRoot,
      env: {
        ...process.env,
        ...this.options.env,
      },
      shell: false,
      windowsHide: true,
    };
  }

  /**
   * Build args to run a runner entry through `node`. The resolved path is the
   * JS entry file; args after the runner name are forwarded unchanged.
   */
  private buildNodeInvocation(binaryPath: string, args: string[]): string[] {
    return [binaryPath, ...args];
  }

  async readFile(file: string): Promise<string> {
    return fs.readFile(this.resolvePath(file), 'utf-8');
  }

  async writeFile(file: string, content: string): Promise<void> {
    const full = this.resolvePath(file);
    await fs.mkdir(resolve(full, '..'), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
  }

  async fileExists(file: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(file));
      return true;
    } catch {
      return false;
    }
  }
}