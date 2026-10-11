// Project Indexer - Main coordinator for project intelligence
import { FileIndexer } from './FileIndexer';
import { SymbolIndexer } from './SymbolIndexer';
import { DependencyIndexer } from './DependencyIndexer';
import { Chunker } from './Chunker';
import { EmbeddingService } from './EmbeddingService';
import { SecretScanner } from './SecretScanner';
import { VectorStore } from './vector/VectorStore';
import { ParserRegistry } from './parsers/ParserRegistry';

export class ProjectIndexer {
  private fileIndexer: FileIndexer;
  private symbolIndexer: SymbolIndexer;
  private dependencyIndexer: DependencyIndexer;
  private chunker: Chunker;
  private embeddingService: EmbeddingService;
  private secretScanner: SecretScanner;
  private vectorStore: VectorStore;
  private parserRegistry: ParserRegistry;

  constructor(
    private projectId: string,
    aiConfig: { provider: string; apiKey: string; model: string }
  ) {
    this.fileIndexer = new FileIndexer(projectId);
    this.symbolIndexer = new SymbolIndexer(projectId);
    this.dependencyIndexer = new DependencyIndexer(projectId);
    this.chunker = new Chunker();
    this.embeddingService = new EmbeddingService(aiConfig);
    this.secretScanner = new SecretScanner();
    this.vectorStore = new VectorStore();
    this.parserRegistry = new ParserRegistry();
  }

  async indexProject(): Promise<void> {
    console.log('Starting project indexing...');

    // 1. Index all files
    const files = await this.fileIndexer.indexAll();
    console.log(`Indexed ${files.length} files`);

    // 2. Extract symbols from code files
    for (const file of files) {
      if (this.isCodeFile(file.path) && file.content) {
        // Check for secrets first
        const scanResult = this.secretScanner.scan(file.content, file.path);
        if (scanResult.hasSecrets) {
          console.warn(`Secrets detected in ${file.path}, skipping indexing`);
          continue;
        }

        const symbols = await this.symbolIndexer.indexFile(file.path, file.content);
        console.log(`Extracted ${symbols.length} symbols from ${file.path}`);
      }
    }

    // 3. Build dependency graph
    await this.dependencyIndexer.buildGraph(files);
    console.log('Built dependency graph');

    // 4. Chunk and embed for semantic search
    for (const file of files) {
      if (this.isCodeFile(file.path) && file.content) {
        const scanResult = this.secretScanner.scan(file.content, file.path);
        if (!scanResult.hasSecrets) {
          const chunks = this.chunker.chunk(file.content);
          for (const chunk of chunks) {
            await this.embeddingService.embed(chunk.content, file.path);
          }
        }
      }
    }

    console.log('Project indexing complete');
  }

  async indexFile(path: string, content: string): Promise<void> {
    // Check for secrets
    const scanResult = this.secretScanner.scan(content, path);
    if (scanResult.hasSecrets) {
      console.warn(`Secrets detected in ${path}, skipping indexing`);
      return;
    }

    // Incremental indexing for single file
    await this.fileIndexer.indexFile(path, content);

    if (this.isCodeFile(path)) {
      await this.symbolIndexer.indexFile(path, content);
      const chunks = this.chunker.chunk(content);
      for (const chunk of chunks) {
        await this.embeddingService.embed(chunk.content, path);
      }
    }

    await this.dependencyIndexer.updateFile(path, content);
  }

  private isCodeFile(path: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.cpp', '.c', '.java', '.go', '.rs'];
    return codeExtensions.some(ext => path.endsWith(ext));
  }
}
