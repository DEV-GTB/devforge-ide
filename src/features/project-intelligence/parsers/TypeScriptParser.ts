// TypeScript Parser - AST-based parser for TypeScript/TSX
import { Parser, ParseResult, ParsedSymbol, ParsedImport, ParsedExport, ParseError, ASTNode } from './ParserRegistry';

export class TypeScriptParser implements Parser {
  language = 'typescript';
  extensions = ['.ts', '.tsx'];

  async parse(content: string, filePath: string): Promise<ParseResult> {
    const symbols: ParsedSymbol[] = [];
    const imports: ParsedImport[] = [];
    const exports: ParsedExport[] = [];
    const errors: ParseError[] = [];

    const lines = content.split('\n');

    // For MVP, use regex-based parsing (in production, use @typescript-eslint/typescript-estree)
    this.extractFunctions(content, lines, symbols, exports);
    this.extractClasses(content, lines, symbols, exports);
    this.extractInterfaces(content, lines, symbols, exports);
    this.extractTypes(content, lines, symbols, exports);
    this.extractImports(content, lines, imports);
    this.extractVariables(content, lines, symbols, exports);

    return {
      ast: this.buildAST(symbols, imports, exports),
      symbols,
      imports,
      exports,
      errors,
    };
  }

  canParse(filePath: string): boolean {
    return this.extensions.some(ext => filePath.endsWith(ext));
  }

  private extractFunctions(content: string, lines: string[], symbols: ParsedSymbol[], exports: ParsedExport[]): void {
    // Function declarations
    const funcRegex = /(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      const [fullMatch, name, params, returnType] = match;
      const line = content.substring(0, match.index).split('\n').length;
      const isExported = fullMatch.includes('export');
      const isAsync = fullMatch.includes('async');

      symbols.push({
        name,
        type: 'function',
        start: match.index,
        end: match.index + fullMatch.length,
        line,
        column: match.index - content.lastIndexOf('\n', match.index - 1) - 1,
        signature: fullMatch,
        parameters: params ? params.split(',').map(p => p.trim()).filter(p => p) : [],
        returnType: returnType?.trim(),
        isExported,
        isAsync,
        isStatic: false,
      });

      if (isExported) {
        exports.push({
          name,
          type: 'function',
          isDefault: fullMatch.includes('default'),
          start: match.index,
          end: match.index + fullMatch.length,
          line,
        });
      }
    }

    // Arrow functions
    const arrowRegex = /(?:export\s+(?:const|let|var)\s+)?(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*[^=]+)?\s*=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      const [fullMatch, name, params] = match;
      const line = content.substring(0, match.index).split('\n').length;
      const isExported = fullMatch.includes('export');
      const isAsync = fullMatch.includes('async');

      symbols.push({
        name,
        type: 'function',
        start: match.index,
        end: match.index + fullMatch.length,
        line,
        column: match.index - content.lastIndexOf('\n', match.index - 1) - 1,
        signature: fullMatch,
        parameters: params ? params.split(',').map(p => p.trim()).filter(p => p) : [],
        isExported,
        isAsync,
        isStatic: false,
      });

      if (isExported) {
        exports.push({
          name,
          type: 'function',
          isDefault: true,
          start: match.index,
          end: match.index + fullMatch.length,
          line,
        });
      }
    }
  }

  private extractClasses(content: string, lines: string[], symbols: ParsedSymbol[], exports: ParsedExport[]): void {
    const classRegex = /(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+(\w+)(?:\s*<[^>]+>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const [fullMatch, name, extendsClass, implementsClause] = match;
      const line = content.substring(0, match.index).split('\n').length;
      const isExported = fullMatch.includes('export');

      symbols.push({
        name,
        type: 'class',
        start: match.index,
        end: match.index + fullMatch.length,
        line,
        column: match.index - content.lastIndexOf('\n', match.index - 1) - 1,
        signature: fullMatch,
        extends: extendsClass,
        implements: implementsClause ? implementsClause.split(',').map(i => i.trim()) : [],
        isExported,
        isAsync: false,
        isStatic: false,
      });

      if (isExported) {
        exports.push({
          name,
          type: 'class',
          isDefault: fullMatch.includes('default'),
          start: match.index,
          end: match.index + fullMatch.length,
          line,
        });
      }
    }
  }

  private extractInterfaces(content: string, lines: string[], symbols: ParsedSymbol[], exports: ParsedExport[]): void {
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s*<[^>]+>)?(?:\s+extends\s+([^{]+))?/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const [fullMatch, name, extendsClause] = match;
      const line = content.substring(0, match.index).split('\n').length;
      const isExported = fullMatch.includes('export');

      symbols.push({
        name,
        type: 'interface',
        start: match.index,
        end: match.index + fullMatch.length,
        line,
        column: match.index - content.lastIndexOf('\n', match.index - 1) - 1,
        signature: fullMatch,
        extends: extendsClause,
        isExported,
        isAsync: false,
        isStatic: false,
      });

      if (isExported) {
        exports.push({
          name,
          type: 'interface',
          isDefault: false,
          start: match.index,
          end: match.index + fullMatch.length,
          line,
        });
      }
    }
  }

  private extractTypes(content: string, lines: string[], symbols: ParsedSymbol[], exports: ParsedExport[]): void {
    const typeRegex = /(?:export\s+)?(?:type|interface)\s+(\w+)/g;
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      const [fullMatch, name] = match;
      const line = content.substring(0, match.index).split('\n').length;
      const isExported = fullMatch.includes('export');

      symbols.push({
        name,
        type: 'interface',
        start: match.index,
        end: match.index + fullMatch.length,
        line,
        column: match.index - content.lastIndexOf('\n', match.index - 1) - 1,
        signature: fullMatch,
        isExported,
        isAsync: false,
        isStatic: false,
      });

      if (isExported) {
        exports.push({
          name,
          type: 'type',
          isDefault: false,
          start: match.index,
          end: match.index + fullMatch.length,
          line,
        });
      }
    }
  }

  private extractImports(content: string, lines: string[], imports: ParsedImport[]): void {
    // ES6 imports
    const importRegex = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]+)\}\s*,?\s*)?(\w+)?\s*(?:,\s*\{([^}]+)\})?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const [fullMatch, defaultImport, namedImports1, namespaceImport, namedImports2, module] = match;
      const line = content.substring(0, match.index).split('\n').length;
      const names: string[] = [];

      if (defaultImport) names.push(defaultImport);
      if (namedImports1) names.push(...namedImports1.split(',').map(n => n.trim()));
      if (namespaceImport) names.push(namespaceImport);
      if (namedImports2) names.push(...namedImports2.split(',').map(n => n.trim()));

      imports.push({
        module,
        names,
        isDefault: !!defaultImport,
        isType: fullMatch.includes('type'),
        start: match.index,
        end: match.index + fullMatch.length,
        line,
      });
    }

    // Type-only imports
    const typeImportRegex = /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = typeImportRegex.exec(content)) !== null) {
      const [fullMatch, namedImports, module] = match;
      const line = content.substring(0, match.index).split('\n').length;

      imports.push({
        module,
        names: namedImports.split(',').map(n => n.trim()),
        isDefault: false,
        isType: true,
        start: match.index,
        end: match.index + fullMatch.length,
        line,
      });
    }
  }

  private extractVariables(content: string, lines: string[], symbols: ParsedSymbol[], exports: ParsedExport[]): void {
    const varRegex = /(?:export\s+(?:const|let|var)\s+)(\w+)\s*(?::\s*[^=]+)?\s*=/g;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      const [fullMatch, name] = match;
      const line = content.substring(0, match.index).split('\n').length;
      const isExported = fullMatch.includes('export');

      symbols.push({
        name,
        type: 'variable',
        start: match.index,
        end: match.index + fullMatch.length,
        line,
        column: match.index - content.lastIndexOf('\n', match.index - 1) - 1,
        isExported,
        isAsync: false,
        isStatic: false,
      });

      if (isExported) {
        exports.push({
          name,
          type: 'variable',
          isDefault: false,
          start: match.index,
          end: match.index + fullMatch.length,
          line,
        });
      }
    }
  }

  private buildAST(symbols: ParsedSymbol[], imports: ParsedImport[], exports: ParsedExport[]): ASTNode {
    return {
      type: 'Program',
      start: 0,
      end: 0,
      children: [
        {
          type: 'ImportDeclarations',
          start: 0,
          end: 0,
          children: imports.map(imp => ({
            type: 'ImportDeclaration',
            name: imp.module,
            start: imp.start,
            end: imp.end,
          })),
        },
        {
          type: 'Exports',
          start: 0,
          end: 0,
          children: exports.map(exp => ({
            type: 'ExportDeclaration',
            name: exp.name,
            start: exp.start,
            end: exp.end,
          })),
        },
        {
          type: 'Symbols',
          start: 0,
          end: 0,
          children: symbols.map(sym => ({
            type: sym.type,
            name: sym.name,
            start: sym.start,
            end: sym.end,
          })),
        },
      ],
    };
  }
}
