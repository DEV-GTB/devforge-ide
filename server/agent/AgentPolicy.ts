export type PermissionLevel = 'read' | 'write' | 'execute' | 'system';

export interface PermissionCheck {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export interface ProjectPolicy {
  allowFileWrite: boolean;
  allowDelete: boolean;
  allowInstall: boolean;
  allowNetwork: boolean;
  allowGitCommit: boolean;
  allowDeploy: boolean;
  allowSystemCommands: boolean;
}

export class AgentPolicy {
  private projectPolicies: Map<string, ProjectPolicy> = new Map();
  private toolPermissions: Map<string, PermissionLevel> = new Map();

  constructor() {
    this.initializeToolPermissions();
  }

  private initializeToolPermissions(): void {
    this.toolPermissions.set('read_file', 'read');
    this.toolPermissions.set('list_files', 'read');
    this.toolPermissions.set('search_code', 'read');
    this.toolPermissions.set('get_project_structure', 'read');
    this.toolPermissions.set('write_file', 'write');
    this.toolPermissions.set('edit_file', 'write');
    this.toolPermissions.set('delete_file', 'write');
    this.toolPermissions.set('run_command', 'execute');
    this.toolPermissions.set('run_tests', 'execute');
  }

  setProjectPolicy(projectId: string, policy: Partial<ProjectPolicy>): void {
    const defaultPolicy: ProjectPolicy = {
      allowFileWrite: true,
      allowDelete: false,
      allowInstall: true,
      allowNetwork: false,
      allowGitCommit: false,
      allowDeploy: false,
      allowSystemCommands: false,
    };

    this.projectPolicies.set(projectId, { ...defaultPolicy, ...policy });
  }

  getProjectPolicy(projectId: string): ProjectPolicy {
    return this.projectPolicies.get(projectId) || {
      allowFileWrite: true,
      allowDelete: false,
      allowInstall: true,
      allowNetwork: false,
      allowGitCommit: false,
      allowDeploy: false,
      allowSystemCommands: false,
    };
  }

  checkPermission(toolName: string, projectId: string): PermissionCheck {
    const toolPermission = this.toolPermissions.get(toolName);
    const projectPolicy = this.getProjectPolicy(projectId);

    if (!toolPermission) {
      return { allowed: false, requiresApproval: false, reason: 'Unknown tool' };
    }

    // Check based on tool permission level
    switch (toolPermission) {
      case 'read':
        return { allowed: true, requiresApproval: false };

      case 'write':
        if (toolName === 'delete_file' && !projectPolicy.allowDelete) {
          return { allowed: false, requiresApproval: true, reason: 'Delete operations require approval' };
        }
        if (!projectPolicy.allowFileWrite) {
          return { allowed: false, requiresApproval: true, reason: 'File write requires approval' };
        }
        return { allowed: true, requiresApproval: false };

      case 'execute':
        if (!projectPolicy.allowSystemCommands) {
          return { allowed: false, requiresApproval: true, reason: 'System commands require approval' };
        }
        return { allowed: true, requiresApproval: false };

      case 'system':
        return { allowed: false, requiresApproval: true, reason: 'System operations require explicit approval' };

      default:
        return { allowed: false, requiresApproval: false, reason: 'Unknown permission level' };
    }
  }

  getToolPermission(toolName: string): PermissionLevel | undefined {
    return this.toolPermissions.get(toolName);
  }
}
