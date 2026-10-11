import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface MemoryNode {
  id: string;
  type: 'file' | 'symbol' | 'dependency' | 'import' | 'export';
  name: string;
  value?: any;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryRelation {
  id: string;
  source: string;
  target: string;
  type: 'imports' | 'exports' | 'depends_on' | 'uses' | 'implements';
  weight: number;
}

export interface ProjectMemory {
  projectId: string;
  nodes: Map<string, MemoryNode>;
  relations: Map<string, MemoryRelation>;
  searchIndex: Map<string, Set<string>>;
}

export class MemoryStore {
  private memories: Map<string, ProjectMemory> = new Map();

  getMemory(projectId: string): ProjectMemory {
    if (!this.memories.has(projectId)) {
      this.memories.set(projectId, {
        projectId,
        nodes: new Map(),
        relations: new Map(),
        searchIndex: new Map(),
      });
    }
    return this.memories.get(projectId)!;
  }

  addNode(projectId: string, node: MemoryNode): void {
    const memory = this.getMemory(projectId);
    memory.nodes.set(node.id, node);

    // Update search index
    const terms = this.tokenize(node.name);
    terms.forEach(term => {
      if (!memory.searchIndex.has(term)) {
        memory.searchIndex.set(term, new Set());
      }
      memory.searchIndex.get(term)!.add(node.id);
    });
  }

  getNode(projectId: string, nodeId: string): MemoryNode | undefined {
    return this.getMemory(projectId).nodes.get(nodeId);
  }

  searchNodes(projectId: string, query: string): MemoryNode[] {
    const memory = this.getMemory(projectId);
    const terms = this.tokenize(query);
    const matchingIds = new Set<string>();

    terms.forEach(term => {
      const matches = memory.searchIndex.get(term);
      if (matches) {
        matches.forEach(id => matchingIds.add(id));
      }
    });

    return Array.from(matchingIds).map(id => memory.nodes.get(id)!);
  }

  addRelation(projectId: string, relation: MemoryRelation): void {
    this.getMemory(projectId).relations.set(relation.id, relation);
  }

  getRelations(projectId: string, nodeId: string): MemoryRelation[] {
    const memory = this.getMemory(projectId);
    return Array.from(memory.relations.values()).filter(
      r => r.source === nodeId || r.target === nodeId
    );
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  }

  clear(projectId: string): void {
    this.memories.delete(projectId);
  }
}

export const useMemoryStore = create(() => ({
  memoryStore: new MemoryStore(),
}));
