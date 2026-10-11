// Symbol Indexer - Extracts symbols from code
export interface Symbol {
  id: string;
  fileId: string;
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'component';
  line: number;
  column: number;
  signature?: string;
}

export class SymbolIndexer {
  private symbols: Map<string, Symbol[]> = new Map();

  constructor(private projectId: string) {}

  async indexFile(path: string, content: string): Promise<Symbol[]> {
    const symbols: Symbol[] = [];

    // Simple regex-based extraction - in production use proper parsers
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Functions
      const funcMatch = line.match(/(?:function|const)\s+(\w+)/);
      if (funcMatch) {
        symbols.push({
          id: crypto.randomUUID(),
          fileId: path,
          name: funcMatch[1],
          type: 'function',
          line: index + 1,
          column: line.indexOf(funcMatch[1]),
        });
      }

      // Classes
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          id: crypto.randomUUID(),
          fileId: path,
          name: classMatch[1],
          type: 'class',
          line: index + 1,
          column: line.indexOf(classMatch[1]),
        });
      }

      // Interfaces
      const interfaceMatch = line.match(/interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push({
          id: crypto.randomUUID(),
          fileId: path,
          name: interfaceMatch[1],
          type: 'interface',
          line: index + 1,
          column: line.indexOf(interfaceMatch[1]),
        });
      }

      // React components
      const componentMatch = line.match(/(?:function|const)\s+(\w+).*=>.*React/);
      if (componentMatch) {
        symbols.push({
          id: crypto.randomUUID(),
          fileId: path,
          name: componentMatch[1],
          type: 'component',
          line: index + 1,
          column: line.indexOf(componentMatch[1]),
        });
      }
    });

    this.symbols.set(path, symbols);
    return symbols;
  }

  getSymbols(path: string): Symbol[] {
    return this.symbols.get(path) || [];
  }

  getAllSymbols(): Symbol[] {
    return Array.from(this.symbols.values()).flat();
  }

  findSymbol(name: string): Symbol[] {
    return this.getAllSymbols().filter(s => s.name === name);
  }
}
