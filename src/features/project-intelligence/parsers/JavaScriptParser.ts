// JavaScript Parser - AST-based parser for JavaScript/JSX
import { Parser, ParseResult, ParsedSymbol, ParsedImport, ParsedExport, ParseError, ASTNode } from './ParserRegistry';

export class JavaScriptParser implements Parser {
  language = 'javascript';
  extensions = ['.js', '.jsx', '.mjs'];

  async parse(content: string, filePath: string): Promise<ParseResult> {
    const symbols: ParsedSymbol[] = [];
    const imports: ParsedImport[] = [];
    const exports: ParsedExport[] = [];
    const errors: ParseError[] = [];

    const lines = content.split('\n');

    // Reuse TypeScript parsing logic for JS (they're compatible)
    this.extractFunctions(content, lines, symbols, exports);
    this.extractClasses(content, lines, symbols, exports);
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
    const funcRegex = /(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
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
          isDefault: fullMatch.includes('default'),
          start: match.index,
          end: match.index + fullMatch.length,
          line,
        });
      }
    }

    // Arrow functions
    const arrowRegex = /(?:export\s+(?:const|let|var)\s+)?(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;
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
    const classRegex = /(?:export\s+(?:default\s+)?)?(?:class\s+(\w+)(?:\s+extends\s+(\w+))?)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const [fullMatch, name, extendsClass] = match;
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

  private extractImports(content: string, lines: string[], imports: ParsedImport[]): void {
    // ES6 imports
    const importRegex = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]+)\}\s*,?\s*)?(\w+)?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const [fullMatch, defaultImport, namedImports, namespaceImport, module] = match;
      const line = content.substring(0, match.index).split('\n').length;
      const names: string[] = [];

      if (defaultImport) names.push(defaultImport);
      if (namedImports) names.push(...namedImports.split(',').map(n => n.trim()));
      if (namespaceImport) names.push(namespaceImport);

      imports.push({
        module,
        names,
        isDefault: !!defaultImport,
        isType: false,
        start: match.index,
        end: match.index + fullMatch.length,
        line,
      });
    }

    // CommonJS require
    const requireRegex = /(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const [fullMatch, name, module] = match;
      const line = content.substring(0, match.index).split('\n').length;

      imports.push({
        module,
        names: [name],
        isDefault: true,
        isType: false,
        start: match.index,
        end: match.index + fullMatch.length,
        line,
      });
    }
  }

  private extractVariables(content: string, lines: string[], symbols: ParsedSymbol[], exports: ParsedExport[]): void {
    const varRegex = /(?:export\s+(?:const|let|var)\s+)(\w+)\s*=/g;
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
