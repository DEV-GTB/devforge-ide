// Embedding Service - Creates embeddings for semantic search
import { AIService, AIMessage } from '../../services/aiService';

export interface Embedding {
  id: string;
  fileId: string;
  chunkId: string;
  vector: number[];
  content: string;
}

export class EmbeddingService {
  private aiService: AIService;
  private embeddings: Map<string, Embedding> = new Map();

  constructor(aiConfig: { provider: string; apiKey: string; model: string }) {
    this.aiService = new AIService({
      provider: aiConfig.provider as any,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    });
  }

  async embed(chunk: string, fileId: string): Promise<void> {
    // In a real implementation, this would call an embedding API
    // For now, create a mock embedding
    const mockVector = this.createMockEmbedding(chunk);

    const embedding: Embedding = {
      id: crypto.randomUUID(),
      fileId,
      chunkId: crypto.randomUUID(),
      vector: mockVector,
      content: chunk,
    };

    this.embeddings.set(embedding.id, embedding);
  }

  async search(query: string, topK: number = 5): Promise<Embedding[]> {
    const queryVector = this.createMockEmbedding(query);

    // Simple similarity search
    const results = Array.from(this.embeddings.values())
      .map(emb => ({
        embedding: emb,
        similarity: this.cosineSimilarity(queryVector, emb.vector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(r => r.embedding);

    return results;
  }

  private createMockEmbedding(text: string): number[] {
    // Create a simple hash-based embedding
    // In production, use real embedding models
    const size = 384;
    const vector: number[] = [];
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash = hash & hash;
    }

    for (let i = 0; i < size; i++) {
      vector.push(((hash * (i + 1)) % 1000) / 1000);
    }

    return vector;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
