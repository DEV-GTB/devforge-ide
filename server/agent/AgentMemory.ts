export class AgentMemory {
  private memory: Map<string, any> = new Map();
  private history: Array<{ key: string; value: any; timestamp: Date }> = [];

  set(key: string, value: any): void {
    this.memory.set(key, value);
    this.history.push({ key, value, timestamp: new Date() });
  }

  get(key: string): any {
    return this.memory.get(key);
  }

  has(key: string): boolean {
    return this.memory.has(key);
  }

  delete(key: string): boolean {
    return this.memory.delete(key);
  }

  clear(): void {
    this.memory.clear();
    this.history = [];
  }

  getAll(): Record<string, any> {
    return Object.fromEntries(this.memory);
  }

  getHistory(): Array<{ key: string; value: any; timestamp: Date }> {
    return [...this.history];
  }

  search(query: string): Array<{ key: string; value: any }> {
    const results: Array<{ key: string; value: any }> = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, value] of this.memory.entries()) {
      if (key.toLowerCase().includes(lowerQuery)) {
        results.push({ key, value });
      }
    }

    return results;
  }
}
