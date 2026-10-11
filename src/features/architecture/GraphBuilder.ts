// Graph Builder - Builds architecture graphs
import { Dependency } from '../../types/project';

export interface GraphNode {
  id: string;
  name: string;
  type: 'file' | 'function' | 'class' | 'component' | 'api' | 'database';
  path: string;
  line?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: Dependency['type'];
}

export class GraphBuilder {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: GraphEdge): void {
    this.edges.push(edge);
  }

  buildFromDependencies(dependencies: Dependency[]): void {
    dependencies.forEach(dep => {
      // Create nodes if they don't exist
      if (!this.nodes.has(dep.source)) {
        this.nodes.set(dep.source, {
          id: dep.source,
          name: dep.source.split('/').pop() || dep.source,
          type: 'file',
          path: dep.source,
        });
      }

      if (!this.nodes.has(dep.target)) {
        this.nodes.set(dep.target, {
          id: dep.target,
          name: dep.target.split('/').pop() || dep.target,
          type: 'file',
          path: dep.target,
        });
      }

      // Add edge
      this.edges.push({
        source: dep.source,
        target: dep.target,
        type: dep.type,
      });
    });
  }

  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): GraphEdge[] {
    return this.edges;
  }

  getGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
    };
  }

  clear(): void {
    this.nodes.clear();
    this.edges = [];
  }
}
