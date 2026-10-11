import { AgentTask } from './AgentService';
import { ToolRegistry } from './tools/ToolRegistry';
import { AgentMemory } from './AgentMemory';

export interface Plan {
  tasks: AgentTask[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export class AgentPlanner {
  private toolRegistry: ToolRegistry;
  private memory: AgentMemory;

  constructor(toolRegistry: ToolRegistry, memory: AgentMemory) {
    this.toolRegistry = toolRegistry;
    this.memory = memory;
  }

  async createPlan(goal: string, projectId: string): Promise<Plan> {
    // Analyze the goal and project context
    const projectStructure = this.memory.get('project_structure');
    const context = {
      goal,
      projectId,
      projectStructure,
    };

    // Create tasks based on goal analysis
    const tasks = await this.generateTasks(context);

    return {
      tasks,
      estimatedDuration: this.estimateDuration(tasks),
      riskLevel: this.assessRisk(tasks),
    };
  }

  private async generateTasks(context: any): Promise<AgentTask[]> {
    const tasks: AgentTask[] = [];

    // Analyze goal type
    const goal = context.goal.toLowerCase();

    if (goal.includes('create') || goal.includes('add')) {
      // Feature addition workflow
      tasks.push(
        this.createTask('Inspect project structure', 'Analyze existing files and architecture'),
        this.createTask('Identify dependencies', 'Check what packages and files need to be added'),
        this.createTask('Create files', 'Generate new code files'),
        this.createTask('Modify existing files', 'Update imports and integrate new code'),
        this.createTask('Run build', 'Compile the project'),
        this.createTask('Run tests', 'Execute test suite'),
        this.createTask('Verify changes', 'Ensure everything works correctly')
      );
    } else if (goal.includes('fix') || goal.includes('debug')) {
      // Bug fix workflow
      tasks.push(
        this.createTask('Analyze error', 'Understand the issue'),
        this.createTask('Locate problem', 'Find the source of the bug'),
        this.createTask('Propose fix', 'Determine the solution'),
        this.createTask('Apply fix', 'Modify code to resolve issue'),
        this.createTask('Run tests', 'Verify fix does not break anything'),
        this.createTask('Verify resolution', 'Confirm the bug is fixed')
      );
    } else if (goal.includes('delete') || goal.includes('remove')) {
      // Deletion workflow
      tasks.push(
        this.createTask('Identify dependencies', 'Check what depends on target'),
        this.createTask('Remove references', 'Update imports and references'),
        this.createTask('Delete files', 'Remove target files'),
        this.createTask('Run build', 'Verify project still compiles'),
        this.createTask('Run tests', 'Ensure no test failures')
      );
    } else {
      // General workflow
      tasks.push(
        this.createTask('Analyze request', 'Understand what needs to be done'),
        this.createTask('Inspect project', 'Review relevant files'),
        this.createTask('Plan changes', 'Determine necessary modifications'),
        this.createTask('Apply changes', 'Make the required modifications'),
        this.createTask('Build project', 'Compile changes'),
        this.createTask('Run tests', 'Verify with test suite'),
        this.createTask('Verify result', 'Confirm goal is achieved')
      );
    }

    // Set dependencies
    this.setTaskDependencies(tasks);

    return tasks;
  }

  private createTask(title: string, description: string): AgentTask {
    return {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      status: 'pending',
    };
  }

  private setTaskDependencies(tasks: AgentTask[]): void {
    // Set up dependencies - each task depends on the previous one
    for (let i = 1; i < tasks.length; i++) {
      tasks[i].dependsOn = [tasks[i - 1].id];
    }
  }

  private estimateDuration(tasks: AgentTask[]): number {
    // Rough estimate: 30 seconds per task
    return tasks.length * 30000;
  }

  private assessRisk(tasks: AgentTask[]): 'low' | 'medium' | 'high' {
    const hasDeleteTask = tasks.some(t => t.title.toLowerCase().includes('delete'));
    const hasInstallTask = tasks.some(t => t.title.toLowerCase().includes('install'));

    if (hasDeleteTask) return 'high';
    if (hasInstallTask) return 'medium';
    return 'low';
  }
}
