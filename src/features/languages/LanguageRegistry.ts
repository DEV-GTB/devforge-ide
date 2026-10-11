// Language Registry - Manages language support
export interface LanguageDefinition {
  id: string;
  name: string;
  extensions: string[];
  languageServer?: string;
  formatter?: string;
  testRunner?: string;
  buildCommand?: string;
  icon?: string;
}

export class LanguageRegistry {
  private languages: Map<string, LanguageDefinition> = new Map();

  constructor() {
    this.registerDefaultLanguages();
  }

  private registerDefaultLanguages(): void {
    const languages: LanguageDefinition[] = [
      {
        id: 'typescript',
        name: 'TypeScript',
        extensions: ['.ts', '.tsx'],
        languageServer: 'typescript-language-server',
        formatter: 'prettier',
        testRunner: 'vitest',
        buildCommand: 'tsc',
        icon: '📘',
      },
      {
        id: 'javascript',
        name: 'JavaScript',
        extensions: ['.js', '.jsx'],
        languageServer: 'typescript-language-server',
        formatter: 'prettier',
        testRunner: 'vitest',
        buildCommand: 'webpack',
        icon: '📕',
      },
      {
        id: 'python',
        name: 'Python',
        extensions: ['.py'],
        languageServer: 'pyright',
        formatter: 'black',
        testRunner: 'pytest',
        buildCommand: 'python',
        icon: '🐍',
      },
      {
        id: 'cpp',
        name: 'C++',
        extensions: ['.cpp', '.cc', '.cxx'],
        languageServer: 'clangd',
        formatter: 'clang-format',
        testRunner: 'googletest',
        buildCommand: 'cmake',
        icon: '⚙️',
      },
      {
        id: 'c',
        name: 'C',
        extensions: ['.c', '.h'],
        languageServer: 'clangd',
        formatter: 'clang-format',
        testRunner: 'ctest',
        buildCommand: 'gcc',
        icon: '🔧',
      },
      {
        id: 'rust',
        name: 'Rust',
        extensions: ['.rs'],
        languageServer: 'rust-analyzer',
        formatter: 'rustfmt',
        testRunner: 'cargo test',
        buildCommand: 'cargo build',
        icon: '🦀',
      },
      {
        id: 'go',
        name: 'Go',
        extensions: ['.go'],
        languageServer: 'gopls',
        formatter: 'gofmt',
        testRunner: 'go test',
        buildCommand: 'go build',
        icon: '🐹',
      },
      {
        id: 'java',
        name: 'Java',
        extensions: ['.java'],
        languageServer: 'jdtls',
        formatter: 'google-java-format',
        testRunner: 'junit',
        buildCommand: 'mvn',
        icon: '☕',
      },
      {
        id: 'html',
        name: 'HTML',
        extensions: ['.html', '.htm'],
        formatter: 'prettier',
        icon: '🌐',
      },
      {
        id: 'css',
        name: 'CSS',
        extensions: ['.css', '.scss', '.sass'],
        formatter: 'prettier',
        icon: '🎨',
      },
      {
        id: 'json',
        name: 'JSON',
        extensions: ['.json'],
        formatter: 'prettier',
        icon: '📄',
      },
      {
        id: 'markdown',
        name: 'Markdown',
        extensions: ['.md', '.markdown'],
        formatter: 'prettier',
        icon: '📝',
      },
    ];

    languages.forEach(lang => this.languages.set(lang.id, lang));
  }

  getLanguage(id: string): LanguageDefinition | undefined {
    return this.languages.get(id);
  }

  getLanguageByExtension(extension: string): LanguageDefinition | undefined {
    return Array.from(this.languages.values()).find(lang =>
      lang.extensions.includes(extension)
    );
  }

  getAllLanguages(): LanguageDefinition[] {
    return Array.from(this.languages.values());
  }

  registerLanguage(language: LanguageDefinition): void {
    this.languages.set(language.id, language);
  }
}
