// Tool: Run terminal command
import { ToolContext, ToolResult } from '../../../types/agent';

export async function runCommandTool(params: { command: string; cwd?: string }, context: ToolContext): Promise<ToolResult> {
  try {
    // Security check - block dangerous commands
    const dangerousCommands = ['rm -rf', 'format', 'shutdown', 'del /f', 'format c:'];
    const isDangerous = dangerousCommands.some(cmd => params.command.toLowerCase().includes(cmd));

    if (isDangerous) {
      return {
        success: false,
        error: 'Command blocked by security policy',
      };
    }

    // In a real implementation, this would execute in a sandboxed environment
    // For now, return a mock response
    return {
      success: true,
      data: {
        command: params.command,
        output: `Command executed: ${params.command}`,
        exitCode: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run command',
    };
  }
}

export const runCommand = {
  name: 'run_command',
  description: 'Execute a terminal command (security-restricted)',
  permissionLevel: 2,
  execute: runCommandTool,
};
