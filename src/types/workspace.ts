// Workspace Types
export interface WorkspaceSession {
  id: string;
  projectId: string;
  containerId: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  resources: WorkspaceResources;
  createdAt: Date;
  lastActivity: Date;
}

export interface WorkspaceResources {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface EnvironmentConfig {
  id: string;
  name: string;
  language: string;
  runtime: string;
  dependencies: string[];
  buildCommand: string;
  testCommand: string;
  startCommand: string;
}

export interface ContainerTemplate {
  id: string;
  name: string;
  image: string;
  language: string;
  runtimeVersion: string;
  tools: string[];
  resourceLimits: ResourceLimits;
}

export interface ResourceLimits {
  maxCpu: number;
  maxMemory: number;
  maxDisk: number;
  networkPolicy: 'allow' | 'restrict' | 'none';
  timeout: number;
}
