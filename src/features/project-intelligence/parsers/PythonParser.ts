// Python Parser - AST-based parser for Python
import { Parser, ParseResult, ParsedSymbol, ParsedImport, ParsedExport, ParseError, ASTNode } from './ParserRegistry';

export class PythonParser implements Parser {
  language = 'python';
  extensions = ['.py'];

  async parse(content: string, filePath: string): Promise<ParseResult> {
    const symbols: ParsedSymbol[] = [];
    const imports: ParsedImport[] = [];
    const exports: ParsedExport[] = [];
    const errors: ParseError[] = [];

    const lines = content.split('\n');

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
    // Function definitions
    const funcRegex = /(?:@[\w.]+\s+)*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?/g;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      const [fullMatch, name, params, returnType] = match;
      const line = content.substring(0, match.index).split('\n').length;
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
        isExported: true, // Python functions are generally exportable
        isAsync,
        isStatic: false,
      });

      exports.push({
        name,
        type: 'function',
        isDefault: false,
        start: match.index,
        end: match.index + fullMatch.length,
        line,
      });
    }
  }

  private extractClasses(content: string, lines: string[], symbols: ParsedSymbol[], exports: ParsedExport[]): void {
    const classRegex = /class\s+(\w+)(?:\s*\(([^)]+)\))?/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const [fullMatch, name, inheritance] = match;
      const line = content.substring(0, match.index).split('\n').length;

      symbols.push({
        name,
        type: 'class',
        start: match.index,
        end: match.index + fullMatch.length,
        line,
        column: match.index - content.lastIndexOf('\n', match.index - 1) - 1,
        signature: fullMatch,
        extends: inheritance,
        isExported: true,
        isAsync: false,
        isStatic: false,
      });

      exports.push({
        name,
        type: 'class',
        isDefault: false,
        start: match.index,
        end: match.index + fullMatch.length,
        line,
      });
    }
  }

  private extractImports(content: string, lines: string[], imports: ParsedImport[]): void {
    // Regular imports
    const importRegex = /import\s+([^\n]+)/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const [fullMatch, moduleSpec] = match;
      const line = content.substring(0, match.index).split('\n').length;

      // Handle "import x, y, z" and "import x as y"
      const modules = moduleSpec.split(',').map(m => m.trim());
      const names: string[] = [];

      modules.forEach(mod => {
        const parts = mod.split(' as ');
        names.push(parts[0]);
      });

      imports.push({
        module: modules[0].split(' as ')[0],
        names,
        isDefault: true,
        isType: false,
        start: match.index,
        end: match.index + fullMatch.length,
        line,
      });
    }

    // From imports
    const fromRegex = /from\s+([\w.]+)\s+import\s+([^\n]+)/g;
    while ((match = fromRegex.exec(content)) !== null) {
      const [fullMatch, module, importSpec] = match;
      const line = content.substring(0, match.index).split('\n').length;

      // Handle "from x import y, z" and "from x import y as z"
      const imports_list = importSpec.split(',').map(i => i.trim());
      const names: string[] = [];

      imports_list.forEach(imp => {
        const parts = imp.split(' as ');
        names.push(parts[0]);
      });

      imports.push({
        module,
        names,
        isDefault: false,
        isType: false,
        start: match.index,
        end: match.index + fullMatch.length,
        line,
      });
    }
  }

  private extractVariables(content: string, lines: string[], symbols: ParsedSymbol[], exports: ParsedExport[]): void {
    // Module-level variables (not in functions or classes)
    const varRegex = /^(\w+)\s*=/gm;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      const [fullMatch, name] = match;
      const line = content.substring(0, match.index).split('\n').length;

      // Skip if inside a function or class (check indentation)
      const lineContent = lines[line - 1];
      if (lineContent && lineContent.startsWith('    ') || lineContent?.startsWith('\t')) {
        continue; // Inside a block
      }

      symbols.push({
        name,
        type: 'variable',
        start: match.index,
        end: match.index + fullMatch.length,
        line,
        column: match.index - content.lastIndexOf('\n', match.index - 1) - 1,
        isExported: true,
        isAsync: false,
        isStatic: false,
      });

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

  private buildAST(symbols: ParsedSymbol[], imports: ParsedImport[], exports: ParsedExport[]): ASTNode {
    return {
      type: 'Module',
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
