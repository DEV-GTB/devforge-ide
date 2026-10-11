// FrameworkDetector - decides which test framework a project uses and routes
// it to the matching adapter. Detects vitest, jest and mocha from package.json
// dependencies and config file presence.
import { TestFramework } from '../types/testing.types';
import type { DetectResult } from '../engine/TestRuntime';

export interface FrameworkHint {
  packageJson?: string;
  configFiles?: string[];
}

export function detectFrameworkFromPackage(packageJson: string): TestFramework {
  try {
    const pkg = JSON.parse(packageJson);
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
    return 'none';
  } catch {
    return 'none';
  }
}

const CONFIG_FILES: Record<Exclude<TestFramework, 'none'>, string[]> = {
  vitest: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.workspace.ts'],
  jest: ['jest.config.js', 'jest.config.ts', 'jest.config.json', 'jest.config.mjs'],
  mocha: ['.mocharc.json', '.mocharc.jsonc', '.mocharc.yml', '.mocharc.js', 'mocha.config.js'],
};

export async function detectFramework(runtime: {
  packageJson?: string;
  hasConfigFile: (names: string[]) => Promise<boolean>;
  runnerInstalled: (runner: string) => Promise<{ installed: boolean; path?: string }>;
}): Promise<DetectResult> {
  const fromPackage = runtime.packageJson ? detectFrameworkFromPackage(runtime.packageJson) : 'none';

  // Check config files
  const configMatches: TestFramework[] = [];
  for (const fw of Object.keys(CONFIG_FILES) as Array<Exclude<TestFramework, 'none'>>) {
    const found = await runtime.hasConfigFile(CONFIG_FILES[fw]);
    if (found) configMatches.push(fw);
  }

  // Check installed runners
  const installed: TestFramework[] = [];
  const installedPaths = new Map<string, string | undefined>();
  for (const fw of Object.keys(CONFIG_FILES) as Array<Exclude<TestFramework, 'none'>>) {
    const res = await runtime.runnerInstalled(fw);
    if (res.installed) {
      installed.push(fw);
      installedPaths.set(fw, res.path);
    }
  }

  // Priority: package.json dep > config file > installed runner.
  const candidates = [
    { fw: fromPackage, source: 'package.json', weight: 1 },
    ...configMatches.map((fw) => ({ fw, source: 'config file', weight: 0.8 })),
    ...installed.map((fw) => ({ fw, source: 'installed runner', weight: 0.6 })),
  ].filter((c) => c.fw !== 'none');

  if (candidates.length === 0) {
    return {
      framework: 'none',
      confidence: 1,
      reason: 'No supported test framework found in package.json, config, or node_modules/.bin.',
      runnerInstalled: false,
    };
  }

  // Highest weight wins; if the top two agree, bump confidence.
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