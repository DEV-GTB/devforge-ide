import { FileNode } from '../core/filesystem';

export interface ProjectTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  tags: string[];
  files: FileNode[];
}

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
  branch: string;
  problemsCount: number;
}

export const RECENT_PROJECTS: RecentProject[] = [
  {
    id: 'proj-1',
    name: 'DevForge Interactive Workspace',
    path: '~/devforge-project',
    lastOpened: 'Just now',
    branch: 'main',
    problemsCount: 2
  },
  {
    id: 'proj-2',
    name: 'MRN Football Legends',
    path: '~/projects/football-legends',
    lastOpened: '18 min ago',
    branch: 'release/v2.1',
    problemsCount: 0
  },
  {
    id: 'proj-3',
    name: 'Nexus AI Platform',
    path: '~/projects/nexus-ai',
    lastOpened: '2 hours ago',
    branch: 'main',
    problemsCount: 1
  },
  {
    id: 'proj-4',
    name: 'SkyRift 3D WebGL Engine',
    path: '~/projects/skyrift-engine',
    lastOpened: 'Yesterday',
    branch: 'feat/shaders',
    problemsCount: 3
  }
];

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'template-vanilla-ts',
    name: 'Vanilla Vite + TypeScript',
    icon: '⚡',
    description: 'Ultra-fast minimal web application with live browser hot-reload.',
    tags: ['Vite', 'TypeScript', 'HTML5', 'CSS3'],
    files: [
      {
        id: 't-idx',
        name: 'index.html',
        path: 'index.html',
        type: 'file',
        content: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Vite TS App</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello Vite + TypeScript</h1>\n  <button id="btn">Click Counter</button>\n  <script src="main.ts"></script>\n</body>\n</html>`
      },
      {
        id: 't-ts',
        name: 'main.ts',
        path: 'main.ts',
        type: 'file',
        content: `let count = 0;\ndocument.getElementById('btn')?.addEventListener('click', () => {\n  count++;\n  alert('Count: ' + count);\n});`
      },
      {
        id: 't-css',
        name: 'style.css',
        path: 'style.css',
        type: 'file',
        content: `body { font-family: system-ui; background: #0f172a; color: #f8fafc; padding: 2rem; }`
      }
    ]
  },
  {
    id: 'template-react-ts',
    name: 'React 19 + Tailwind',
    icon: '⚛️',
    description: 'Modern component-driven UI with Tailwind utility styles and state hooks.',
    tags: ['React 19', 'TypeScript', 'Tailwind'],
    files: [
      {
        id: 'r-app',
        name: 'App.tsx',
        path: 'src/App.tsx',
        type: 'file',
        content: `import React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="p-8 text-white">\n      <h1 className="text-3xl font-bold">React 19 Workspace</h1>\n      <button onClick={() => setCount(c => c + 1)} className="mt-4 px-4 py-2 bg-blue-600 rounded">Clicks: {count}</button>\n    </div>\n  );\n}`
      }
    ]
  },
  {
    id: 'template-python-api',
    name: 'Python FastAPI Microservice',
    icon: '🐍',
    description: 'High-performance asynchronous REST API with automatic Swagger OpenAPI documentation.',
    tags: ['Python 3.11', 'FastAPI', 'Uvicorn'],
    files: [
      {
        id: 'py-main',
        name: 'main.py',
        path: 'main.py',
        type: 'file',
        content: `from fastapi import FastAPI\n\napp = FastAPI(title="DevForge API")\n\n@app.get("/")\ndef read_root():\n    return {"status": "ok", "service": "DevForge Python Runtime"}`
      }
    ]
  }
];
