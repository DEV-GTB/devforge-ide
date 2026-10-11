// Agent Executor - Executes plan steps using tools
import { AgentType, AgentPermission, ToolContext, ToolResult, AgentPlanStep } from '../../../types/agent';
import { AIService, AIMessage } from '../../../services/aiService';
import * as tools from '../tools';

export class AgentExecutor {
  private aiService: AIService;
  private toolRegistry: Map<string, AgentTool>;

  constructor(
    private projectId: string,
    private permissions: AgentPermission,
    aiConfig: { provider: string; apiKey: string; model: string }
  ) {
    this.aiService = new AIService({
      provider: aiConfig.provider as any,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    });

    this.toolRegistry = new Map();
    this.registerTools();
  }

  private registerTools(): void {
    this.toolRegistry.set('read_file', tools.readFile);
    this.toolRegistry.set('write_file', tools.writeFile);
    this.toolRegistry.set('edit_file', tools.editFile);
    this.toolRegistry.set('search_code', tools.searchCode);
    this.toolRegistry.set('run_command', tools.runCommand);
    this.toolRegistry.set('run_tests', tools.runTests);
    this.toolRegistry.set('git_diff', tools.gitDiff);
  }

  async executeStep(step: AgentPlanStep): Promise<AgentStepResult> {
    const context: ToolContext = {
      projectId: this.projectId,
      sessionId: crypto.randomUUID(),
      permissions: this.permissions,
    };

    try {
      // Use AI to determine which tools to use and in what order
      const toolCalls = await this.planToolCalls(step, context);

      const filesChanged: string[] = [];
      const outputs: string[] = [];

      for (const call of toolCalls) {
        const tool = this.toolRegistry.get(call.tool);
        if (!tool) {
          throw new Error(`Tool not found: ${call.tool}`);
        }

        // Check permissions
        if (!this.checkPermission(call.tool, this.permissions)) {
          throw new Error(`Permission denied for tool: ${call.tool}`);
        }

        const result = await tool.execute(call.params, context);

        if (!result.success) {
          return {
            stepId: step.id,
            success: false,
            output: outputs.join('\n'),
            filesChanged,
            error: result.error,
          };
        }

        outputs.push(result.data as string);
        if (result.data && typeof result.data === 'object' && 'filesChanged' in result.data) {
          filesChanged.push(...(result.data as any).filesChanged);
        }
      }

      return {
        stepId: step.id,
        success: true,
        output: outputs.join('\n'),
        filesChanged,
      };
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        output: '',
        filesChanged: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async planToolCalls(step: AgentPlanStep, context: ToolContext): Promise<ToolCall[]> {
    const prompt = `You need to complete this task: "${step.description}"

Available tools:
- read_file(path): Read file contents
- write_file(path, content): Create/overwrite file
- edit_file(path, startLine, endLine, replacement): Edit specific lines
- search_code(query): Search codebase
- run_command(command): Execute terminal command
- run_tests(): Run test suite
- git_diff(): Show git changes

Plan the tool calls needed. Response as JSON array:
[
  {"tool": "tool_name", "params": {...}}
]`;

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a task execution planner. Plan concrete tool calls.' },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiService.chat(messages, { temperature: 0.2 });

    try {
      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }

  private checkPermission(tool: string, permissions: AgentPermission): boolean {
    const permissionMap: Record<string, keyof AgentPermission> = {
      read_file: 'READ_FILES',
      write_file: 'WRITE_FILES',
      edit_file: 'WRITE_FILES',
      delete_file: 'DELETE_FILES',
      run_command: 'RUN_BUILD',
      run_tests: 'RUN_BUILD',
      git_diff: 'READ_FILES',
    };

    const perm = permissionMap[tool];
    if (!perm) return true;
    return permissions[perm];
  }
}

export interface AgentStepResult {
  stepId: string;
  success: boolean;
  output: string;
  filesChanged: string[];
  error?: string;
}

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
}

export interface AgentTool {
  name: string;
  description: string;
  permissionLevel: number;
  execute(params: unknown, context: ToolContext): Promise<ToolResult>;
}
