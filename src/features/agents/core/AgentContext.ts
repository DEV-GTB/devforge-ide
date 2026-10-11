export interface AgentContext {
  projectId: string;
  workspacePath: string;
  permissions: AgentPermissions;
  metadata: Record<string, any>;
}

export interface AgentPermissions {
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

export class AgentContextManager {
  private contexts: Map<string, AgentContext> = new Map();

  createContext(
    projectId: string,
    workspacePath: string,
    permissions: Partial<AgentPermissions> = {},
    metadata: Record<string, any> = {}
  ): AgentContext {
    const defaultPermissions: AgentPermissions = {
      READ_FILES: true,
      WRITE_FILES: true,
      DELETE_FILES: false,
      RUN_BUILD: true,
      INSTALL_PACKAGE: true,
      GIT_COMMIT: false,
      FLASH_DEVICE: false,
      READ_DEVICE: false,
      SERIAL_MONITOR: false,
      RESET_DEVICE: false,
      GPIO_CONTROL: false,
    };

    const context: AgentContext = {
      projectId,
      workspacePath,
      permissions: { ...defaultPermissions, ...permissions },
      metadata,
    };

    this.contexts.set(projectId, context);
    return context;
  }

  getContext(projectId: string): AgentContext | undefined {
    return this.contexts.get(projectId);
  }

  updateContext(projectId: string, updates: Partial<AgentContext>): AgentContext | undefined {
    const context = this.contexts.get(projectId);
    if (!context) return undefined;

    const updated: AgentContext = {
      ...context,
      ...updates,
      permissions: { ...context.permissions, ...updates.permissions },
      metadata: { ...context.metadata, ...updates.metadata },
    };

    this.contexts.set(projectId, updated);
    return updated;
  }

  removeContext(projectId: string): boolean {
    return this.contexts.delete(projectId);
  }

  hasPermission(projectId: string, permission: keyof AgentPermissions): boolean {
    const context = this.contexts.get(projectId);
    return context ? context.permissions[permission] : false;
  }

  grantPermission(projectId: string, permission: keyof AgentPermissions): boolean {
    const context = this.contexts.get(projectId);
    if (!context) return false;

    context.permissions[permission] = true;
    return true;
  }

  revokePermission(projectId: string, permission: keyof AgentPermissions): boolean {
    const context = this.contexts.get(projectId);
    if (!context) return false;

    context.permissions[permission] = false;
    return true;
  }

  getAllContexts(): AgentContext[] {
    return Array.from(this.contexts.values());
  }
}
