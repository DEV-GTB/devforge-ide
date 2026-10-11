/**
 * Local Storage Manager
 * Stores all data on user's device using IndexedDB
 * No cloud database - everything stays local
 */

export interface StorageItem {
  id: string;
  type: 'chat' | 'progress' | 'workspace' | 'agent' | 'file' | 'tool';
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode?: 'ask' | 'plan' | 'code';
  audioUrl?: string;
}

export interface ProgressStep {
  id: string;
  taskId: string;
  step: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: number;
  result?: any;
  error?: string;
}

export interface AgentRun {
  id: string;
  goal: string;
  mode: 'ask' | 'plan' | 'code';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  steps: ProgressStep[];
  result?: any;
  error?: string;
}

class LocalStorageManager {
  private db: IDBDatabase | null = null;
  private DB_NAME = 'DevForgeLocalDB';
  private DB_VERSION = 1;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores
        if (!db.objectStoreNames.contains('storage')) {
          const storageStore = db.createObjectStore('storage', { keyPath: 'id' });
          storageStore.createIndex('type', 'type', { unique: false });
          storageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', { keyPath: 'id' });
          progressStore.createIndex('taskId', 'taskId', { unique: false });
          progressStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('agents')) {
          const agentStore = db.createObjectStore('agents', { keyPath: 'id' });
          agentStore.createIndex('status', 'status', { unique: false });
          agentStore.createIndex('startTime', 'startTime', { unique: false });
        }

        if (!db.objectStoreNames.contains('workspaces')) {
          const workspaceStore = db.createObjectStore('workspaces', { keyPath: 'id' });
          workspaceStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Generic storage operations
  async store(item: StorageItem): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async retrieve(id: string): Promise<StorageItem | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async retrieveByType(type: string): Promise<StorageItem[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Chat operations
  async saveChatMessage(message: ChatMessage): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readwrite');
      const store = transaction.objectStore('chats');
      const request = store.put(message);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getChatHistory(limit: number = 100): Promise<ChatMessage[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');

      const results: ChatMessage[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearChatHistory(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readwrite');
      const store = transaction.objectStore('chats');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Progress tracking
  async saveProgressStep(step: ProgressStep): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      const request = store.put(step);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getProgressByTask(taskId: string): Promise<ProgressStep[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      const index = store.index('taskId');
      const request = index.getAll(taskId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clearProgress(taskId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      const index = store.index('taskId');
      const request = index.getAll(taskId);

      request.onsuccess = () => {
        const steps = request.result || [];
        const deleteTransaction = this.db!.transaction(['progress'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('progress');

        steps.forEach((step) => {
          deleteStore.delete(step.id);
        });

        deleteTransaction.oncomplete = () => resolve();
        deleteTransaction.onerror = () => reject(deleteTransaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Agent run tracking
  async saveAgentRun(run: AgentRun): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['agents'], 'readwrite');
      const store = transaction.objectStore('agents');
      const request = store.put(run);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAgentRun(id: string): Promise<AgentRun | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['agents'], 'readonly');
      const store = transaction.objectStore('agents');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAgentRuns(limit: number = 50): Promise<AgentRun[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['agents'], 'readonly');
      const store = transaction.objectStore('agents');
      const index = store.index('startTime');
      const request = index.openCursor(null, 'prev');

      const results: AgentRun[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Storage statistics
  async getStorageStats(): Promise<{
    chats: number;
    progress: number;
    agents: number;
    workspaces: number;
    total: number;
  }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const count = (storeName: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };

    const [chats, progress, agents, workspaces] = await Promise.all([
      count('chats'),
      count('progress'),
      count('agents'),
      count('workspaces'),
    ]);

    return {
      chats,
      progress,
      agents,
      workspaces,
      total: chats + progress + agents + workspaces,
    };
  }

  // Clear all data
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const stores = ['storage', 'chats', 'progress', 'agents', 'workspaces'];

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Singleton instance
export const localStorageManager = new LocalStorageManager();
