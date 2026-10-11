import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Check, X, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { PermissionManager, Permission, PermissionLevel } from './PermissionManager';

interface PermissionUIProps {
  permissionManager: PermissionManager;
  onPermissionChange?: (permission: string, granted: boolean) => void;
}

export function PermissionUI({ permissionManager, onPermissionChange }: PermissionUIProps) {
  const [selectedLevel, setSelectedLevel] = useState<PermissionLevel | 'all'>('all');
  const [showDangerous, setShowDangerous] = useState(false);

  const permissions = permissionManager.getAllPermissions();
  const grantedPermissions = permissionManager.getGrantedPermissions();

  const filteredPermissions = permissions.filter(p => {
    if (selectedLevel !== 'all' && p.level !== selectedLevel) return false;
    if (!showDangerous && p.dangerous) return false;
    return true;
  });

  const groupedPermissions = {
    none: filteredPermissions.filter(p => p.level === 'none'),
    read: filteredPermissions.filter(p => p.level === 'read'),
    write: filteredPermissions.filter(p => p.level === 'write'),
    admin: filteredPermissions.filter(p => p.level === 'admin'),
  };

  const handleToggle = (permission: string) => {
    if (grantedPermissions.includes(permission)) {
      permissionManager.revokePermission(permission);
      onPermissionChange?.(permission, false);
    } else {
      permissionManager.grantPermission(permission);
      onPermissionChange?.(permission, true);
    }
  };

  const getLevelColor = (level: PermissionLevel): string => {
    const colors = {
      none: 'bg-gray-500',
      read: 'bg-blue-500',
      write: 'bg-yellow-500',
      admin: 'bg-red-500',
    };
    return colors[level];
  };

  const getLevelLabel = (level: PermissionLevel): string => {
    const labels = {
      none: 'None',
      read: 'Read',
      write: 'Write',
      admin: 'Admin',
    };
    return labels[level];
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Permission Manager
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDangerous}
              onChange={(e) => setShowDangerous(e.target.checked)}
              className="rounded"
            />
            Show Dangerous
          </label>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(['all', 'read', 'write', 'admin'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
              selectedLevel === level
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {level === 'all' ? 'All' : getLevelLabel(level)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {Object.entries(groupedPermissions).map(([level, perms]) => (
          perms.length > 0 && (
            <div key={level}>
              <h4 className="text-sm font-medium text-gray-400 mb-2 capitalize">
                {getLevelLabel(level as PermissionLevel)} Permissions
              </h4>
              <div className="space-y-2">
                {perms.map((permission) => {
                  const isGranted = grantedPermissions.includes(permission.name);
                  return (
                    <motion.div
                      key={permission.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{permission.name}</span>
                          {permission.dangerous && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {permission.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle(permission.name)}
                        className={`p-2 rounded-lg transition-colors ${
                          isGranted
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {isGranted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <X className="w-5 h-5" />
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {grantedPermissions.length} / {permissions.length} permissions granted
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => permissionManager.grantAll()}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1"
          >
            <Unlock className="w-4 h-4" />
            Grant All
          </button>
          <button
            onClick={() => permissionManager.revokeAll()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm flex items-center gap-1"
          >
            <Lock className="w-4 h-4" />
            Revoke All
          </button>
        </div>
      </div>
    </div>
  );
}
