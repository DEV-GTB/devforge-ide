// Project Types
export interface Project {
  id: string;
  name: string;
  owner_id?: string;
  language: string;
  framework?: string;
  path: string;
  created_at: Date;
  updated_at: Date;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  aiProvider: 'groq' | 'huggingface' | 'openrouter' | 'together';
  aiModel: string;
  autoSave: boolean;
  autoBuild: boolean;
  enableTTS: boolean;
  ttsProvider: 'browser' | 'elevenlabs' | 'coqui';
  permissions: Record<string, boolean>;
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string;
  size?: number;
  modified?: Date;
  content?: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  content: string;
  hash: string;
  createdAt: Date;
  author?: string;
}

export interface ProjectSymbol {
  id: string;
  projectId: string;
  fileId: string;
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'component';
  line: number;
  column: number;
  signature?: string;
  documentation?: string;
}

export interface Dependency {
  source: string;
  target: string;
  type: 'IMPORT' | 'CALLS' | 'EXTENDS' | 'IMPLEMENTS' | 'USES' | 'API_CALL' | 'DATABASE_ACCESS';
}

export interface ProjectDecision {
  id: string;
  projectId: string;
  category: string;
  decision: string;
  reasoning: string;
  timestamp: Date;
}
