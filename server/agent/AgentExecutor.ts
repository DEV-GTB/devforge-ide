import { AgentRun, AgentTask, AgentService } from './AgentService';
import { ToolRegistry } from './tools/ToolRegistry';
import { AgentPolicy } from './AgentPolicy';
import { AgentMemory } from './AgentMemory';

export class AgentExecutor {
  private toolRegistry: ToolRegistry;
  private policy: AgentPolicy;
  private memory: AgentMemory;
  private service: AgentService;

  constructor(toolRegistry: ToolRegistry, policy: AgentPolicy, memory: AgentMemory, service: AgentService) {
    this.toolRegistry = toolRegistry;
    this.policy = policy;
    this.memory = memory;
    this.service = service;
  }

  async executeTask(run: AgentRun, task: AgentTask): Promise<void> {
    // Determine what tools to use based on task
    const tools = this.selectToolsForTask(task);

    for (const tool of tools) {
      const action = this.service.addAction(run.id, tool.type as any, tool.input);

      // Check permissions
      const permission = this.policy.checkPermission(tool.type, run.projectId);
      if (!permission.allowed) {
        if (permission.requiresApproval) {
          // Request approval (simplified for now)
          throw new Error(`Approval required for ${tool.type}`);
        } else {
          throw new Error(`Permission denied for ${tool.type}`);
        }
      }

      // Execute tool
      try {
        const result = await this.toolRegistry.execute(tool.type, {
          ...tool.input,
          projectId: run.projectId,
        });

        this.service.updateActionResult(run.id, action.id, result);

        // Store result in memory
        this.memory.set(`${tool.type}_result`, result);
      } catch (error) {
        this.service.updateActionResult(run.id, action.id, undefined, error instanceof Error ? error.message : String(error));
        throw error;
      }
    }
  }

  private selectToolsForTask(task: AgentTask): Array<{ type: string; input: any }> {
    const tools: Array<{ type: string; input: any }> = [];
    const title = task.title.toLowerCase();

    if (title.includes('inspect') || title.includes('analyze')) {
      tools.push({ type: 'list_files', input: { path: './' } });
      tools.push({ type: 'read_file', input: { path: 'package.json' } });
    } else if (title.includes('create') || title.includes('add')) {
      tools.push({ type: 'write_file', input: { path: 'new-file.ts', content: '// content' } });
    } else if (title.includes('modify') || title.includes('edit')) {
      tools.push({ type: 'edit_file', input: { path: 'file.ts', changes: [] } });
    } else if (title.includes('delete') || title.includes('remove')) {
      tools.push({ type: 'delete_file', input: { path: 'file.ts' } });
    } else if (title.includes('build')) {
      tools.push({ type: 'run_command', input: { command: 'npm run build' } });
    } else if (title.includes('test')) {
      tools.push({ type: 'run_tests', input: {} });
    }

    return tools;
  }
}
