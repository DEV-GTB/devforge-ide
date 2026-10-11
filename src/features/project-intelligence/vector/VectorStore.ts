// Vector Store - Persistent storage for embeddings with search capabilities
import { Embedding } from '../EmbeddingService';

export interface VectorEntry {
  id: string;
  projectId: string;
  fileId: string;
  chunkId: string;
  vector: number[];
  metadata: {
    path: string;
    language: string;
    startLine: number;
    endLine: number;
    contentHash: string;
    embeddingModel: string;
    embeddingVersion: string;
    createdAt: Date;
  };
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  filter?: {
    projectId?: string;
    language?: string;
    path?: string;
  };
}

export interface SearchResult {
  entry: VectorEntry;
  score: number;
}

export class VectorStore {
  private entries: Map<string, VectorEntry> = new Map();
  private index: Map<string, Set<string>> = new Map(); // projectId -> entry IDs

  async upsert(entry: VectorEntry): Promise<void> {
    this.entries.set(entry.id, entry);

    // Update project index
    if (!this.index.has(entry.projectId)) {
      this.index.set(entry.projectId, new Set());
    }
    this.index.get(entry.projectId)!.add(entry.id);
  }

  async upsertBatch(entries: VectorEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.upsert(entry);
    }
  }

  async get(id: string): Promise<VectorEntry | undefined> {
    return this.entries.get(id);
  }

  async getByProject(projectId: string): Promise<VectorEntry[]> {
    const entryIds = this.index.get(projectId) || new Set();
    const entries: VectorEntry[] = [];

    for (const id of entryIds) {
      const entry = this.entries.get(id);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  async getByFile(fileId: string): Promise<VectorEntry[]> {
    const entries: VectorEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.fileId === fileId) {
        entries.push(entry);
      }
    }

    return entries;
  }

  async delete(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) return false;

    this.entries.delete(id);
    this.index.get(entry.projectId)?.delete(id);
    return true;
  }

  async deleteByProject(projectId: string): Promise<number> {
    const entryIds = this.index.get(projectId) || new Set();
    let count = 0;

    for (const id of entryIds) {
      this.entries.delete(id);
      count++;
    }

    this.index.delete(projectId);
    return count;
  }

  async deleteByFile(fileId: string): Promise<number> {
    let count = 0;

    for (const [id, entry] of this.entries.entries()) {
      if (entry.fileId === fileId) {
        this.entries.delete(id);
        this.index.get(entry.projectId)?.delete(id);
        count++;
      }
    }

    return count;
  }

  async search(queryVector: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    const { topK = 10, minScore = 0.0, filter } = options;

    // Filter entries based on options
    let candidates = Array.from(this.entries.values());

    if (filter?.projectId) {
      candidates = candidates.filter(e => e.projectId === filter.projectId);
    }

    if (filter?.language) {
      candidates = candidates.filter(e => e.metadata.language === filter.language);
    }

    if (filter?.path) {
      candidates = candidates.filter(e => e.metadata.path === filter.path);
    }

    // Calculate similarity scores
    const results = candidates
      .map(entry => ({
        entry,
        score: this.cosineSimilarity(queryVector, entry.vector),
      }))
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  async getStats(projectId?: string): Promise<{
    totalEntries: number;
    totalProjects: number;
    projectStats?: Map<string, number>;
  }> {
    const totalEntries = this.entries.size;
    const totalProjects = this.index.size;

    if (projectId) {
      const entryIds = this.index.get(projectId) || new Set();
      return {
        totalEntries,
        totalProjects,
        projectStats: new Map([[projectId, entryIds.size]]),
      };
    }

    const projectStats = new Map<string, number>();
    this.index.forEach((entryIds, pid) => {
      projectStats.set(pid, entryIds.size);
    });

    return {
      totalEntries,
      totalProjects,
      projectStats,
    };
  }

  async clear(): Promise<void> {
    this.entries.clear();
    this.index.clear();
  }

  async export(projectId?: string): Promise<string> {
    const entries = projectId
      ? await this.getByProject(projectId)
      : Array.from(this.entries.values());

    return JSON.stringify(entries, null, 2);
  }

  async import(json: string): Promise<number> {
    try {
      const entries = JSON.parse(json) as VectorEntry[];
      for (const entry of entries) {
        await this.upsert(entry);
      }
      return entries.length;
    } catch (error) {
      console.error('Failed to import vector store:', error);
      return 0;
    }
  }
}
