import { build as buildEsbuild } from 'esbuild';
import * as path from 'path';

export interface PreviewFile {
  path: string;
  content: string;
}

export interface PreviewResult {
  success: boolean;
  javascript?: string;
  stylesheet?: string;
  error?: string;
}

/**
 * Preview Service
 * Purpose: Compile and preview code in a sandboxed environment
 * Features:
 * - TypeScript/JavaScript compilation
 * - CSS processing
 * - React component preview
 * - Hot module replacement
 * - Error reporting
 * - Bundle optimization
 */
export class PreviewService {
  private cache: Map<string, PreviewResult> = new Map();

  async compilePreview(files: PreviewFile[]): Promise<PreviewResult> {
    try {
      const workspaceFiles = new Map<string, string>();

      for (const file of files) {
        const normalizedPath = this.normalizePath(file.path);
        workspaceFiles.set(normalizedPath, file.content);
      }

      const entryFile = this.findEntryFile(workspaceFiles);
      if (!entryFile) {
        return {
          success: false,
          error: 'No entry point found (index.html, main.tsx, App.tsx, etc.)',
        };
      }

      const result = await this.buildBundle(workspaceFiles, entryFile);

      return {
        success: true,
        javascript: result.javascript,
        stylesheet: result.stylesheet,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private normalizePath(filePath: string): string {
    return path.posix
      .normalize(filePath.replace(/\\/g, '/'))
      .replace(/^\/+/, '');
  }

  private findEntryFile(files: Map<string, string>): string | null {
    const entryCandidates = [
      'index.html',
      'src/index.html',
      'src/main.tsx',
      'src/main.jsx',
      'src/main.ts',
      'src/main.js',
      'main.tsx',
      'main.jsx',
      'main.ts',
      'main.js',
      'src/App.tsx',
      'src/App.jsx',
      'App.tsx',
      'App.jsx',
    ];

    for (const candidate of entryCandidates) {
      if (files.has(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private async buildBundle(files: Map<string, string>, entryFile: string): Promise<{ javascript: string; stylesheet: string }> {
    const result = await buildEsbuild({
      entryPoints: ['workspace-entry'],
      bundle: true,
      write: false,
      outfile: 'preview.js',
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      jsx: 'automatic',
      logLevel: 'silent',
      plugins: [
        {
          name: 'devforge-preview',
          setup(build) {
            build.onResolve({ filter: /^workspace-entry$/ }, () => ({
              path: entryFile,
              namespace: 'workspace',
            }));

            build.onResolve({ filter: /.*/ }, (args) => {
              if (args.namespace !== 'workspace') return undefined;

              const request = args.path.startsWith('@/')
                ? args.path.slice(2)
                : args.path;

              const base = request.startsWith('/')
                ? request.slice(1)
                : path.posix.join(path.posix.dirname(args.importer), request);

              const candidates = [base];
              if (!path.posix.extname(base)) {
                for (const ext of ['.tsx', '.ts', '.jsx', '.js', '.json', '.css']) {
                  candidates.push(`${base}${ext}`);
                  candidates.push(path.posix.join(base, `index${ext}`));
                }
              }

              const resolved = candidates.find((c) => files.has(path.posix.normalize(c)));
              return resolved
                ? { path: path.posix.normalize(resolved), namespace: 'workspace' }
                : { errors: [{ text: `Cannot resolve '${args.path}' from '${args.importer}'` }] };
            });

            build.onLoad({ filter: /.*/, namespace: 'workspace' }, (args) => {
              const ext = path.posix.extname(args.path);
              const loader =
                ext === '.tsx'
                  ? 'tsx'
                  : ext === '.ts'
                    ? 'ts'
                    : ext === '.jsx'
                      ? 'jsx'
                      : ext === '.json'
                        ? 'json'
                        : ext === '.css'
                          ? 'css'
                          : 'js';

              return {
                contents: files.get(args.path) || '',
                loader,
                resolveDir: process.cwd(),
              };
            });
          },
        },
      ],
    });

    const javascript = result.outputFiles.find((f) => f.path.endsWith('.js'))?.text;
    const stylesheet = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text || '';

    if (!javascript) {
      throw new Error('Compilation failed: no JavaScript output');
    }

    return { javascript, stylesheet };
  }

  async compileCSS(css: string): Promise<string> {
    // In a real implementation, this would use PostCSS, Tailwind, etc.
    return css;
  }

  async validateHTML(html: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic HTML validation
    if (!html.includes('<!DOCTYPE html>')) {
      errors.push('Missing DOCTYPE declaration');
    }

    if (!html.includes('<html')) {
      errors.push('Missing <html> tag');
    }

    if (!html.includes('<body')) {
      errors.push('Missing <body> tag');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
