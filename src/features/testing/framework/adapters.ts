// Concrete framework adapters. Each knows how to detect, invoke and parse its
// framework so the orchestrator stays framework-agnostic.
import { TestFrameworkAdapter, FrameworkContext } from './TestFrameworkAdapter';
import { CommandResult, TestFramework, TestInvocation, TestRunReport } from '../types/testing.types';
import type { DetectResult } from '../engine/TestRuntime';
import { parseTestOutput } from '../engine/ResultParser';

export class VitestAdapter implements TestFrameworkAdapter {
  readonly framework: TestFramework = 'vitest';

  async detect(runtime: {
    packageJson?: string;
    hasConfigFile: (names: string[]) => Promise<boolean>;
    runnerInstalled: (runner: string) => Promise<{ installed: boolean; path?: string }>;
  }): Promise<DetectResult> {
    let confidence = 0;
    let reason = 'No vitest signals found';
    let runnerInstalled = false;
    let runnerPath: string | undefined;
    let matched = false;

    if (runtime.packageJson && /"vitest"/.test(runtime.packageJson)) {
      confidence += 0.5;
      reason = 'vitest present in package.json';
      matched = true;
    }
    const hasConfig = await runtime.hasConfigFile(['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts']);
    if (hasConfig) {
      confidence += 0.4;
      reason = matched ? 'vitest in package.json + config file' : 'vitest config file present';
      matched = true;
    }
    const runner = await runtime.runnerInstalled('vitest');
    if (runner.installed) {
      confidence += 0.3;
      runnerInstalled = true;
      runnerPath = runner.path;
      reason = matched ? `${reason}, runner installed` : 'vitest runner installed';
      matched = true;
    }

    if (!matched) {
      return { framework: 'none', confidence: 0, reason, runnerInstalled: false };
    }
    return { framework: 'vitest', confidence: Math.min(1, confidence), reason, runnerInstalled, runnerPath };
  }

  buildInvocation(context: FrameworkContext): TestInvocation {
    const args = ['vitest', 'run', '--reporter=json', '--silent=false'];
    if (context.coverage) args.push('--coverage');
    if (context.testFiles.length > 0) {
      args.push(...context.testFiles);
    }
    return {
      command: 'npx',
      args,
      timeoutMs: context.policy.defaultTimeoutMs,
    };
  }

  parseOutput(commandResult: CommandResult, fileFallback = ''): TestRunReport {
    return parseTestOutput(commandResult, 'vitest', fileFallback);
  }
}

export class JestAdapter implements TestFrameworkAdapter {
  readonly framework: TestFramework = 'jest';

  async detect(runtime: {
    packageJson?: string;
    hasConfigFile: (names: string[]) => Promise<boolean>;
    runnerInstalled: (runner: string) => Promise<{ installed: boolean; path?: string }>;
  }): Promise<DetectResult> {
    let confidence = 0;
    let reason = 'No jest signals found';
    let runnerInstalled = false;
    let runnerPath: string | undefined;
    let matched = false;

    if (runtime.packageJson && /"jest"/.test(runtime.packageJson)) {
      confidence += 0.5;
      reason = 'jest present in package.json';
      matched = true;
    }
    const hasConfig = await runtime.hasConfigFile(['jest.config.js', 'jest.config.ts', 'jest.config.json']);
    if (hasConfig) {
      confidence += 0.4;
      reason = matched ? 'jest in package.json + config file' : 'jest config file present';
      matched = true;
    }
    const runner = await runtime.runnerInstalled('jest');
    if (runner.installed) {
      confidence += 0.3;
      runnerInstalled = true;
      runnerPath = runner.path;
      reason = matched ? `${reason}, runner installed` : 'jest runner installed';
      matched = true;
    }

    if (!matched) {
      return { framework: 'none', confidence: 0, reason, runnerInstalled: false };
    }
    return { framework: 'jest', confidence: Math.min(1, confidence), reason, runnerInstalled, runnerPath };
  }

  buildInvocation(context: FrameworkContext): TestInvocation {
    const args = ['jest', '--json', '--silent=false'];
    if (context.coverage) args.push('--coverage');
    if (context.testFiles.length > 0) args.push(...context.testFiles);
    return {
      command: 'npx',
      args,
      timeoutMs: context.policy.defaultTimeoutMs,
    };
  }

  parseOutput(commandResult: CommandResult, fileFallback = ''): TestRunReport {
    return parseTestOutput(commandResult, 'jest', fileFallback);
  }
}

export class MochaAdapter implements TestFrameworkAdapter {
  readonly framework: TestFramework = 'mocha';

  async detect(runtime: {
    packageJson?: string;
    hasConfigFile: (names: string[]) => Promise<boolean>;
    runnerInstalled: (runner: string) => Promise<{ installed: boolean; path?: string }>;
  }): Promise<DetectResult> {
    let confidence = 0;
    let reason = 'No mocha signals found';
    let runnerInstalled = false;
    let runnerPath: string | undefined;
    let matched = false;

    if (runtime.packageJson && /"mocha"/.test(runtime.packageJson)) {
      confidence += 0.5;
      reason = 'mocha present in package.json';
      matched = true;
    }
    const hasConfig = await runtime.hasConfigFile(['.mocharc.json', '.mocharc.js', '.mocharc.yml']);
    if (hasConfig) {
      confidence += 0.4;
      reason = matched ? 'mocha in package.json + config file' : 'mocha config file present';
      matched = true;
    }
    const runner = await runtime.runnerInstalled('mocha');
    if (runner.installed) {
      confidence += 0.3;
      runnerInstalled = true;
      runnerPath = runner.path;
      reason = matched ? `${reason}, runner installed` : 'mocha runner installed';
      matched = true;
    }

    if (!matched) {
      return { framework: 'none', confidence: 0, reason, runnerInstalled: false };
    }
    return { framework: 'mocha', confidence: Math.min(1, confidence), reason, runnerInstalled, runnerPath };
  }

  buildInvocation(context: FrameworkContext): TestInvocation {
    const args = ['mocha', '--reporter', 'json'];
    if (context.testFiles.length > 0) args.push(...context.testFiles);
    return {
      command: 'npx',
      args,
      timeoutMs: context.policy.defaultTimeoutMs,
    };
  }

  parseOutput(commandResult: CommandResult, fileFallback = ''): TestRunReport {
    return parseTestOutput(commandResult, 'mocha', fileFallback);
  }
}

export function adapterForFramework(framework: TestFramework): TestFrameworkAdapter | null {
  switch (framework) {
    case 'vitest':
      return new VitestAdapter();
    case 'jest':
      return new JestAdapter();
    case 'mocha':
      return new MochaAdapter();
    case 'none':
      return null;
  }
}