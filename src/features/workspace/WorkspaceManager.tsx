import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderOpen, Plus, Trash2, Settings, Play, Code, Database, Globe, Terminal } from 'lucide-react';
import { useIDEStore, Workspace } from '../../stores/IDEStore';
import { FadeIn, StaggerContainer } from '../../components/animations';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

export function WorkspaceManager() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, addWorkspace, removeWorkspace } = useIDEStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', path: '', language: 'TypeScript', framework: 'React' });
  const deviceInfo = useDeviceDetection();
  const isMobile = deviceInfo.isMobile;

  const handleCreate = () => {
    if (!newWorkspace.name || !newWorkspace.path) return;

    const workspace: Workspace = {
      id: `ws-${Date.now()}`,
      name: newWorkspace.name,
      path: newWorkspace.path,
      language: newWorkspace.language,
      framework: newWorkspace.framework,
      lastOpened: new Date(),
    };

    addWorkspace(workspace);
    setCurrentWorkspace(workspace.id);
    setShowCreate(false);
    setNewWorkspace({ name: '', path: '', language: 'TypeScript', framework: 'React' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this workspace?')) {
      removeWorkspace(id);
      if (currentWorkspace === id) setCurrentWorkspace(null);
    }
  };

  const getFrameworkIcon = (framework: string) => {
    const icons: Record<string, any> = {
      React: Code,
      Vue: Globe,
      Angular: Globe,
      Node: Terminal,
      Python: Database,
    };
    return icons[framework] || Code;
  };

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-400" />
          Workspaces
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
        <StaggerContainer className="space-y-2">
        {workspaces.map((workspace) => (
          <FadeIn key={workspace.id}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentWorkspace(workspace.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                currentWorkspace === workspace.id
                  ? 'border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20'
                  : 'border-gray-700 bg-gray-800/80 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {React.createElement(getFrameworkIcon(workspace.framework), {
                    className: 'w-5 h-5 text-purple-400',
                  })}
                  <div>
                    <div className="font-medium">{workspace.name}</div>
                    <div className="text-xs text-gray-400">{workspace.path}</div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(workspace.id); }}
                  className="p-1 hover:bg-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-white" />
                </motion.button>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">{workspace.language}</span>
                <span className="px-2 py-1 rounded bg-purple-600/30 text-purple-300">{workspace.framework}</span>
              </div>
            </motion.div>
          </FadeIn>
        ))}
        </StaggerContainer>
      </div>

      {workspaces.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-400 py-12"
        >
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No workspaces yet</p>
          <p className="text-sm mt-2">Create your first workspace to get started</p>
        </motion.div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
            >
              <h3 className="text-lg font-semibold mb-4">Create Workspace</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newWorkspace.name}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="My Project"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Path</label>
                  <input
                    type="text"
                    value={newWorkspace.path}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, path: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="/path/to/project"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Language</label>
                    <select
                      value={newWorkspace.language}
                      onChange={(e) => setNewWorkspace({ ...newWorkspace, language: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      <option>TypeScript</option>
                      <option>JavaScript</option>
                      <option>Python</option>
                      <option>Go</option>
                      <option>Rust</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Framework</label>
                    <select
                      value={newWorkspace.framework}
                      onChange={(e) => setNewWorkspace({ ...newWorkspace, framework: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      <option>React</option>
                      <option>Vue</option>
                      <option>Angular</option>
                      <option>Node</option>
                      <option>None</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
