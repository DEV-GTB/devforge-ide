// Parser Registry - Pluggable AST-based parsers for different languages
import { TypeScriptParser } from './TypeScriptParser';
import { JavaScriptParser } from './JavaScriptParser';
import { PythonParser } from './PythonParser';

export interface ASTNode {
  type: string;
  name?: string;
  start: number;
  end: number;
  children?: ASTNode[];
  properties?: Record<string, any>;
}

export interface ParseResult {
  ast: ASTNode | null;
  symbols: ParsedSymbol[];
  imports: ParsedImport[];
  exports: ParsedExport[];
  errors: ParseError[];
}

export interface ParsedSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'component' | 'method' | 'property';
  start: number;
  end: number;
  line: number;
  column: number;
  signature?: string;
  parameters?: string[];
  returnType?: string;
  extends?: string;
  implements?: string[];
  isExported: boolean;
  isAsync: boolean;
  isStatic: boolean;
  parent?: string;
}

export interface ParsedImport {
  module: string;
  names: string[];
  isDefault: boolean;
  isType: boolean;
  start: number;
  end: number;
  line: number;
}

export interface ParsedExport {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'type';
  isDefault: boolean;
  start: number;
  end: number;
  line: number;
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

export interface Parser {
  language: string;
  extensions: string[];
  parse(content: string, filePath: string): Promise<ParseResult>;
  canParse(filePath: string): boolean;
}

export class ParserRegistry {
  private parsers: Map<string, Parser> = new Map();

  constructor() {
    // Register built-in parsers
    this.register(new TypeScriptParser());
    this.register(new JavaScriptParser());
    this.register(new PythonParser());
  }

  register(parser: Parser): void {
    parser.extensions.forEach(ext => {
      this.parsers.set(ext, parser);
    });
  }

  unregister(extension: string): void {
    this.parsers.delete(extension);
  }

  getParser(filePath: string): Parser | undefined {
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ext ? this.parsers.get(ext) : undefined;
  }

  async parse(content: string, filePath: string): Promise<ParseResult> {
    const parser = this.getParser(filePath);

    if (!parser) {
      return {
        ast: null,
        symbols: [],
        imports: [],
        exports: [],
        errors: [{
          message: `No parser available for file: ${filePath}`,
          line: 0,
          column: 0,
          severity: 'warning',
        }],
      };
    }

    return parser.parse(content, filePath);
  }

  getSupportedLanguages(): string[] {
    const languages = new Set<string>();
    this.parsers.forEach(parser => languages.add(parser.language));
    return Array.from(languages);
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.parsers.keys());
  }
}
