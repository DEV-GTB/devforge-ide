// Dependency Indexer - Builds dependency graph
import { Dependency } from '../../types/project';
import { FileIndex } from './FileIndexer';

export type { Dependency };

export class DependencyIndexer {
  private dependencies: Map<string, Dependency[]> = new Map();

  constructor(private projectId: string) {}

  async buildGraph(files: FileIndex[]): Promise<void> {
    for (const file of files) {
      if (file.content) {
        await this.updateFile(file.path, file.content);
      }
    }
  }

  async updateFile(path: string, content: string): Promise<void> {
    const deps: Dependency[] = [];

    // Extract imports
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      deps.push({
        source: path,
        target: match[1],
        type: 'IMPORT',
      });
    }

    // Extract require statements
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      deps.push({
        source: path,
        target: match[1],
        type: 'IMPORT',
      });
    }

    this.dependencies.set(path, deps);
  }

  getDependencies(path: string): Dependency[] {
    return this.dependencies.get(path) || [];
  }

  getAllDependencies(): Dependency[] {
    return Array.from(this.dependencies.values()).flat();
  }

  getDependents(path: string): Dependency[] {
    return this.getAllDependencies().filter(d => d.target === path);
  }
}
