// Project Context Provider - Main API for AI features to access project intelligence
import { ContextRetriever, SearchRequest, SearchResult, ContextPack } from './ContextRetriever';
import type { ContextRequest } from './ContextRetriever';

export type { ContextRequest };
import { ContextAssembler, AssembledContext, ContextBudget } from './ContextAssembler';
import { ContextRanker, RankingConfig, RankedResult } from './ContextRanker';
import { DecisionMemory, DecisionRecord, DecisionFilter } from './memory/DecisionMemory';
import { UserPreferences, UserPreference } from './memory/UserPreferences';
import { GitAnalyzer, GitCommit, GitFileHistory } from './GitAnalyzer';
import { ParserRegistry, ParseResult } from './parsers/ParserRegistry';
import { VectorStore, VectorEntry, SearchOptions } from './vector/VectorStore';
import { FileWatcher, FileChangeEvent } from './FileWatcher';
import { IndexQueue, IndexJob } from './IndexQueue';
import { SecretScanner, ScanResult } from './SecretScanner';
import { HealthMonitor, HealthStatus, IndexHealth } from './HealthMonitor';
import { ContextBudgetManager, BudgetAllocation, BudgetReport } from './ContextBudgetManager';
import { ProjectIndexer } from './ProjectIndexer';
import { FileIndexer, FileIndex } from './FileIndexer';
import { SymbolIndexer, Symbol } from './SymbolIndexer';
import { DependencyIndexer, Dependency } from './DependencyIndexer';

export interface ProjectContextProviderConfig {
  projectId: string;
  projectPath: string;
  aiConfig: {
    provider: string;
    apiKey: string;
    model: string;
  };
  maxBudget?: number;
}

export class ProjectContextProvider {
  private projectIndexer: ProjectIndexer;
  private contextRetriever: ContextRetriever;
  private contextAssembler: ContextAssembler;
  private contextRanker: ContextRanker;
  private decisionMemory: DecisionMemory;
  private userPreferences: UserPreferences;
  private gitAnalyzer: GitAnalyzer;
  private parserRegistry: ParserRegistry;
  private vectorStore: VectorStore;
  private fileWatcher: FileWatcher;
  private indexQueue: IndexQueue;
  private secretScanner: SecretScanner;
  private healthMonitor: HealthMonitor;
  private budgetManager: ContextBudgetManager;

  constructor(config: ProjectContextProviderConfig) {
    // Initialize components
    const fileIndexer = new FileIndexer(config.projectId);
    const symbolIndexer = new SymbolIndexer(config.projectId);
    const dependencyIndexer = new DependencyIndexer(config.projectId);
    const embeddingService = new (require('./EmbeddingService').EmbeddingService)(config.aiConfig);

    this.projectIndexer = new ProjectIndexer(config.projectId, config.aiConfig);
    this.contextRetriever = new ContextRetriever(
      embeddingService,
      symbolIndexer,
      dependencyIndexer,
      fileIndexer
    );
    this.contextAssembler = new ContextAssembler(this.contextRetriever, fileIndexer);
    this.contextRanker = new ContextRanker(fileIndexer, symbolIndexer, dependencyIndexer);
    this.decisionMemory = new DecisionMemory();
    this.userPreferences = new UserPreferences();
    this.gitAnalyzer = new GitAnalyzer(config.projectPath);
    this.parserRegistry = new ParserRegistry();
    this.vectorStore = new VectorStore();
    this.fileWatcher = new FileWatcher();
    this.indexQueue = new IndexQueue();
    this.secretScanner = new SecretScanner();
    this.healthMonitor = new HealthMonitor();
    this.budgetManager = new ContextBudgetManager(config.maxBudget);
  }

  // Project Indexing
  async indexProject(): Promise<void> {
    await this.projectIndexer.indexProject();
  }

  async indexFile(path: string, content: string): Promise<void> {
    await this.projectIndexer.indexFile(path, content);
  }

  // Context Retrieval
  async search(request: SearchRequest): Promise<SearchResult[]> {
    return this.contextRetriever.search(request);
  }

  async buildContext(request: ContextRequest): Promise<ContextPack> {
    return this.contextRetriever.buildContext(request);
  }

  async assembleContext(request: ContextRequest, budget?: ContextBudget): Promise<AssembledContext> {
    return this.contextAssembler.assemble(request, budget);
  }

  async rankResults(results: SearchResult[], config: RankingConfig): Promise<RankedResult[]> {
    return this.contextRanker.rank(results, config);
  }

  // Decision Memory
  addDecision(decision: Omit<DecisionRecord, 'id' | 'projectId'>): DecisionRecord {
    return this.decisionMemory.addDecision(this.getProjectId(), decision);
  }

  getDecisions(filter?: DecisionFilter): DecisionRecord[] {
    return this.decisionMemory.getDecisions(this.getProjectId(), filter);
  }

  searchDecisions(query: string): DecisionRecord[] {
    return this.decisionMemory.searchDecisions(this.getProjectId(), query);
  }

  inferDecisionsFromCode(codebase: Map<string, string>): DecisionRecord[] {
    return this.decisionMemory.inferDecisionsFromCode(this.getProjectId(), codebase);
  }

  // User Preferences
  addPreference(preference: Omit<UserPreference, 'id' | 'lastUsed'>): UserPreference {
    return this.userPreferences.addPreference(preference);
  }

  getPreferences(category: UserPreference['category']): UserPreference[] {
    return this.userPreferences.getPreferencesByCategory(this.getUserId(), category);
  }

  getCodeStylePreferences() {
    return this.userPreferences.getCodeStylePreferences(this.getUserId(), this.getProjectId());
  }

  getArchitecturePreferences() {
    return this.userPreferences.getArchitecturePreferences(this.getUserId(), this.getProjectId());
  }

  // Git Analysis
  async getRecentCommits(limit?: number): Promise<GitCommit[]> {
    return this.gitAnalyzer.getRecentCommits(limit);
  }

  async getFileHistory(filePath: string, limit?: number): Promise<GitFileHistory> {
    return this.gitAnalyzer.getFileHistory(filePath, limit);
  }

  async getRelatedFiles(filePath: string, threshold?: number): Promise<string[]> {
    return this.gitAnalyzer.getRelatedFiles(filePath, threshold);
  }

  // Parsing
  async parseFile(content: string, filePath: string): Promise<ParseResult> {
    return this.parserRegistry.parse(content, filePath);
  }

  // Vector Store
  async upsertVector(entry: VectorEntry): Promise<void> {
    await this.vectorStore.upsert(entry);
  }

  async searchVectors(queryVector: number[], options?: SearchOptions) {
    return this.vectorStore.search(queryVector, options);
  }

  // File Watching
  watchProject(): void {
    this.fileWatcher.watch(this.getProjectPath());
  }

  onFileChange(listener: (event: FileChangeEvent) => void): () => void {
    return this.fileWatcher.onFileChange(listener);
  }

  // Index Queue
  async enqueueIndexJob(job: Omit<IndexJob, 'id' | 'status' | 'createdAt'>): Promise<string> {
    return this.indexQueue.enqueue(job);
  }

  getIndexStats() {
    return this.indexQueue.getStats();
  }

  // Secret Scanning
  scanForSecrets(content: string, filePath: string): ScanResult {
    return this.secretScanner.scan(content, filePath);
  }

  // Health Monitoring
  async checkHealth(): Promise<HealthStatus> {
    return this.healthMonitor.checkHealth(this.getProjectId());
  }

  async getIndexHealth(indexHealth: IndexHealth): Promise<any> {
    return this.healthMonitor.getIndexHealth(this.getProjectId(), indexHealth);
  }

  // Budget Management
  setMaxBudget(max: number): void {
    this.budgetManager.setMaxBudget(max);
  }

  generateBudgetReport(contextPack: any): BudgetReport {
    return this.budgetManager.generateReport(contextPack);
  }

  isOverBudget(contextPack: any): boolean {
    return this.budgetManager.isOverBudget(contextPack);
  }

  compressContext(contextPack: any, targetBudget: number): any {
    return this.budgetManager.compress(contextPack, targetBudget);
  }

  // Utility methods
  private getProjectId(): string {
    return 'project-001'; // Placeholder
  }

  private getUserId(): string {
    return 'user-001'; // Placeholder
  }

  private getProjectPath(): string {
    return process.cwd(); // Placeholder
  }

  // Cleanup
  dispose(): void {
    this.fileWatcher.unwatchAll();
    this.indexQueue.clear();
  }
}
