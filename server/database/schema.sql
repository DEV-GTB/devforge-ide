-- DevForge AI Database Schema
-- SQLite Schema for Agent System and Project Intelligence

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  index_status TEXT DEFAULT 'NOT_INDEXED',
  index_version TEXT DEFAULT 'v1'
);

-- Agent runs table
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IDLE',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  attempt_count INTEGER DEFAULT 0,
  result TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Agent tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  depends_on TEXT, -- JSON array of task IDs
  started_at DATETIME,
  finished_at DATETIME,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
);

-- Agent events table
CREATE TABLE IF NOT EXISTS agent_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
);

-- Agent approvals table
CREATE TABLE IF NOT EXISTS agent_approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  risk TEXT NOT NULL,
  input TEXT, -- JSON
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
);

-- Agent changes table
CREATE TABLE IF NOT EXISTS agent_changes (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  file TEXT NOT NULL,
  operation TEXT NOT NULL,
  diff TEXT,
  before_hash TEXT,
  after_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
);

-- Agent errors table
CREATE TABLE IF NOT EXISTS agent_errors (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
);

-- Project files table (File Index)
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  language TEXT,
  extension TEXT,
  size INTEGER,
  content_hash TEXT,
  modified_at DATETIME,
  indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_binary INTEGER DEFAULT 0,
  is_generated INTEGER DEFAULT 0,
  sensitivity TEXT DEFAULT 'internal',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, path)
);

-- Project symbols table (Symbol Index)
CREATE TABLE IF NOT EXISTS project_symbols (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL, -- function, class, interface, component, etc.
  start_line INTEGER,
  end_line INTEGER,
  signature TEXT,
  exported INTEGER DEFAULT 0,
  parent_symbol_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES project_files(id) ON DELETE CASCADE
);

-- Project relationships table (Dependency Graph)
CREATE TABLE IF NOT EXISTS project_relationships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_symbol_id TEXT,
  target_symbol_id TEXT,
  source_file_id TEXT,
  target_file_id TEXT,
  relationship_type TEXT NOT NULL, -- IMPORTS, CALLS, EXTENDS, IMPLEMENTS, REFERENCES, EXPORTS, ROUTES_TO, TESTS, DEPENDS_ON
  confidence REAL DEFAULT 1.0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project chunks table (for embeddings)
CREATE TABLE IF NOT EXISTS project_chunks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_id TEXT,
  symbol_id TEXT,
  text TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  content_hash TEXT,
  embedding_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES project_files(id) ON DELETE CASCADE
);

-- Project embeddings table
CREATE TABLE IF NOT EXISTS project_embeddings (
  id TEXT PRIMARY KEY,
  chunk_id TEXT NOT NULL,
  vector BLOB, -- Store as binary
  model TEXT NOT NULL,
  dimensions INTEGER,
  version TEXT DEFAULT 'v1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chunk_id) REFERENCES project_chunks(id) ON DELETE CASCADE
);

-- Project memories table (Decision Memory)
CREATE TABLE IF NOT EXISTS project_memories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL, -- PROJECT_FACT, ARCHITECTURE_DECISION, USER_PREFERENCE, CODE_RELATIONSHIP, PROJECT_STRUCTURE, DEPENDENCY, DOCUMENTATION, TASK_HISTORY, GIT_HISTORY, RUNTIME_OBSERVATION
  content TEXT NOT NULL,
  source TEXT,
  confidence REAL DEFAULT 0.5,
  status TEXT DEFAULT 'active', -- active, stale, superseded
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Index jobs table (for background indexing)
CREATE TABLE IF NOT EXISTS index_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL, -- FULL_INDEX, FILE_INDEX, SYMBOL_INDEX, DEPENDENCY_INDEX, CHUNK_INDEX, EMBEDDING_INDEX
  status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, RUNNING, COMPLETED, PARTIAL, FAILED, CANCELLED
  started_at DATETIME,
  finished_at DATETIME,
  files_total INTEGER DEFAULT 0,
  files_processed INTEGER DEFAULT 0,
  files_failed INTEGER DEFAULT 0,
  error TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Index errors table
CREATE TABLE IF NOT EXISTS index_errors (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file TEXT,
  stage TEXT, -- DISCOVERY, PARSER, SYMBOL, CHUNK, EMBEDDING
  error TEXT NOT NULL,
  details TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Agent permissions table (Project-level policy)
CREATE TABLE IF NOT EXISTS agent_permissions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  allow_file_write INTEGER DEFAULT 1,
  allow_delete INTEGER DEFAULT 0,
  allow_install INTEGER DEFAULT 1,
  allow_network INTEGER DEFAULT 0,
  allow_git_commit INTEGER DEFAULT 0,
  allow_deploy INTEGER DEFAULT 0,
  allow_system_commands INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_runs_project ON agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_run ON agent_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_run ON agent_events(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(type);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_run ON agent_approvals(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_changes_run ON agent_changes(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_errors_run ON agent_errors(run_id);

CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_path ON project_files(path);
CREATE INDEX IF NOT EXISTS idx_project_files_hash ON project_files(content_hash);
CREATE INDEX IF NOT EXISTS idx_project_files_language ON project_files(language);

CREATE INDEX IF NOT EXISTS idx_project_symbols_project ON project_symbols(project_id);
CREATE INDEX IF NOT EXISTS idx_project_symbols_file ON project_symbols(file_id);
CREATE INDEX IF NOT EXISTS idx_project_symbols_name ON project_symbols(name);
CREATE INDEX IF NOT EXISTS idx_project_symbols_kind ON project_symbols(kind);

CREATE INDEX IF NOT EXISTS idx_project_relationships_project ON project_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_project_relationships_source ON project_relationships(source_symbol_id);
CREATE INDEX IF NOT EXISTS idx_project_relationships_target ON project_relationships(target_symbol_id);
CREATE INDEX IF NOT EXISTS idx_project_relationships_type ON project_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_project_chunks_project ON project_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_chunks_file ON project_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_project_chunks_hash ON project_chunks(content_hash);

CREATE INDEX IF NOT EXISTS idx_project_memories_project ON project_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memories_type ON project_memories(type);
CREATE INDEX IF NOT EXISTS idx_project_memories_status ON project_memories(status);

CREATE INDEX IF NOT EXISTS idx_index_jobs_project ON index_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_index_jobs_status ON index_jobs(status);
