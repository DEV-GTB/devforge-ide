// Agent Types
export type AgentState = 'IDLE' | 'PLANNING' | 'WORKING' | 'WAITING' | 'BLOCKED' | 'REVIEWING' | 'FAILED' | 'COMPLETED';

export type AgentType = 'project-manager' | 'coding' | 'frontend' | 'backend' | 'testing' | 'reviewer' | 'documentation';

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: unknown;
  permissionLevel: number;
}

export interface AgentMessage {
  taskId: string;
  from: string;
  to: string;
  message: string;
  files?: string[];
  timestamp: Date;
}

export interface AgentTask {
  id: string;
  projectId: string;
  sessionId: string;
  agentType: AgentType;
  status: AgentState;
  description: string;
  createdAt: Date;
  completedAt?: Date;
  result?: unknown;
}

export interface AgentPermission {
  READ_FILES: boolean;
  WRITE_FILES: boolean;
  DELETE_FILES: boolean;
  RUN_BUILD: boolean;
  INSTALL_PACKAGE: boolean;
  GIT_COMMIT: boolean;
  FLASH_DEVICE: boolean;
  READ_DEVICE: boolean;
  SERIAL_MONITOR: boolean;
  RESET_DEVICE: boolean;
  GPIO_CONTROL: boolean;
}

export interface ToolContext {
  projectId: string;
  sessionId: string;
  permissions: AgentPermission;
  userId?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AgentPlan {
  steps: AgentPlanStep[];
  estimatedDuration: number;
  dependencies: string[];
}

export interface AgentPlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agent: AgentType;
  files?: string[];
}
