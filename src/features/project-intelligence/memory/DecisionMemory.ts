// Decision Memory - Stores and retrieves architectural decisions
import { ProjectDecision } from '../../../types/project';

export interface DecisionRecord {
  id: string;
  projectId: string;
  category: string;
  decision: string;
  reasoning: string;
  timestamp: Date;
  confidence: number;
  source: 'developer' | 'ai-inferred' | 'code-detected';
  status: 'active' | 'superseded' | 'deprecated';
  supersededBy?: string;
  verifiedAt?: Date;
  tags: string[];
  relatedFiles: string[];
}

export interface DecisionFilter {
  category?: string;
  status?: DecisionRecord['status'];
  source?: DecisionRecord['source'];
  tags?: string[];
  minConfidence?: number;
}

export class DecisionMemory {
  private decisions: Map<string, DecisionRecord[]> = new Map();

  addDecision(projectId: string, decision: Omit<DecisionRecord, 'id' | 'projectId'>): DecisionRecord {
    const record: DecisionRecord = {
      ...decision,
      id: crypto.randomUUID(),
      projectId,
    };

    if (!this.decisions.has(projectId)) {
      this.decisions.set(projectId, []);
    }

    this.decisions.get(projectId)!.push(record);
    return record;
  }

  getDecisions(projectId: string, filter?: DecisionFilter): DecisionRecord[] {
    const projectDecisions = this.decisions.get(projectId) || [];

    if (!filter) {
      return projectDecisions;
    }

    return projectDecisions.filter(d => {
      if (filter.category && d.category !== filter.category) return false;
      if (filter.status && d.status !== filter.status) return false;
      if (filter.source && d.source !== filter.source) return false;
      if (filter.minConfidence && d.confidence < filter.minConfidence) return false;
      if (filter.tags && !filter.tags.some(tag => d.tags.includes(tag))) return false;
      return true;
    });
  }

  getDecision(projectId: string, decisionId: string): DecisionRecord | undefined {
    const projectDecisions = this.decisions.get(projectId) || [];
    return projectDecisions.find(d => d.id === decisionId);
  }

  searchDecisions(projectId: string, query: string): DecisionRecord[] {
    const projectDecisions = this.decisions.get(projectId) || [];
    const queryLower = query.toLowerCase();

    return projectDecisions.filter(d =>
      d.decision.toLowerCase().includes(queryLower) ||
      d.reasoning.toLowerCase().includes(queryLower) ||
      d.category.toLowerCase().includes(queryLower) ||
      d.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  updateDecision(projectId: string, decisionId: string, updates: Partial<DecisionRecord>): DecisionRecord | undefined {
    const projectDecisions = this.decisions.get(projectId);
    if (!projectDecisions) return undefined;

    const index = projectDecisions.findIndex(d => d.id === decisionId);
    if (index === -1) return undefined;

    projectDecisions[index] = { ...projectDecisions[index], ...updates };
    return projectDecisions[index];
  }

  supersedeDecision(projectId: string, decisionId: string, newDecision: Omit<DecisionRecord, 'id' | 'projectId' | 'supersededBy'>): DecisionRecord {
    const oldDecision = this.getDecision(projectId, decisionId);
    if (oldDecision) {
      this.updateDecision(projectId, decisionId, {
        status: 'superseded',
        supersededBy: 'new', // Will be updated with actual ID
      });
    }

    const newRecord = this.addDecision(projectId, {
      ...newDecision,
      supersededBy: decisionId,
    });

    // Update old decision with new ID
    if (oldDecision) {
      this.updateDecision(projectId, decisionId, {
        supersededBy: newRecord.id,
      });
    }

    return newRecord;
  }

  verifyDecision(projectId: string, decisionId: string, verified: boolean): DecisionRecord | undefined {
    return this.updateDecision(projectId, decisionId, {
      confidence: verified ? 1.0 : 0.0,
      verifiedAt: new Date(),
    });
  }

  deleteDecision(projectId: string, decisionId: string): boolean {
    const projectDecisions = this.decisions.get(projectId);
    if (!projectDecisions) return false;

    const index = projectDecisions.findIndex(d => d.id === decisionId);
    if (index === -1) return false;

    projectDecisions.splice(index, 1);
    return true;
  }

  clearProject(projectId: string): void {
    this.decisions.delete(projectId);
  }

  // AI decision inference from code
  inferDecisionsFromCode(projectId: string, codebase: Map<string, string>): DecisionRecord[] {
    const inferred: DecisionRecord[] = [];

    // Infer state management
    const hasZustand = this.hasDependency(codebase, 'zustand');
    const hasRedux = this.hasDependency(codebase, 'redux');
    const hasContext = this.hasPattern(codebase, 'createContext');

    if (hasZustand) {
      inferred.push(this.addDecision(projectId, {
        category: 'state-management',
        decision: 'Use Zustand for state management',
        reasoning: 'Detected Zustand in package.json and store files',
        confidence: 0.95,
        source: 'code-detected',
        status: 'active',
        tags: ['state', 'frontend'],
        relatedFiles: this.findRelatedFiles(codebase, 'zustand'),
        timestamp: new Date(),
      }));
    } else if (hasRedux) {
      inferred.push(this.addDecision(projectId, {
        category: 'state-management',
        decision: 'Use Redux for state management',
        reasoning: 'Detected Redux in package.json',
        confidence: 0.95,
        source: 'code-detected',
        status: 'active',
        tags: ['state', 'frontend'],
        relatedFiles: this.findRelatedFiles(codebase, 'redux'),
        timestamp: new Date(),
      }));
    } else if (hasContext) {
      inferred.push(this.addDecision(projectId, {
        category: 'state-management',
        decision: 'Use React Context for state management',
        reasoning: 'Detected React Context usage',
        confidence: 0.8,
        source: 'code-detected',
        status: 'active',
        tags: ['state', 'frontend'],
        relatedFiles: this.findRelatedFiles(codebase, 'context'),
        timestamp: new Date(),
      }));
    }

    // Infer authentication
    const hasJWT = this.hasPattern(codebase, 'jwt') || this.hasPattern(codebase, 'jsonwebtoken');
    const hasSession = this.hasPattern(codebase, 'session');

    if (hasJWT) {
      inferred.push(this.addDecision(projectId, {
        category: 'authentication',
        decision: 'Use JWT for authentication',
        reasoning: 'Detected JWT libraries in codebase',
        confidence: 0.9,
        source: 'code-detected',
        status: 'active',
        tags: ['auth', 'security'],
        relatedFiles: this.findRelatedFiles(codebase, 'auth'),
        timestamp: new Date(),
      }));
    } else if (hasSession) {
      inferred.push(this.addDecision(projectId, {
        category: 'authentication',
        decision: 'Use session-based authentication',
        reasoning: 'Detected session management code',
        confidence: 0.8,
        source: 'code-detected',
        status: 'active',
        tags: ['auth', 'security'],
        relatedFiles: this.findRelatedFiles(codebase, 'session'),
        timestamp: new Date(),
      }));
    }

    // Infer API style
    const hasREST = this.hasPattern(codebase, 'express') || this.hasPattern(codebase, 'fastify');
    const hasGraphQL = this.hasPattern(codebase, 'graphql') || this.hasPattern(codebase, 'apollo');

    if (hasGraphQL) {
      inferred.push(this.addDecision(projectId, {
        category: 'api',
        decision: 'Use GraphQL for API',
        reasoning: 'Detected GraphQL libraries',
        confidence: 0.95,
        source: 'code-detected',
        status: 'active',
        tags: ['api', 'backend'],
        relatedFiles: this.findRelatedFiles(codebase, 'graphql'),
        timestamp: new Date(),
      }));
    } else if (hasREST) {
      inferred.push(this.addDecision(projectId, {
        category: 'api',
        decision: 'Use REST API',
        reasoning: 'Detected REST framework (Express/Fastify)',
        confidence: 0.9,
        source: 'code-detected',
        status: 'active',
        tags: ['api', 'backend'],
        relatedFiles: this.findRelatedFiles(codebase, 'api'),
        timestamp: new Date(),
      }));
    }

    // Infer database
    const hasPostgres = this.hasDependency(codebase, 'pg') || this.hasDependency(codebase, 'postgres');
    const hasMongo = this.hasDependency(codebase, 'mongodb') || this.hasDependency(codebase, 'mongoose');
    const hasSQLite = this.hasDependency(codebase, 'sqlite') || this.hasDependency(codebase, 'better-sqlite3');

    if (hasPostgres) {
      inferred.push(this.addDecision(projectId, {
        category: 'database',
        decision: 'Use PostgreSQL',
        reasoning: 'Detected PostgreSQL driver',
        confidence: 0.95,
        source: 'code-detected',
        status: 'active',
        tags: ['database', 'backend'],
        relatedFiles: this.findRelatedFiles(codebase, 'postgres'),
        timestamp: new Date(),
      }));
    } else if (hasMongo) {
      inferred.push(this.addDecision(projectId, {
        category: 'database',
        decision: 'Use MongoDB',
        reasoning: 'Detected MongoDB driver',
        confidence: 0.95,
        source: 'code-detected',
        status: 'active',
        tags: ['database', 'backend'],
        relatedFiles: this.findRelatedFiles(codebase, 'mongo'),
        timestamp: new Date(),
      }));
    } else if (hasSQLite) {
      inferred.push(this.addDecision(projectId, {
        category: 'database',
        decision: 'Use SQLite',
        reasoning: 'Detected SQLite driver',
        confidence: 0.95,
        source: 'code-detected',
        status: 'active',
        tags: ['database', 'backend'],
        relatedFiles: this.findRelatedFiles(codebase, 'sqlite'),
        timestamp: new Date(),
      }));
    }

    return inferred;
  }

  private hasDependency(codebase: Map<string, string>, dep: string): boolean {
    const packageJson = codebase.get('package.json');
    if (!packageJson) return false;

    try {
      const pkg = JSON.parse(packageJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      return Object.keys(deps).some(d => d.toLowerCase().includes(dep.toLowerCase()));
    } catch {
      return false;
    }
  }

  private hasPattern(codebase: Map<string, string>, pattern: string): boolean {
    for (const [path, content] of codebase) {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private findRelatedFiles(codebase: Map<string, string>, keyword: string): string[] {
    const related: string[] = [];
    const keywordLower = keyword.toLowerCase();

    for (const [path, content] of codebase) {
      if (path.toLowerCase().includes(keywordLower) || content.toLowerCase().includes(keywordLower)) {
        related.push(path);
      }
    }

    return related.slice(0, 10); // Limit to 10 files
  }

  getCategories(projectId: string): string[] {
    const projectDecisions = this.decisions.get(projectId) || [];
    const categories = new Set(projectDecisions.map(d => d.category));
    return Array.from(categories);
  }

  getTags(projectId: string): string[] {
    const projectDecisions = this.decisions.get(projectId) || [];
    const tags = new Set(projectDecisions.flatMap(d => d.tags));
    return Array.from(tags);
  }

  exportDecisions(projectId: string): string {
    const projectDecisions = this.decisions.get(projectId) || [];
    return JSON.stringify(projectDecisions, null, 2);
  }

  importDecisions(projectId: string, json: string): DecisionRecord[] {
    try {
      const decisions = JSON.parse(json) as DecisionRecord[];
      decisions.forEach(d => {
        this.addDecision(projectId, d);
      });
      return decisions;
    } catch (error) {
      console.error('Failed to import decisions:', error);
      return [];
    }
  }
}
