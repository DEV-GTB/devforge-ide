// Context Ranker - Intelligently ranks and re-ranks search results
import { SearchResult } from './ContextRetriever';
import { FileIndexer, FileIndex } from './FileIndexer';
import { SymbolIndexer, Symbol } from './SymbolIndexer';
import { DependencyIndexer, Dependency } from './DependencyIndexer';

export interface RankingFactors {
  semanticSimilarity: number;
  symbolMatch: number;
  exactMatch: number;
  pathRelevance: number;
  dependencyDistance: number;
  recentlyModified: number;
  currentFileBoost: number;
  openFileBoost: number;
  testRelation: number;
  languageCompatibility: number;
}

export interface RankedResult extends SearchResult {
  factors: RankingFactors;
  finalScore: number;
}

export interface RankingConfig {
  weights: Partial<RankingFactors>;
  currentFile?: string;
  openFiles?: string[];
  selectedSymbol?: string;
  queryLanguage?: string;
}

export class ContextRanker {
  private defaultWeights: RankingFactors = {
    semanticSimilarity: 0.3,
    symbolMatch: 0.25,
    exactMatch: 0.2,
    pathRelevance: 0.1,
    dependencyDistance: 0.05,
    recentlyModified: 0.05,
    currentFileBoost: 0.0,
    openFileBoost: 0.0,
    testRelation: 0.0,
    languageCompatibility: 0.0,
  };

  constructor(
    private fileIndexer: FileIndexer,
    private symbolIndexer: SymbolIndexer,
    private dependencyIndexer: DependencyIndexer
  ) {}

  rank(results: SearchResult[], config: RankingConfig): RankedResult[] {
    const weights = { ...this.defaultWeights, ...config.weights };

    return results
      .map(result => this.calculateRanking(result, weights, config))
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  reRank(candidates: SearchResult[], query: string, config: RankingConfig): RankedResult[] {
    // Multi-stage re-ranking
    let results = candidates;

    // Stage 1: Initial ranking
    const ranked = this.rank(results, config);

    // Stage 2: Dependency expansion
    const expanded = this.expandWithDependencies(ranked, config);

    // Stage 3: Re-ranking with expanded context
    const reRanked = this.rank(expanded, config);

    // Stage 4: Final filtering
    const filtered = this.filterByRelevance(reRanked, 0.3);

    return filtered;
  }

  private calculateRanking(
    result: SearchResult,
    weights: RankingFactors,
    config: RankingConfig
  ): RankedResult {
    const factors: RankingFactors = {
      semanticSimilarity: this.calculateSemanticSimilarity(result),
      symbolMatch: this.calculateSymbolMatch(result, config),
      exactMatch: this.calculateExactMatch(result),
      pathRelevance: this.calculatePathRelevance(result, config),
      dependencyDistance: this.calculateDependencyDistance(result, config),
      recentlyModified: this.calculateRecentlyModified(result),
      currentFileBoost: this.calculateCurrentFileBoost(result, config),
      openFileBoost: this.calculateOpenFileBoost(result, config),
      testRelation: this.calculateTestRelation(result, config),
      languageCompatibility: this.calculateLanguageCompatibility(result, config),
    };

    const finalScore = this.computeFinalScore(factors, weights);

    return {
      ...result,
      factors,
      finalScore,
    };
  }

  private calculateSemanticSimilarity(result: SearchResult): number {
    if (result.matchType === 'semantic') {
      return result.score;
    }
    return 0;
  }

  private calculateSymbolMatch(result: SearchResult, config: RankingConfig): number {
    if (result.matchType === 'symbol') {
      let score = result.score;

      // Boost if matches selected symbol
      if (config.selectedSymbol && result.symbol === config.selectedSymbol) {
        score *= 1.5;
      }

      return score;
    }
    return 0;
  }

  private calculateExactMatch(result: SearchResult): number {
    if (result.matchType === 'exact') {
      return result.score;
    }
    return 0;
  }

  private calculatePathRelevance(result: SearchResult, config: RankingConfig): number {
    const path = result.path.toLowerCase();
    let score = 0.5;

    // Boost common source directories
    if (path.includes('src') || path.includes('lib') || path.includes('app')) {
      score += 0.2;
    }

    // Boost test files if relevant
    if (path.includes('test') || path.includes('spec')) {
      score += 0.1;
    }

    // Penalize config files
    if (path.includes('config') || path.includes('.config')) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateDependencyDistance(result: SearchResult, config: RankingConfig): number {
    if (!config.currentFile) {
      return 0;
    }

    const deps = this.dependencyIndexer.getDependencies(config.currentFile);
    const dependents = this.dependencyIndexer.getDependents(config.currentFile);

    // Direct dependency
    if (deps.some(d => d.target === result.path)) {
      return 0.9;
    }

    // Direct dependent
    if (dependents.some(d => d.source === result.path)) {
      return 0.8;
    }

    // Same directory
    const currentDir = config.currentFile.split('/').slice(0, -1).join('/');
    const resultDir = result.path.split('/').slice(0, -1).join('/');
    if (currentDir === resultDir) {
      return 0.5;
    }

    return 0;
  }

  private calculateRecentlyModified(result: SearchResult): number {
    const file = this.fileIndexer.getFile(result.path);
    if (!file) {
      return 0;
    }

    const now = new Date();
    const modified = new Date(file.modified);
    const daysSinceModified = (now.getTime() - modified.getTime()) / (1000 * 60 * 60 * 24);

    // Decay over time (exponential)
    return Math.exp(-daysSinceModified / 30);
  }

  private calculateCurrentFileBoost(result: SearchResult, config: RankingConfig): number {
    if (config.currentFile && result.path === config.currentFile) {
      return 1.0;
    }
    return 0;
  }

  private calculateOpenFileBoost(result: SearchResult, config: RankingConfig): number {
    if (config.openFiles && config.openFiles.includes(result.path)) {
      return 0.8;
    }
    return 0;
  }

  private calculateTestRelation(result: SearchResult, config: RankingConfig): number {
    const path = result.path.toLowerCase();
    const currentPath = config.currentFile?.toLowerCase() || '';

    // Check if this is a test file for the current file
    if (path.includes('test') || path.includes('spec')) {
      const baseName = currentPath.replace(/\.(ts|js|tsx|jsx)$/, '');
      const testName = path.replace(/test\.(ts|js|tsx|jsx)$/, '').replace(/spec\.(ts|js|tsx|jsx)$/, '');

      if (baseName.includes(testName) || testName.includes(baseName)) {
        return 0.9;
      }
    }

    return 0;
  }

  private calculateLanguageCompatibility(result: SearchResult, config: RankingConfig): number {
    if (!config.queryLanguage) {
      return 0;
    }

    const file = this.fileIndexer.getFile(result.path);
    if (!file) {
      return 0;
    }

    // Match language
    if (file.language === config.queryLanguage) {
      return 0.8;
    }

    // Compatible languages (TypeScript <-> JavaScript)
    const compatiblePairs: Record<string, string[]> = {
      typescript: ['javascript', 'typescript'],
      javascript: ['typescript', 'javascript'],
    };

    if (compatiblePairs[config.queryLanguage]?.includes(file.language)) {
      return 0.5;
    }

    return 0;
  }

  private computeFinalScore(factors: RankingFactors, weights: RankingFactors): number {
    let score = 0;

    for (const [key, value] of Object.entries(factors)) {
      const weight = weights[key as keyof RankingFactors] || 0;
      score += value * weight;
    }

    return Math.min(1, Math.max(0, score));
  }

  private expandWithDependencies(results: SearchResult[], config: RankingConfig): SearchResult[] {
    const expanded = [...results];
    const fileSet = new Set(results.map(r => r.path));

    for (const result of results) {
      // Get direct dependencies
      const deps = this.dependencyIndexer.getDependencies(result.path);
      for (const dep of deps) {
        if (!fileSet.has(dep.target)) {
          fileSet.add(dep.target);
          expanded.push({
            fileId: dep.target,
            path: dep.target,
            score: result.score * 0.7,
            reason: `Dependency of ${result.path}`,
            matchType: 'dependency',
          });
        }
      }

      // Get direct dependents
      const dependents = this.dependencyIndexer.getDependents(result.path);
      for (const dep of dependents) {
        if (!fileSet.has(dep.source)) {
          fileSet.add(dep.source);
          expanded.push({
            fileId: dep.source,
            path: dep.source,
            score: result.score * 0.7,
            reason: `Dependent of ${result.path}`,
            matchType: 'dependency',
          });
        }
      }
    }

    return expanded;
  }

  private filterByRelevance(results: RankedResult[], minScore: number): RankedResult[] {
    return results.filter(r => r.finalScore >= minScore);
  }

  explainRanking(result: RankedResult): string {
    const explanations: string[] = [];

    if (result.factors.semanticSimilarity > 0.5) {
      explanations.push(`Semantic similarity: ${(result.factors.semanticSimilarity * 100).toFixed(0)}%`);
    }

    if (result.factors.symbolMatch > 0.5) {
      explanations.push(`Symbol match: ${(result.factors.symbolMatch * 100).toFixed(0)}%`);
    }

    if (result.factors.exactMatch > 0.5) {
      explanations.push(`Exact match: ${(result.factors.exactMatch * 100).toFixed(0)}%`);
    }

    if (result.factors.currentFileBoost > 0) {
      explanations.push('Current file boost');
    }

    if (result.factors.openFileBoost > 0) {
      explanations.push('Open file boost');
    }

    if (result.factors.dependencyDistance > 0.5) {
      explanations.push('Dependency relationship');
    }

    if (result.factors.testRelation > 0.5) {
      explanations.push('Test relationship');
    }

    return explanations.join(', ') || 'General relevance';
  }
}
