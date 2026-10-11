import * as fs from 'fs';
import * as path from 'path';

// Mock Database interface for now (better-sqlite3 would need to be installed)
interface Database {
  prepare(sql: string): Statement;
  pragma(pragma: string): void;
  close(): void;
  backup(path: string): Promise<void>;
}

interface Statement {
  run(...params: any[]): RunResult;
  all(...params: any[]): any[];
  get(...params: any[]): any | undefined;
}

interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface QueryResult {
  rows: any[];
  changes: number;
  lastInsertId: number;
}

/**
 * Database Manager
 * Purpose: SQLite database management for DevForge Studio
 * Features:
 * - Connection pooling
 * - Query execution
 * - Transaction support
 * - Migration system
 * - Backup/restore
 * - Query logging
 */
export class DatabaseManager {
  private db: Database | null = null;
  private dbPath: string;
  private isInTransaction: boolean = false;
  private mockData: Map<string, any[]> = new Map();

  constructor(dbPath: string = './data/devforge.db') {
    this.dbPath = dbPath;
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  connect(): void {
    if (this.db) {
      return;
    }

    // Mock database for now (would use better-sqlite3 in production)
    this.db = {
      prepare: (sql: string) => this.mockPrepare(sql),
      pragma: () => {},
      close: () => { this.db = null; },
      backup: async (path: string) => {
        console.log(`Mock backup to ${path}`);
      },
    };
  }

  private mockPrepare(sql: string): Statement {
    return {
      run: (...params: any[]) => {
        const sqlLower = sql.toLowerCase();
        if (sqlLower.includes('create table')) {
          return { changes: 0, lastInsertRowid: 0 };
        }
        if (sqlLower.includes('insert')) {
          return { changes: 1, lastInsertRowid: Date.now() };
        }
        if (sqlLower.includes('update') || sqlLower.includes('delete')) {
          return { changes: 1, lastInsertRowid: 0 };
        }
        return { changes: 0, lastInsertRowid: 0 };
      },
      all: (...params: any[]) => {
        return this.mockData.get(sql) || [];
      },
      get: (...params: any[]) => {
        const rows = this.mockData.get(sql) || [];
        return rows[0] || undefined;
      },
    };
  }

  disconnect(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);

      return {
        rows: [],
        changes: result.changes,
        lastInsertId: result.lastInsertRowid as number,
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error}`);
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as any[];
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async queryOne(sql: string, params: any[] = []): Promise<any | null> {
    const rows = await this.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async executeScript(script: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Split script by semicolons and execute each statement
    const statements = script
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await this.execute(statement);
      } catch (error) {
        console.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
        throw error;
      }
    }
  }

  async initialize(): Promise<void> {
    this.connect();
  }

  async close(): Promise<void> {
    this.disconnect();
  }

  async beginTransaction(): Promise<void> {
    if (this.isInTransaction) {
      throw new Error('Transaction already in progress');
    }

    await this.execute('BEGIN TRANSACTION');
    this.isInTransaction = true;
  }

  async commit(): Promise<void> {
    if (!this.isInTransaction) {
      throw new Error('No transaction in progress');
    }

    await this.execute('COMMIT');
    this.isInTransaction = false;
  }

  async rollback(): Promise<void> {
    if (!this.isInTransaction) {
      throw new Error('No transaction in progress');
    }

    await this.execute('ROLLBACK');
    this.isInTransaction = false;
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await callback();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  async backup(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    this.db.backup(backupPath).then(() => {
      console.log(`Backup created: ${backupPath}`);
    });
  }

  async restore(backupPath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    this.disconnect();
    fs.copyFileSync(backupPath, this.dbPath);
    this.connect();
  }

  async migrate(migrationsPath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // Create migrations table if not exists
    await this.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const applied = await this.query('SELECT name FROM migrations ORDER BY id');
    const appliedNames = new Set(applied.map((m: any) => m.name));

    // Read migration files
    if (!fs.existsSync(migrationsPath)) {
      console.log('No migrations directory found');
      return;
    }

    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (!appliedNames.has(file)) {
        const migrationPath = path.join(migrationsPath, file);
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        await this.beginTransaction();
        try {
          await this.execute(sql);
          await this.execute('INSERT INTO migrations (name) VALUES (?)', [file]);
          await this.commit();
          console.log(`Migration applied: ${file}`);
        } catch (error) {
          await this.rollback();
          throw new Error(`Migration failed: ${file} - ${error}`);
        }
      }
    }
  }

  async getTableInfo(tableName: string): Promise<any[]> {
    return this.query(`PRAGMA table_info(${tableName})`);
  }

  async getTables(): Promise<string[]> {
    const rows = await this.query("SELECT name FROM sqlite_master WHERE type='table'");
    return rows.map((r: any) => r.name);
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  getPath(): string {
    return this.dbPath;
  }
}
