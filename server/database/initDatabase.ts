// Database Initialization Script
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseManager } from './DatabaseManager';

export async function initializeDatabase(dbPath: string = './devforge.db'): Promise<void> {
  const dbManager = new DatabaseManager(dbPath);
  const schemaPath = path.join(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await dbManager.initialize();
    await dbManager.executeScript(schema);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  } finally {
    await dbManager.close();
  }
}

// Run initialization if called directly
if (require.main === module) {
  const dbPath = process.argv[2] || './devforge.db';
  initializeDatabase(dbPath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
