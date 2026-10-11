import { FileNode, removeBundledStarterFiles } from '../core/filesystem';

export interface ClipboardItem {
  id: string;
  name: string;
  path: string;
  mode: 'copy' | 'cut';
}

export interface WorkspaceStorageMeta {
  activeWorkspaceId: string;
  activeWorkspaceName: string;
  expandedFolderIds: string[];
  selectedItemId: string | null;
  currentPath: string | null;
  recentWorkspaces: { id: string; name: string; lastOpened: number }[];
}

const STORAGE_FILES_KEY = 'devforge_fs_files_v2';
const STORAGE_META_KEY = 'devforge_fs_meta_v2';

/**
 * Creates the official initial project structure matching specification:
 * PROJECT
 * ├── src
 * │   ├── components
 * │   │   └── Header.tsx
 * │   ├── pages
 * │   │   └── Home.tsx
 * │   ├── App.tsx
 * │   ├── main.tsx
 * │   └── style.css
 * ├── public
 * │   └── assets
 * │       └── logo.svg
 * ├── index.html
 * ├── package.json
 * └── README.md
 */
export function createProjectDemoTree(): FileNode[] {
  return [
    {
      id: 'folder-src',
      name: 'src',
      path: 'src',
      type: 'folder',
      isOpen: true,
      children: [
        {
          id: 'folder-components',
          name: 'components',
          path: 'src/components',
          type: 'folder',
          isOpen: true,
          children: [
            {
              id: 'file-header-tsx',
              name: 'Header.tsx',
              path: 'src/components/Header.tsx',
              type: 'file',
              content: `import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="workspace-header">
      <div className="status-dot active" />
      <div>
        <h1 className="title">{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}
`
            }
          ]
        },
        {
          id: 'folder-pages',
          name: 'pages',
          path: 'src/pages',
          type: 'folder',
          isOpen: true,
          children: [
            {
              id: 'file-home-tsx',
              name: 'Home.tsx',
              path: 'src/pages/Home.tsx',
              type: 'file',
              content: `import React from 'react';
import { Header } from '../components/Header';

export function Home() {
  return (
    <div className="page-container">
      <Header 
        title="DevForge Dashboard" 
        subtitle="Full filesystem tree with reactive workspace updates" 
      />
      <div className="content-card">
        <h3>Welcome to DevForge IDE</h3>
        <p>Your local runtime environment is active and responsive.</p>
      </div>
    </div>
  );
}
`
            }
          ]
        },
        {
          id: 'file-app-tsx',
          name: 'App.tsx',
          path: 'src/App.tsx',
          type: 'file',
          content: `import React, { useState } from 'react';
import { Header } from './components/Header';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="card" id="app-root">
      <Header title="DevForge Developer Workspace" />
      <p className="subtitle">
        High-performance browser filesystem with nesting and live reactivity.
      </p>

      <div className="action-row">
        <button
          className="btn-primary"
          id="counter-btn"
          onClick={() => setCount((c) => c + 1)}
        >
          Increment Counter
        </button>
        <span className="count-display" id="counter-val">{count}</span>
      </div>

      <div className="status-footer">
        Status: <span>Online &amp; Local Runtime Ready</span>
      </div>
    </div>
  );
}
`
        },
        {
          id: 'file-main-tsx',
          name: 'main.tsx',
          path: 'src/main.tsx',
          type: 'file',
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './style.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
`
        },
        {
          id: 'file-style-css',
          name: 'style.css',
          path: 'src/style.css',
          type: 'file',
          content: `/* Modern Developer Workbench Stylesheet */
:root {
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --bg: #0c0d12;
  --surface: #12131a;
  --border: #1f212d;
  --text: #f4f4f5;
  --text-muted: #9ca3af;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  background-color: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 2rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.6);
  text-align: center;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 0.75rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.count-display {
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: #60a5fa;
  min-width: 2rem;
}

.status-footer {
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.status-footer span {
  color: #10b981;
  font-weight: 600;
}
`
        }
      ]
    },
    {
      id: 'folder-public',
      name: 'public',
      path: 'public',
      type: 'folder',
      isOpen: true,
      children: [
        {
          id: 'folder-assets',
          name: 'assets',
          path: 'public/assets',
          type: 'folder',
          isOpen: false,
          children: [
            {
              id: 'file-logo-svg',
              name: 'logo.svg',
              path: 'public/assets/logo.svg',
              type: 'file',
              content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 18 22 12 16 6"></polyline>
  <polyline points="8 6 2 12 8 18"></polyline>
</svg>`
            }
          ]
        }
      ]
    },
    {
      id: 'file-index-html',
      name: 'index.html',
      path: 'index.html',
      type: 'file',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevForge Project</title>
  <link rel="stylesheet" href="src/style.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="src/main.tsx"></script>
</body>
</html>
`
    },
    {
      id: 'file-package-json',
      name: 'package.json',
      path: 'package.json',
      type: 'file',
      content: `{
  "name": "devforge-project",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.4.2",
    "vite": "^5.2.0"
  }
}
`
    },
    {
      id: 'file-readme-md',
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      content: `# DevForge Project

A high-performance in-browser IDE with real file operations, virtualized tree navigation, and persistent storage.

## Project Structure
- \`src/main.tsx\` — React application bootstrap
- \`src/App.tsx\` — Root component
- \`src/components/Header.tsx\` — Shared header component
- \`src/pages/Home.tsx\` — Home view
- \`src/style.css\` — Modern stylesheet
- \`public/assets/logo.svg\` — SVG assets
- \`index.html\` — HTML template
- \`package.json\` — Dependency manifest

## Explorer Shortcuts
- \`Enter\`: Open file or toggle folder
- \`F2\`: Rename file or folder
- \`Delete\`: Delete selected item
- \`⌘C\` / \`Ctrl+C\`: Copy item
- \`⌘X\` / \`Ctrl+X\`: Cut item
- \`⌘V\` / \`Ctrl+V\`: Paste item
- \`Drag & Drop\`: Move item to target folder
`
    }
  ];
}

/**
 * Single Filesystem Service
 * Responsible for all operations: list, read, write, create, rename, move, copy, duplicate, delete, exists, refresh.
 */
class FilesystemService {
  private files: FileNode[] = [];
  private clipboard: ClipboardItem | null = null;
  private directoryHandle: any = null; // FileSystemDirectoryHandle if opened from disk

  constructor() {
    this.files = this.loadFilesFromStorage();
  }

  // --- Storage & Initialization ---

  public getFiles(): FileNode[] {
    return this.files;
  }

  public setFiles(newFiles: FileNode[]): void {
    this.files = newFiles;
    this.persistFilesToStorage();
  }

  public loadFilesFromStorage(): FileNode[] {
    try {
      const raw = localStorage.getItem(STORAGE_FILES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return removeBundledStarterFiles(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read stored filesystem:', e);
    }
    return [];
  }

  public persistFilesToStorage(): void {
    try {
      localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(this.files));
    } catch (e) {
      console.warn('Could not save filesystem to storage:', e);
    }
  }

  public loadMeta(): WorkspaceStorageMeta {
    try {
      const raw = localStorage.getItem(STORAGE_META_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read workspace meta:', e);
    }
    return {
      activeWorkspaceId: 'default-workspace',
      activeWorkspaceName: 'PROJECT',
      expandedFolderIds: ['folder-src', 'folder-components', 'folder-pages', 'folder-public'],
      selectedItemId: 'file-main-tsx',
      currentPath: 'src/main.tsx',
      recentWorkspaces: [
        { id: 'default-workspace', name: 'PROJECT', lastOpened: Date.now() }
      ]
    };
  }

  public saveMeta(meta: Partial<WorkspaceStorageMeta>): void {
    try {
      const existing = this.loadMeta();
      const updated = { ...existing, ...meta };
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save workspace meta:', e);
    }
  }

  // --- Core Operations: list, read, write, exists ---

  public list(parentPath: string | null = null): FileNode[] {
    if (!parentPath) {
      return this.files;
    }
    const parentNode = this.findNodeByPath(parentPath);
    if (parentNode && parentNode.type === 'folder') {
      return parentNode.children || [];
    }
    return [];
  }

  public read(pathOrId: string): string | null {
    const node = this.findNode(pathOrId);
    return node && node.type === 'file' ? (node.content ?? '') : null;
  }

  public write(pathOrId: string, content: string): boolean {
    const node = this.findNode(pathOrId);
    if (!node || node.type !== 'file') return false;

    this.files = this.updateNode(this.files, node.id, (n) => ({
      ...n,
      content,
      isDirty: true
    }));
    this.persistFilesToStorage();
    return true;
  }

  public async writeFile(pathOrId: string, content: string): Promise<{ success: boolean; error?: string }> {
    const node = this.findNode(pathOrId);
    if (!node || node.type !== 'file') {
      return { success: false, error: 'File not found' };
    }

    this.files = this.updateNode(this.files, node.id, (n) => ({
      ...n,
      content,
      isDirty: false
    }));
    this.persistFilesToStorage();
    return { success: true };
  }

  public async createFile(fullPath: string, initialContent = ''): Promise<{ success: boolean; node?: FileNode; error?: string }> {
    const parts = fullPath.split('/').filter(Boolean);
    if (parts.length === 0) return { success: false, error: 'Invalid path' };
    const fileName = parts.pop()!;
    const parentPath = parts.length > 0 ? parts.join('/') : null;

    if (parentPath && !this.exists(parentPath)) {
      this.ensureDirectoryPath(parentPath);
    }

    return this.create(parentPath, fileName, 'file', initialContent);
  }

  private ensureDirectoryPath(dirPath: string): void {
    const parts = dirPath.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      const prev = current;
      current = current ? `${current}/${part}` : part;
      if (!this.exists(current)) {
        this.create(prev || null, part, 'folder');
      }
    }
  }

  public exists(path: string): boolean {
    return this.findNodeByPath(path) !== null;
  }

  public refresh(): FileNode[] {
    // In-memory refresh with storage sync
    this.files = this.loadFilesFromStorage();
    return this.files;
  }

  // --- Core Operations: create, rename, delete, duplicate ---

  public create(
    parentPathOrId: string | null,
    name: string,
    type: 'file' | 'folder',
    initialContent = ''
  ): { success: boolean; node?: FileNode; error?: string } {
    const cleanName = name.trim();
    if (!cleanName) {
      return { success: false, error: 'Name cannot be empty' };
    }
    if (cleanName.includes('/') || cleanName.includes('\\')) {
      return { success: false, error: 'Name cannot contain slashes' };
    }

    let parentNode: FileNode | null = null;
    if (parentPathOrId) {
      parentNode = this.findNode(parentPathOrId);
    }

    const parentPath = parentNode ? parentNode.path : null;
    const newPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    // Check collision in the same parent
    const siblings = parentNode ? (parentNode.children || []) : this.files;
    if (siblings.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: `An item named "${cleanName}" already exists in this folder.` };
    }

    const newNode: FileNode = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      path: newPath,
      type,
      content: type === 'file' ? initialContent : undefined,
      children: type === 'folder' ? [] : undefined,
      isOpen: type === 'folder' ? true : undefined,
      isDirty: false
    };

    if (!parentNode) {
      this.files = [...this.files, newNode];
    } else {
      this.files = this.updateNode(this.files, parentNode.id, (p) => ({
        ...p,
        isOpen: true,
        children: [...(p.children || []), newNode]
      }));
    }

    this.persistFilesToStorage();
    return { success: true, node: newNode };
  }

  public rename(
    pathOrId: string,
    newName: string
  ): { success: boolean; node?: FileNode; error?: string } {
    const cleanName = newName.trim();
    if (!cleanName) {
      return { success: false, error: 'Name cannot be empty' };
    }
    if (cleanName.includes('/') || cleanName.includes('\\')) {
      return { success: false, error: 'Name cannot contain slashes' };
    }

    const targetNode = this.findNode(pathOrId);
    if (!targetNode) {
      return { success: false, error: 'Item not found' };
    }

    if (targetNode.name === cleanName) {
      return { success: true, node: targetNode };
    }

    // Determine parent path and verify siblings
    const parts = targetNode.path.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    const newPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    // Check sibling duplicate
    const parentNode = parentPath ? this.findNodeByPath(parentPath) : null;
    const siblings = parentNode ? (parentNode.children || []) : this.files;
    if (siblings.some((s) => s.id !== targetNode.id && s.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: `An item named "${cleanName}" already exists in this folder.` };
    }

    const oldPathPrefix = targetNode.path;

    // Update node and all its nested children paths
    function recursivelyUpdatePaths(list: FileNode[]): FileNode[] {
      return list.map((item) => {
        if (item.id === targetNode!.id) {
          const updatedChildren = item.children ? updateChildPaths(item.children, oldPathPrefix, newPath) : undefined;
          return {
            ...item,
            name: cleanName,
            path: newPath,
            children: updatedChildren
          };
        }
        if (item.children) {
          return { ...item, children: recursivelyUpdatePaths(item.children) };
        }
        return item;
      });
    }

    function updateChildPaths(children: FileNode[], oldP: string, newP: string): FileNode[] {
      return children.map((c) => {
        const cPath = c.path.replace(new RegExp(`^${oldP}`), newP);
        return {
          ...c,
          path: cPath,
          children: c.children ? updateChildPaths(c.children, oldP, newP) : undefined
        };
      });
    }

    this.files = recursivelyUpdatePaths(this.files);
    this.persistFilesToStorage();
    return { success: true, node: this.findNode(targetNode.id)! };
  }

  public delete(pathOrId: string): { success: boolean; deletedIds: string[]; error?: string } {
    const targetNode = this.findNode(pathOrId);
    if (!targetNode) {
      return { success: false, deletedIds: [], error: 'Item not found' };
    }

    const deletedIds: string[] = [];
    function collectIds(n: FileNode) {
      deletedIds.push(n.id);
      if (n.children) {
        n.children.forEach(collectIds);
      }
    }
    collectIds(targetNode);

    function removeRecursive(list: FileNode[]): FileNode[] {
      return list
        .filter((n) => n.id !== targetNode!.id)
        .map((n) => (n.children ? { ...n, children: removeRecursive(n.children) } : n));
    }

    this.files = removeRecursive(this.files);
    this.persistFilesToStorage();
    return { success: true, deletedIds };
  }

  public duplicate(pathOrId: string): { success: boolean; newNode?: FileNode; error?: string } {
    const targetNode = this.findNode(pathOrId);
    if (!targetNode) {
      return { success: false, error: 'Item not found' };
    }

    // Determine new name
    const extMatch = targetNode.name.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0] : '';
    const baseName = ext ? targetNode.name.slice(0, -ext.length) : targetNode.name;
    const cleanBase = baseName.replace(/ copy(\s\d+)?$/, '');

    let counter = 1;
    let candidateName = `${cleanBase} copy${ext}`;
    const parts = targetNode.path.split('/');
    parts.pop();
    const parentPath = parts.length > 0 ? parts.join('/') : null;

    const parentNode = parentPath ? this.findNodeByPath(parentPath) : null;
    const siblings = parentNode ? (parentNode.children || []) : this.files;

    while (siblings.some((s) => s.name.toLowerCase() === candidateName.toLowerCase())) {
      counter++;
      candidateName = `${cleanBase} copy ${counter}${ext}`;
    }

    return this.copyNodeToParent(targetNode, parentPath, candidateName);
  }

  // --- Core Operations: move, copy, cut, paste ---

  public move(
    sourcePathOrId: string,
    targetParentPathOrId: string | null
  ): { success: boolean; error?: string } {
    const sourceNode = this.findNode(sourcePathOrId);
    if (!sourceNode) {
      return { success: false, error: 'Source item not found' };
    }

    let targetParentNode: FileNode | null = null;
    if (targetParentPathOrId) {
      targetParentNode = this.findNode(targetParentPathOrId);
      if (!targetParentNode || targetParentNode.type !== 'folder') {
        return { success: false, error: 'Target destination must be a folder' };
      }
    }

    // Validation: cannot move into self
    if (targetParentNode && targetParentNode.id === sourceNode.id) {
      return { success: false, error: 'Cannot move an item into itself' };
    }

    // Validation: cannot move a folder into one of its descendants
    if (sourceNode.type === 'folder' && targetParentNode) {
      if (this.isDescendant(sourceNode, targetParentNode.id)) {
        return { success: false, error: 'Cannot move a folder into one of its subfolders' };
      }
    }

    // Validation: already in this folder?
    const currentParentPath = sourceNode.path.includes('/')
      ? sourceNode.path.substring(0, sourceNode.path.lastIndexOf('/'))
      : null;
    const newParentPath = targetParentNode ? targetParentNode.path : null;

    if (currentParentPath === newParentPath) {
      return { success: true }; // Already there
    }

    // Check sibling name collision
    const targetSiblings = targetParentNode ? (targetParentNode.children || []) : this.files;
    if (targetSiblings.some((s) => s.name.toLowerCase() === sourceNode.name.toLowerCase())) {
      return {
        success: false,
        error: `An item named "${sourceNode.name}" already exists in destination folder.`
      };
    }

    // Remove source node from current position
    this.files = this.removeNodeById(this.files, sourceNode.id);

    // Update path and all child paths
    const updatedSource = this.recalculatePaths(sourceNode, newParentPath);

    // Insert into target parent
    if (!targetParentNode) {
      this.files = [...this.files, updatedSource];
    } else {
      this.files = this.updateNode(this.files, targetParentNode.id, (p) => ({
        ...p,
        isOpen: true,
        children: [...(p.children || []), updatedSource]
      }));
    }

    this.persistFilesToStorage();
    return { success: true };
  }

  public copy(
    sourcePathOrId: string,
    targetParentPathOrId: string | null
  ): { success: boolean; newNode?: FileNode; error?: string } {
    const sourceNode = this.findNode(sourcePathOrId);
    if (!sourceNode) {
      return { success: false, error: 'Source item not found' };
    }

    const targetParentNode = targetParentPathOrId ? this.findNode(targetParentPathOrId) : null;
    const targetParentPath = targetParentNode ? targetParentNode.path : null;

    // Determine target name
    const targetSiblings = targetParentNode ? (targetParentNode.children || []) : this.files;
    let targetName = sourceNode.name;

    if (targetSiblings.some((s) => s.name.toLowerCase() === targetName.toLowerCase())) {
      const extMatch = targetName.match(/\.[^.]+$/);
      const ext = extMatch ? extMatch[0] : '';
      const baseName = ext ? targetName.slice(0, -ext.length) : targetName;
      targetName = `${baseName} copy${ext}`;
      let counter = 1;
      while (targetSiblings.some((s) => s.name.toLowerCase() === targetName.toLowerCase())) {
        counter++;
        targetName = `${baseName} copy ${counter}${ext}`;
      }
    }

    return this.copyNodeToParent(sourceNode, targetParentPath, targetName);
  }

  public setClipboard(id: string, mode: 'copy' | 'cut'): void {
    const node = this.findNode(id);
    if (node) {
      this.clipboard = {
        id: node.id,
        name: node.name,
        path: node.path,
        mode
      };
    }
  }

  public getClipboard(): ClipboardItem | null {
    return this.clipboard;
  }

  public clearClipboard(): void {
    this.clipboard = null;
  }

  public paste(targetParentPathOrId: string | null): { success: boolean; error?: string } {
    if (!this.clipboard) {
      return { success: false, error: 'Clipboard is empty' };
    }

    const { id, mode } = this.clipboard;
    if (mode === 'cut') {
      const res = this.move(id, targetParentPathOrId);
      if (res.success) {
        this.clearClipboard();
      }
      return res;
    } else {
      const res = this.copy(id, targetParentPathOrId);
      return { success: res.success, error: res.error };
    }
  }

  // --- Folder Expand / Collapse Utilities ---

  public toggleFolder(folderId: string): FileNode[] {
    this.files = this.updateNode(this.files, folderId, (n) => ({
      ...n,
      isOpen: !n.isOpen
    }));
    this.persistFilesToStorage();
    return this.files;
  }

  public collapseAll(): FileNode[] {
    function collapseRecursive(list: FileNode[]): FileNode[] {
      return list.map((n) => {
        if (n.type === 'folder') {
          return {
            ...n,
            isOpen: false,
            children: n.children ? collapseRecursive(n.children) : []
          };
        }
        return n;
      });
    }
    this.files = collapseRecursive(this.files);
    this.persistFilesToStorage();
    return this.files;
  }

  public expandAll(): FileNode[] {
    function expandRecursive(list: FileNode[]): FileNode[] {
      return list.map((n) => {
        if (n.type === 'folder') {
          return {
            ...n,
            isOpen: true,
            children: n.children ? expandRecursive(n.children) : []
          };
        }
        return n;
      });
    }
    this.files = expandRecursive(this.files);
    this.persistFilesToStorage();
    return this.files;
  }

  // --- File System Access API Integration ---

  public isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  /**
   * Opens a real folder from the user's computer via File System Access API
   */
  public async openDirectoryFromDisk(): Promise<{ success: boolean; rootName?: string; error?: string }> {
    if (!this.isFileSystemAccessSupported()) {
      return { success: false, error: 'File System Access API is not supported in this browser.' };
    }

    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      this.directoryHandle = dirHandle;

      const loadedFiles: FileNode[] = [];
      await this.readDirectoryHandle(dirHandle, '', loadedFiles);

      this.files = loadedFiles;
      this.persistFilesToStorage();
      this.saveMeta({ activeWorkspaceName: dirHandle.name });
      return { success: true, rootName: dirHandle.name };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'Folder selection cancelled.' };
      }
      return { success: false, error: err.message || 'Failed to read directory from disk.' };
    }
  }

  private async readDirectoryHandle(
    handle: any,
    parentPath: string,
    destination: FileNode[]
  ): Promise<void> {
    // Ignore heavy common directories
    const IGNORED = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.cache']);

    for await (const entry of handle.values()) {
      if (IGNORED.has(entry.name)) continue;

      const currentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      const id = `fs-${entry.kind}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      if (entry.kind === 'directory') {
        const folderNode: FileNode = {
          id,
          name: entry.name,
          path: currentPath,
          type: 'folder',
          isOpen: parentPath === '', // expand top-level
          children: []
        };
        await this.readDirectoryHandle(entry, currentPath, folderNode.children!);
        destination.push(folderNode);
      } else if (entry.kind === 'file') {
        try {
          const file = await entry.getFile();
          // Only read text for files < 2MB
          let content = '';
          if (file.size < 2 * 1024 * 1024) {
            content = await file.text();
          } else {
            content = '// [Binary or large file omitted from in-browser preview]';
          }

          destination.push({
            id,
            name: entry.name,
            path: currentPath,
            type: 'file',
            content,
            isDirty: false
          });
        } catch (e) {
          console.warn(`Could not read file ${entry.name}:`, e);
        }
      }
    }
  }

  // --- Helper Query & Mutation Functions ---

  public findNode(pathOrId: string): FileNode | null {
    return this.findNodeRecursive(this.files, pathOrId);
  }

  public findNodeByPath(path: string): FileNode | null {
    function find(list: FileNode[]): FileNode | null {
      for (const item of list) {
        if (item.path === path) return item;
        if (item.children) {
          const found = find(item.children);
          if (found) return found;
        }
      }
      return null;
    }
    return find(this.files);
  }

  public getBreadcrumbs(pathOrId: string): { name: string; path: string; isFolder: boolean }[] {
    const node = this.findNode(pathOrId);
    if (!node) return [];

    const segments = node.path.split('/');
    const result: { name: string; path: string; isFolder: boolean }[] = [];

    let current = '';
    for (let i = 0; i < segments.length; i++) {
      current = current ? `${current}/${segments[i]}` : segments[i];
      const isLast = i === segments.length - 1;
      result.push({
        name: segments[i],
        path: current,
        isFolder: isLast ? node.type === 'folder' : true
      });
    }

    return result;
  }

  private findNodeRecursive(list: FileNode[], query: string): FileNode | null {
    for (const item of list) {
      if (item.id === query || item.path === query) return item;
      if (item.children) {
        const found = this.findNodeRecursive(item.children, query);
        if (found) return found;
      }
    }
    return null;
  }

  private isDescendant(parent: FileNode, childId: string): boolean {
    if (!parent.children) return false;
    for (const child of parent.children) {
      if (child.id === childId) return true;
      if (child.type === 'folder' && this.isDescendant(child, childId)) return true;
    }
    return false;
  }

  private updateNode(
    list: FileNode[],
    id: string,
    updater: (node: FileNode) => FileNode
  ): FileNode[] {
    return list.map((item) => {
      if (item.id === id) {
        return updater(item);
      }
      if (item.children) {
        return { ...item, children: this.updateNode(item.children, id, updater) };
      }
      return item;
    });
  }

  private removeNodeById(list: FileNode[], id: string): FileNode[] {
    return list
      .filter((n) => n.id !== id)
      .map((n) => (n.children ? { ...n, children: this.removeNodeById(n.children, id) } : n));
  }

  private recalculatePaths(node: FileNode, newParentPath: string | null): FileNode {
    const updatedPath = newParentPath ? `${newParentPath}/${node.name}` : node.name;
    return {
      ...node,
      path: updatedPath,
      children: node.children
        ? node.children.map((c) => this.recalculatePaths(c, updatedPath))
        : undefined
    };
  }

  private copyNodeToParent(
    source: FileNode,
    targetParentPath: string | null,
    newName: string
  ): { success: boolean; newNode?: FileNode; error?: string } {
    const newPath = targetParentPath ? `${targetParentPath}/${newName}` : newName;

    function deepCloneWithNewIds(orig: FileNode, curPath: string): FileNode {
      const newId = `${orig.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return {
        ...orig,
        id: newId,
        name: orig.name,
        path: curPath,
        isDirty: false,
        children: orig.children
          ? orig.children.map((c) => deepCloneWithNewIds(c, `${curPath}/${c.name}`))
          : undefined
      };
    }

    const clonedNode: FileNode = {
      ...deepCloneWithNewIds(source, newPath),
      name: newName
    };

    if (!targetParentPath) {
      this.files = [...this.files, clonedNode];
    } else {
      const parentNode = this.findNodeByPath(targetParentPath);
      if (parentNode) {
        this.files = this.updateNode(this.files, parentNode.id, (p) => ({
          ...p,
          isOpen: true,
          children: [...(p.children || []), clonedNode]
        }));
      } else {
        this.files = [...this.files, clonedNode];
      }
    }

    this.persistFilesToStorage();
    return { success: true, newNode: clonedNode };
  }
}

export const filesystemService = new FilesystemService();
