export interface LanguageInfo {
  id: string;
  name: string;
  extensions: string[];
  version: string;
  runtimeInstalled: boolean;
  lspActive: boolean;
  formatter: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    id: 'typescript',
    name: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    version: '5.4.2',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'Prettier v3.2'
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs'],
    version: 'ES2024',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'Prettier v3.2'
  },
  {
    id: 'python',
    name: 'Python',
    extensions: ['.py', '.pyw'],
    version: '3.11.8',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'Black / Ruff'
  },
  {
    id: 'html',
    name: 'HTML',
    extensions: ['.html', '.htm'],
    version: 'HTML5',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'HTML Beautifier'
  },
  {
    id: 'css',
    name: 'CSS / SCSS',
    extensions: ['.css', '.scss'],
    version: 'CSS3',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'Prettier CSS'
  },
  {
    id: 'rust',
    name: 'Rust',
    extensions: ['.rs'],
    version: '1.77.1 (rustc)',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'rustfmt'
  },
  {
    id: 'go',
    name: 'Go',
    extensions: ['.go'],
    version: 'go1.22.1',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'gofmt'
  },
  {
    id: 'cpp',
    name: 'C / C++',
    extensions: ['.cpp', '.cc', '.c', '.h', '.hpp'],
    version: 'Clang 17.0',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'clang-format'
  },
  {
    id: 'java',
    name: 'Java',
    extensions: ['.java'],
    version: 'OpenJDK 21',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'google-java-format'
  },
  {
    id: 'json',
    name: 'JSON',
    extensions: ['.json'],
    version: 'Standard',
    runtimeInstalled: true,
    lspActive: true,
    formatter: 'JSON Formatter'
  }
];

export interface LanguageDefinition {
  id: string;
  name: string;
  monacoLang: string;
  extensions: string[];
}

export const LANGUAGE_REGISTRY: LanguageDefinition[] = [
  { id: 'html', name: 'HTML', monacoLang: 'html', extensions: ['.html', '.htm', '.xhtml'] },
  { id: 'css', name: 'CSS', monacoLang: 'css', extensions: ['.css', '.scss', '.sass', '.less'] },
  { id: 'javascript', name: 'JavaScript', monacoLang: 'javascript', extensions: ['.js', '.mjs', '.cjs'] },
  { id: 'typescript', name: 'TypeScript', monacoLang: 'typescript', extensions: ['.ts', '.mts', '.cts'] },
  { id: 'jsx', name: 'JavaScript React', monacoLang: 'javascript', extensions: ['.jsx'] },
  { id: 'tsx', name: 'TypeScript React', monacoLang: 'typescript', extensions: ['.tsx'] },
  { id: 'json', name: 'JSON', monacoLang: 'json', extensions: ['.json', '.jsonc', '.webmanifest'] },
  { id: 'markdown', name: 'Markdown', monacoLang: 'markdown', extensions: ['.md', '.markdown', '.mdown', '.mkdn'] },
  { id: 'python', name: 'Python', monacoLang: 'python', extensions: ['.py', '.pyw', '.ipynb'] },
  { id: 'java', name: 'Java', monacoLang: 'java', extensions: ['.java', '.class'] },
  { id: 'c', name: 'C', monacoLang: 'c', extensions: ['.c', '.h'] },
  { id: 'cpp', name: 'C++', monacoLang: 'cpp', extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hh', '.hxx'] },
  { id: 'csharp', name: 'C#', monacoLang: 'csharp', extensions: ['.cs'] },
  { id: 'rust', name: 'Rust', monacoLang: 'rust', extensions: ['.rs'] },
  { id: 'go', name: 'Go', monacoLang: 'go', extensions: ['.go'] },
  { id: 'php', name: 'PHP', monacoLang: 'php', extensions: ['.php', '.phtml', '.php4', '.php5'] },
  { id: 'sql', name: 'SQL', monacoLang: 'sql', extensions: ['.sql', '.mysql', '.pgsql'] },
  { id: 'xml', name: 'XML', monacoLang: 'xml', extensions: ['.xml', '.svg', '.xsd', '.plist'] },
  { id: 'yaml', name: 'YAML', monacoLang: 'yaml', extensions: ['.yaml', '.yml'] },
  { id: 'shell', name: 'Shell Script', monacoLang: 'shell', extensions: ['.sh', '.bash', '.zsh'] },
  { id: 'dockerfile', name: 'Dockerfile', monacoLang: 'dockerfile', extensions: ['.dockerfile', 'dockerfile'] },
  { id: 'graphql', name: 'GraphQL', monacoLang: 'graphql', extensions: ['.graphql', '.gql'] },
  { id: 'ini', name: 'Properties', monacoLang: 'ini', extensions: ['.ini', '.env', '.conf'] }
];

export function getLanguageForFile(filename: string): { name: string; monacoLang: string; id: string } {
  if (!filename) return { name: 'Plain Text', monacoLang: 'plaintext', id: 'plaintext' };
  const lowerName = filename.toLowerCase();
  
  // Exact name matches
  if (lowerName === 'dockerfile' || lowerName.endsWith('/dockerfile')) {
    return { name: 'Dockerfile', monacoLang: 'dockerfile', id: 'dockerfile' };
  }

  const dotIdx = lowerName.lastIndexOf('.');
  if (dotIdx === -1) {
    return { name: 'Plain Text', monacoLang: 'plaintext', id: 'plaintext' };
  }
  const ext = lowerName.slice(dotIdx);

  for (const lang of LANGUAGE_REGISTRY) {
    if (lang.extensions.includes(ext)) {
      return { name: lang.name, monacoLang: lang.monacoLang, id: lang.id };
    }
  }

  return { name: 'Plain Text', monacoLang: 'plaintext', id: 'plaintext' };
}

