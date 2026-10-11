// Agent Memory - Stores project context and session history
import { AgentPlan, AgentStepResult } from './AgentOrchestrator';

export class AgentMemory {
  private sessions: Map<string, AgentSession> = new Map();
  private projectContext: ProjectContext | null = null;

  constructor(private projectId: string) {}

  async getProjectContext(): Promise<ProjectContext> {
    if (this.projectContext) {
      return this.projectContext;
    }

    // In a real implementation, this would load from the project intelligence system
    this.projectContext = {
      language: 'TypeScript',
      framework: 'React',
      keyFiles: ['src/App.tsx', 'src/main.tsx'],
      recentChanges: [],
    };

    return this.projectContext;
  }

  async saveSession(request: string, plan: AgentPlan, results: AgentStepResult[]): Promise<void> {
    const session: AgentSession = {
      id: crypto.randomUUID(),
      projectId: this.projectId,
      request,
      plan,
      results,
      timestamp: new Date(),
    };

    this.sessions.set(session.id, session);

    // In a real implementation, this would persist to storage
    console.log('Session saved:', session.id);
  }

  getSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }

  getRecentSessions(limit: number = 10): AgentSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async updateProjectContext(context: Partial<ProjectContext>): Promise<void> {
    this.projectContext = {
      ...this.projectContext,
      ...context,
    };
  }
}

export interface AgentSession {
  id: string;
  projectId: string;
  request: string;
  plan: AgentPlan;
  results: AgentStepResult[];
  timestamp: Date;
}

export interface ProjectContext {
  language: string;
  framework?: string;
  keyFiles: string[];
  recentChanges: string[];
}
