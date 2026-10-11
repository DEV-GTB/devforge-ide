import { Agent, AgentConfig } from '../core/Agent';
import { Logger } from '../../agent/src/utils/logger';
import { ProjectContextProvider, ContextRequest } from '../../project-intelligence/ProjectContextProvider';

export interface CodeAgentConfig extends AgentConfig {
  language: string;
  framework?: string;
  styleGuide?: string;
  projectContextProvider?: ProjectContextProvider;
  projectId?: string;
}

export class CodeAgent extends Agent {
  protected config: CodeAgentConfig;
  protected logger: Logger;
  protected contextProvider?: ProjectContextProvider;

  constructor(config: CodeAgentConfig) {
    super(config.name || 'CodeAgent', config);
    this.config = config;
    this.logger = new Logger();
    this.contextProvider = config.projectContextProvider;
  }

  async execute(task: string): Promise<string> {
    this.logger.info(`Executing code task: ${task}`);

    try {
      // Get project context if available
      let projectContext = '';
      if (this.contextProvider && this.config.projectId) {
        projectContext = await this.getProjectContext(task);
      }

      const result = await this.generateCode(task, projectContext);
      this.logger.info('Code generation completed');
      return result;
    } catch (error) {
      this.logger.error('Code generation failed', { error });
      throw error;
    }
  }

  private async getProjectContext(task: string): Promise<string> {
    if (!this.contextProvider || !this.config.projectId) {
      return '';
    }

    try {
      const contextPack = await this.contextProvider.buildContext({
        projectId: this.config.projectId,
        task,
        maxTokens: 30000,
        needTests: true,
      });

      // Format context for AI
      let context = 'PROJECT CONTEXT:\n';
      context += `Stack: ${contextPack.projectSummary.stack.join(', ')}\n`;
      context += `Files: ${contextPack.files.length}\n`;
      context += `Symbols: ${contextPack.symbols.length}\n\n`;

      if (contextPack.decisions.length > 0) {
        context += 'ARCHITECTURAL DECISIONS:\n';
        contextPack.decisions.forEach(d => {
          context += `- ${d.category}: ${d.decision}\n`;
        });
        context += '\n';
      }

      if (contextPack.files.length > 0) {
        context += 'RELEVANT FILES:\n';
        contextPack.files.slice(0, 5).forEach(f => {
          context += `- ${f.path} (relevance: ${(f.relevance * 100).toFixed(0)}%)\n`;
        });
        context += '\n';
      }

      return context;
    } catch (error) {
      this.logger.warn('Failed to get project context', { error });
      return '';
    }
  }

  private async generateCode(task: string, projectContext: string): Promise<string> {
    this.logger.debug('Analyzing task requirements', { task });

    const languageContext = this.getLanguageContext();
    const frameworkContext = this.getFrameworkContext();

    this.logger.debug('Context gathered', {
      language: languageContext,
      framework: frameworkContext,
      hasProjectContext: projectContext.length > 0,
    });

    let code = `// Generated code for ${this.config.language}\n// Task: ${task}\n\n`;

    if (projectContext) {
      code += `// ${projectContext.split('\n').join('\n// ')}\n\n`;
    }

    code += `// Implementation would go here\n`;
    code += `// Using ${languageContext}\n`;
    if (frameworkContext !== 'No specific framework') {
      code += `// With ${frameworkContext}\n`;
    }

    return code;
  }

  private getLanguageContext(): string {
    const contexts: Record<string, string> = {
      typescript: 'TypeScript with strict typing and modern ES6+ features',
      javascript: 'Modern JavaScript with ES6+ features',
      python: 'Python 3 with type hints and modern syntax',
      rust: 'Rust with safe memory management and idiomatic patterns',
      go: 'Go with goroutines and channels for concurrency',
    };

    return contexts[this.config.language] || 'General programming language';
  }

  private getFrameworkContext(): string {
    if (!this.config.framework) return 'No specific framework';

    const contexts: Record<string, string> = {
      react: 'React with hooks and functional components',
      vue: 'Vue 3 with Composition API',
      angular: 'Angular with TypeScript and modern patterns',
      express: 'Express.js with middleware and RESTful patterns',
      fastapi: 'FastAPI with async/await and type hints',
    };

    return contexts[this.config.framework] || this.config.framework;
  }

  validateCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!code || code.trim().length === 0) {
      errors.push('Generated code is empty');
    }

    if (this.config.language === 'typescript' && !code.includes('export')) {
      errors.push('TypeScript code should include exports');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
