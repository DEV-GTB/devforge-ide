export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
  isDirty?: boolean;
}

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'cpp':
    case 'cc':
    case 'c':
    case 'h':
      return 'cpp';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export function getFileIconColor(filename: string): { color: string; label: string } {
  const lang = detectLanguage(filename);
  switch (lang) {
    case 'typescript':
      return { color: '#3178c6', label: 'TS' };
    case 'javascript':
      return { color: '#f7df1e', label: 'JS' };
    case 'html':
      return { color: '#e34f26', label: '<>' };
    case 'css':
      return { color: '#264de4', label: '#' };
    case 'json':
      return { color: '#f59e0b', label: '{}' };
    case 'markdown':
      return { color: '#38bdf8', label: 'M↓' };
    case 'python':
      return { color: '#3776ab', label: 'PY' };
    case 'rust':
      return { color: '#dea584', label: 'RS' };
    case 'go':
      return { color: '#00add8', label: 'GO' };
    case 'cpp':
      return { color: '#00599c', label: 'C++' };
    default:
      return { color: '#94a3b8', label: '•' };
  }
}

export function createDefaultProjectFiles(): FileNode[] {
  return [
    {
      id: 'src-folder',
      name: 'src',
      path: 'src',
      type: 'folder',
      isOpen: true,
      children: [
        {
          id: 'components-folder',
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
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="workspace-header">
      <div className="status-dot active" />
      <h1 className="title">{title}</h1>
    </header>
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
        Edit files in Monaco Editor to observe live reactive hot reloads.
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
        Status: <span>Online &amp; Compiled</span>
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
          isDirty: true,
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
  max-width: 460px;
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
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.count-display {
  font-family: monospace;
  font-size: 1.25rem;
  font-weight: 700;
  min-width: 32px;
}

.status-footer {
  font-size: 0.75rem;
  color: #71717a;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.status-footer span {
  color: #3b82f6;
  font-weight: 600;
}
`
        }
      ]
    },
    {
      id: 'public-folder',
      name: 'public',
      path: 'public',
      type: 'folder',
      isOpen: false,
      children: [
        {
          id: 'file-logo-svg',
          name: 'logo.svg',
          path: 'public/logo.svg',
          type: 'file',
          content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`
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
  <title>DevForge Project Live Preview</title>
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
      content: `# DevForge Project Workspace

Professional browser development environment for high-velocity coding.

## Project Structure
- \`src/App.tsx\` - Main application component
- \`src/main.tsx\` - React application entry point
- \`src/components/Header.tsx\` - Reusable component
- \`src/style.css\` - Styling and CSS custom properties
- \`public/logo.svg\` - Static SVG asset
- \`index.html\` - HTML5 entry point

## Scripts
- \`npm run dev\` - Starts development runtime
- \`npm run build\` - Compiles production bundle
`
    }
  ];
}

export function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function flattenFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  function recurse(list: FileNode[]) {
    for (const node of list) {
      if (node.type === 'file') {
        result.push(node);
      }
      if (node.children) {
        recurse(node.children);
      }
    }
  }
  recurse(nodes);
  return result;
}

export function updateFileContent(nodes: FileNode[], fileId: string, content: string): FileNode[] {
  return nodes.map((node) => {
    if (node.id === fileId) {
      return { ...node, content, isDirty: true };
    }
    if (node.children) {
      return { ...node, children: updateFileContent(node.children, fileId, content) };
    }
    return node;
  });
}

export function markFileSaved(nodes: FileNode[], fileId: string): FileNode[] {
  return nodes.map((node) => {
    if (node.id === fileId) {
      return { ...node, isDirty: false };
    }
    if (node.children) {
      return { ...node, children: markFileSaved(node.children, fileId) };
    }
    return node;
  });
}

const STARTER_FILE_IDS = new Set([
  'file-header-tsx',
  'file-home-tsx',
  'file-app-tsx',
  'file-main-tsx',
  'file-style-css',
  'file-logo-svg',
  'file-index-html',
  'file-package-json',
  'file-readme-md'
]);

const STARTER_FOLDER_IDS = new Set([
  'src-folder',
  'components-folder',
  'public-folder',
  'folder-src',
  'folder-components',
  'folder-pages',
  'folder-public',
  'folder-assets'
]);

export function removeBundledStarterFiles(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((node) => {
    if (node.type === 'file' && STARTER_FILE_IDS.has(node.id)) return [];
    const children = node.children ? removeBundledStarterFiles(node.children) : undefined;
    if (node.type === 'folder' && STARTER_FOLDER_IDS.has(node.id) && !children?.length) return [];
    return [{ ...node, children }];
  });
}

export function createFileNode(
  nodes: FileNode[],
  parentPath: string | null,
  fileName: string,
  content: string = ''
): FileNode[] {
  const cleanName = fileName.trim();
  const newPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;
  const newNode: FileNode = {
    id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: cleanName,
    path: newPath,
    type: 'file',
    content,
    isDirty: false
  };

  if (!parentPath) {
    return [...nodes, newNode];
  }

  function insertInParent(list: FileNode[]): FileNode[] {
    return list.map((node) => {
      if (node.path === parentPath && node.type === 'folder') {
        return {
          ...node,
          isOpen: true,
          children: [...(node.children || []), newNode]
        };
      }
      if (node.children) {
        return { ...node, children: insertInParent(node.children) };
      }
      return node;
    });
  }

  return insertInParent(nodes);
}

export function createFolderNode(
  nodes: FileNode[],
  parentPath: string | null,
  folderName: string
): FileNode[] {
  const cleanName = folderName.trim();
  const newPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;
  const newFolder: FileNode = {
    id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: cleanName,
    path: newPath,
    type: 'folder',
    isOpen: true,
    children: []
  };

  if (!parentPath) {
    return [...nodes, newFolder];
  }

  function insertInParent(list: FileNode[]): FileNode[] {
    return list.map((node) => {
      if (node.path === parentPath && node.type === 'folder') {
        return {
          ...node,
          isOpen: true,
          children: [...(node.children || []), newFolder]
        };
      }
      if (node.children) {
        return { ...node, children: insertInParent(node.children) };
      }
      return node;
    });
  }

  return insertInParent(nodes);
}

export function renameNode(nodes: FileNode[], nodeId: string, newName: string): FileNode[] {
  function rename(list: FileNode[]): FileNode[] {
    return list.map((node) => {
      if (node.id === nodeId) {
        const parts = node.path.split('/');
        parts[parts.length - 1] = newName;
        const newPath = parts.join('/');
        return { ...node, name: newName, path: newPath };
      }
      if (node.children) {
        return { ...node, children: rename(node.children) };
      }
      return node;
    });
  }
  return rename(nodes);
}

export function deleteNode(nodes: FileNode[], nodeId: string): FileNode[] {
  function remove(list: FileNode[]): FileNode[] {
    return list
      .filter((n) => n.id !== nodeId)
      .map((n) => {
        if (n.children) {
          return { ...n, children: remove(n.children) };
        }
        return n;
      });
  }
  return remove(nodes);
}

export function toggleFolderOpen(nodes: FileNode[], folderId: string): FileNode[] {
  return nodes.map((n) => {
    if (n.id === folderId && n.type === 'folder') {
      return { ...n, isOpen: !n.isOpen };
    }
    if (n.children) {
      return { ...n, children: toggleFolderOpen(n.children, folderId) };
    }
    return n;
  });
}

export function searchInFiles(
  nodes: FileNode[],
  query: string
): { file: FileNode; line: number; text: string }[] {
  if (!query.trim()) return [];
  const files = flattenFiles(nodes);
  const results: { file: FileNode; line: number; text: string }[] = [];
  const lowerQuery = query.toLowerCase();

  for (const file of files) {
    if (!file.content) continue;
    const lines = file.content.split('\n');
    lines.forEach((lineText, idx) => {
      if (lineText.toLowerCase().includes(lowerQuery)) {
        results.push({
          file,
          line: idx + 1,
          text: lineText.trim()
        });
      }
    });
  }

  return results;
}
