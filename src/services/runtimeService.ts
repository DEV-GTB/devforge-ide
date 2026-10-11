export interface DetectedRuntime {
  id: string;
  name: string;
  status: 'installed' | 'detected' | 'not_installed';
  version: string;
  path: string;
  category: 'Web' | 'Systems' | 'Backend' | 'Compiler';
}

export const DETECTED_RUNTIMES: DetectedRuntime[] = [
  {
    id: 'node',
    name: 'Node.js',
    status: 'installed',
    version: 'v20.12.0 LTS',
    path: '/usr/local/bin/node',
    category: 'Web'
  },
  {
    id: 'typescript',
    name: 'TypeScript Compiler (tsc)',
    status: 'installed',
    version: '5.4.2',
    path: '/usr/local/lib/node_modules/typescript/bin/tsc',
    category: 'Web'
  },
  {
    id: 'vite',
    name: 'Vite Dev Server',
    status: 'installed',
    version: '5.2.0',
    path: '/node_modules/.bin/vite',
    category: 'Web'
  },
  {
    id: 'python',
    name: 'Python 3',
    status: 'detected',
    version: '3.11.8',
    path: '/usr/bin/python3',
    category: 'Backend'
  },
  {
    id: 'clang',
    name: 'Clang / LLVM C++',
    status: 'detected',
    version: '17.0.6',
    path: '/usr/bin/clang++',
    category: 'Compiler'
  },
  {
    id: 'rustc',
    name: 'Rust Toolchain (rustc)',
    status: 'detected',
    version: '1.77.1',
    path: '~/.cargo/bin/rustc',
    category: 'Systems'
  },
  {
    id: 'openjdk',
    name: 'Java Development Kit (JDK)',
    status: 'not_installed',
    version: 'Not detected',
    path: 'N/A',
    category: 'Backend'
  },
  {
    id: 'golang',
    name: 'Go Compiler (go)',
    status: 'not_installed',
    version: 'Not detected',
    path: 'N/A',
    category: 'Backend'
  }
];
