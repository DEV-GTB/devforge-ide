export type PermissionLevel = 'none' | 'read' | 'write' | 'admin';

export interface Permission {
  name: string;
  description: string;
  level: PermissionLevel;
  dangerous: boolean;
}

export interface PermissionRequest {
  permission: string;
  reason: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'denied';
}

export class PermissionManager {
  private permissions: Map<string, Permission> = new Map();
  private grantedPermissions: Set<string> = new Set();
  private pendingRequests: PermissionRequest[] = [];

  constructor() {
    this.initializeDefaultPermissions();
  }

  private initializeDefaultPermissions(): void {
    const defaultPermissions: Permission[] = [
      {
        name: 'READ_FILES',
        description: 'Read and analyze source code files',
        level: 'read',
        dangerous: false,
      },
      {
        name: 'WRITE_FILES',
        description: 'Create and modify source code files',
        level: 'write',
        dangerous: true,
      },
      {
        name: 'DELETE_FILES',
        description: 'Delete files from the project',
        level: 'admin',
        dangerous: true,
      },
      {
        name: 'RUN_BUILD',
        description: 'Execute build commands',
        level: 'write',
        dangerous: false,
      },
      {
        name: 'INSTALL_PACKAGE',
        description: 'Install dependencies and packages',
        level: 'write',
        dangerous: true,
      },
      {
        name: 'GIT_COMMIT',
        description: 'Create git commits',
        level: 'write',
        dangerous: true,
      },
      {
        name: 'FLASH_DEVICE',
        description: 'Flash firmware to connected devices',
        level: 'admin',
        dangerous: true,
      },
      {
        name: 'READ_DEVICE',
        description: 'Read data from connected devices',
        level: 'read',
        dangerous: false,
      },
      {
        name: 'SERIAL_MONITOR',
        description: 'Monitor serial output from devices',
        level: 'read',
        dangerous: false,
      },
      {
        name: 'RESET_DEVICE',
        description: 'Reset connected devices',
        level: 'write',
        dangerous: true,
      },
      {
        name: 'GPIO_CONTROL',
        description: 'Control GPIO pins on devices',
        level: 'admin',
        dangerous: true,
      },
    ];

    for (const perm of defaultPermissions) {
      this.permissions.set(perm.name, perm);
    }
  }

  hasPermission(permission: string): boolean {
    return this.grantedPermissions.has(permission);
  }

  grantPermission(permission: string): boolean {
    if (!this.permissions.has(permission)) {
      return false;
    }

    this.grantedPermissions.add(permission);
    return true;
  }

  revokePermission(permission: string): boolean {
    return this.grantedPermissions.delete(permission);
  }

  grantAll(): void {
    for (const name of this.permissions.keys()) {
      this.grantedPermissions.add(name);
    }
  }

  revokeAll(): void {
    this.grantedPermissions.clear();
  }

  requestPermission(permission: string, reason: string): PermissionRequest {
    const request: PermissionRequest = {
      permission,
      reason,
      requestedAt: new Date(),
      status: 'pending',
    };

    this.pendingRequests.push(request);
    return request;
  }

  approveRequest(requestId: string): boolean {
    const request = this.pendingRequests.find(r => r.permission === requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'approved';
    this.grantedPermissions.add(request.permission);
    return true;
  }

  denyRequest(requestId: string): boolean {
    const request = this.pendingRequests.find(r => r.permission === requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'denied';
    return true;
  }

  getPendingRequests(): PermissionRequest[] {
    return this.pendingRequests.filter(r => r.status === 'pending');
  }

  getPermissionInfo(permission: string): Permission | undefined {
    return this.permissions.get(permission);
  }

  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  getGrantedPermissions(): string[] {
    return Array.from(this.grantedPermissions);
  }

  getPermissionsByLevel(level: PermissionLevel): Permission[] {
    return Array.from(this.permissions.values()).filter(p => p.level === level);
  }

  getDangerousPermissions(): Permission[] {
    return Array.from(this.permissions.values()).filter(p => p.dangerous);
  }

  checkPermissionSet(requiredPermissions: string[]): {
    hasAll: boolean;
    missing: string[];
  } {
    const missing = requiredPermissions.filter(p => !this.hasPermission(p));
    return {
      hasAll: missing.length === 0,
      missing,
    };
  }

  exportState(): {
    granted: string[];
    pending: PermissionRequest[];
  } {
    return {
      granted: Array.from(this.grantedPermissions),
      pending: this.pendingRequests,
    };
  }

  importState(state: { granted: string[]; pending: PermissionRequest[] }): void {
    this.grantedPermissions = new Set(state.granted);
    this.pendingRequests = state.pending;
  }
}
