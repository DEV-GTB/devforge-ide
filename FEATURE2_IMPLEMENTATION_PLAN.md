# Feature 2 - Whole-Project AI Memory Implementation Plan

## Overview

Feature 2 is a **foundational system** that provides project intelligence to all other features (Agent, Testing, Fix Everything, etc.). It's not just a vector database - it's a complete Project Intelligence Engine with multiple layers.

## ✅ Completed Components

### 1. ProjectScanner
**File:** `server/indexing/ProjectScanner.ts`

**Features:**
- Recursive file discovery with depth control
- Security-first file filtering (excludes node_modules, .git, etc.)
- Sensitive file detection (.env, keys, certificates)
- Binary file detection
- Pattern-based inclusion/exclusion
- Language detection (15+ languages)
- Statistics by language and extension
- Error handling and reporting

**Usage:**
```typescript
const scanner = new ProjectScanner('/path/to/project');
const result = await scanner.scan({
  excludePatterns: ['dist', 'build'],
  maxDepth: 10
});
```

### 2. Enhanced FileIndexer
**File:** `src/features/project-intelligence/FileIndexer.ts`

**New Features:**
- Secret scanning with regex patterns (API keys, tokens, passwords, database URLs)
- Sensitivity classification (public, internal, sensitive, secret)
- Secret redaction for safe context building
- File filtering by sensitivity
- File filtering by language
- Binary file flag
- Generated file flag

**Security Patterns:**
- API keys (sk-*, API_KEY)
- Secrets (SECRET_KEY, PASSWORD)
- Database URLs (mongodb://, postgres://, mysql://)
- Tokens (JWT_SECRET, Bearer tokens)

### 3. Database Schema
**File:** `server/database/schema.sql`

**Tables Created (16):**
- `projects` - Project metadata
- `project_files` - File index
- `project_symbols` - Symbol index
- `project_relationships` - Dependency graph
- `project_chunks` - Code chunks
- `project_embeddings` - Vector storage
- `project_memories` - Decision memory
- `index_jobs` - Background indexing
- `index_errors` - Error tracking
- Plus agent tables for Feature 1 integration

---

## 🚧 Pending Components (To Complete Feature 2)

### Phase 1: Core Indexing (In Progress)

#### 4. ParserRegistry
**Purpose:** Pluggable AST parsers for different languages

**Required Languages:**
- TypeScript/JavaScript (using @typescript-eslint/parser or similar)
- Python (using ast or built-in)
- C/C++ (using tree-sitter or similar)
- Java, Go, Rust (later phases)

**Interface:**
```typescript
interface Parser {
  parse(code: string, language: string): AST;
  extractSymbols(ast: AST): Symbol[];
  extractImports(ast: AST): Import[];
}
```

**Files to Create:**
- `server/parsers/ParserRegistry.ts`
- `server/parsers/TypeScriptParser.ts`
- `server/parsers/JavaScriptParser.ts`
- `server/parsers/PythonParser.ts`

#### 5. Enhanced SymbolIndexer
**Purpose:** AST-based symbol extraction (not regex-based)

**Current:** Uses regex patterns
**Target:** Uses AST for accurate extraction

**Required:**
- Functions (async, regular, arrow)
- Classes and interfaces
- Components (React)
- Hooks (React)
- Constants and variables
- Types and enums
- Methods and properties

**Files to Enhance:**
- `src/features/project-intelligence/SymbolIndexer.ts`

#### 6. Enhanced DependencyIndexer
**Purpose:** Build symbol-level dependency graph (not just file-level)

**Current:** File-to-file imports
**Target:** Symbol-to-symbol relationships

**Required:**
- Symbol-to-symbol calls
- Class extends/implements
- Interface implementations
- Component dependencies
- Route-to-handler mapping

**Files to Enhance:**
- `src/features/project-intelligence/DependencyIndexer.ts`

#### 7. Graph Traversal
**Purpose:** Query dependency graph for impact analysis

**Features:**
- `getDependents(symbolId)` - What depends on this?
- `getDependencies(symbolId)` - What does this depend on?
- `getReachableNodes(symbolId, maxDepth)` - BFS/DFS traversal
- `findCircularDependencies()` - Detect cycles

**Files to Create:**
- `server/graph/DependencyGraph.ts`
- `server/graph/SymbolGraph.ts`

### Phase 2: Semantic Layer

#### 8. EmbeddingEngine
**Purpose:** Generate semantic vectors from code chunks

**Interface:**
```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

**Providers:**
- `LocalEmbeddingProvider` - For offline mode
- `RemoteEmbeddingProvider` - Cloud API (OpenAI, etc.)
- `HybridEmbeddingProvider` - Fallback strategy

**Files to Create:**
- `server/embeddings/EmbeddingProvider.ts`
- `server/embeddings/LocalEmbeddingProvider.ts`
- `server/embeddings/RemoteEmbeddingProvider.ts`

#### 9. VectorStore
**Purpose:** Store and search vector embeddings

**Interface:**
```typescript
interface VectorStore {
  upsert(id: string, vector: number[], metadata: any): Promise<void>;
  search(query: number[], limit: number, filters: any): Promise<Result[]>;
  delete(id: string): Promise<void>;
  deleteByProject(projectId: string): Promise<void>;
}
```

**Implementations:**
- `SQLiteVectorStore` - Using SQLite with extensions
- `MemoryVectorStore` - For small projects
- `RemoteVectorStore` - Pinecone, Weaviate, etc.

**Files to Create:**
- `server/vector/VectorStore.ts`
- `server/vector/SQLiteVectorStore.ts`

#### 10. Enhanced Chunker
**Purpose:** Structure-aware code chunking (currently line-based)

**Current:** Splits by line count
**Target:** AST-aware chunking

**Required:**
- Chunk by function boundaries
- Chunk by class boundaries
- Chunk by component boundaries
- Preserve logical units
- Add metadata (symbol, type, lines)

**Files to Enhance:**
- `src/features/project-intelligence/Chunker.ts`

### Phase 3: Retrieval System

#### 11. ContextRetriever
**Purpose:** Hybrid retrieval combining multiple strategies

**Architecture:**
```
Query
  ↓
Keyword Search + Symbol Search + Semantic Search + Graph Traversal
  ↓
Candidate Collection
  ↓
Ranking (relevance, dependency distance, recency, current file)
  ↓
Context Assembly
```

**Files to Create:**
- `server/intelligence/ContextRetriever.ts`
- `server/intelligence/CandidateCollector.ts`
- `server/intelligence/CandidateRanker.ts`

#### 12. ContextAssembler
**Purpose:** Build context pack for AI

**Context Pack Structure:**
```typescript
interface ContextPack {
  projectSummary: ProjectSummary;
  files: ContextFile[];
  symbols: ContextSymbol[];
  relationships: DependencyEdge[];
  memories: ProjectMemory[];
  decisions: ProjectDecision[];
  tests?: TestContext[];
}
```

**Features:**
- Context budget management (token limits)
- Context compression (full source → summaries for low priority)
- Source of truth prioritization
- Secret redaction
- Validation (no duplicates, valid paths)

**Files to Create:**
- `server/intelligence/ContextAssembler.ts`
- `server/intelligence/ContextValidator.ts`

### Phase 4: Memory System

#### 13. ProjectMemory
**Purpose:** Store verified project facts

**Memory Types:**
- PROJECT_FACT (from package.json, config files)
- ARCHITECTURE_DECISION (developer decisions)
- USER_PREFERENCE (coding style preferences)
- CODE_RELATIONSHIP (patterns detected)
- PROJECT_STRUCTURE (architecture inferred)

**Features:**
- Confidence tracking
- Source verification
- Stale detection
- Conflict resolution
- Memory promotion (candidate → verified)

**Files to Create:**
- `server/intelligence/ProjectMemory.ts`
- `server/intelligence/DecisionMemory.ts`
- `server/intelligence/UserPreferences.ts`

#### 14. MemoryManager
**Purpose:** Orchestrate all memory stores

**Stores:**
- ProjectFactStore
- DecisionStore
- PreferenceStore
- SemanticMemoryStore

**Features:**
- Store/retrieve/update/invalidate
- Conflict resolution
- Get relevant memories by type
- Memory promotion/validation

**Files to Create:**
- `server/intelligence/MemoryManager.ts`

### Phase 5: Incremental Indexing

#### 15. FileWatcher
**Purpose:** Detect file changes and trigger reindexing

**Features:**
- File system watching (chokidar or fs.watch)
- Debouncing (300ms for multiple events)
- Change detection (hash comparison)
- Index queue for batch processing
- Background worker for non-blocking

**Files to Create:**
- `server/indexing/FileWatcher.ts`
- `server/indexing/IndexQueue.ts`
- `server/indexing/IndexWorker.ts`

#### 16. Hash Caching
**Purpose:** Avoid reprocessing unchanged files

**Current:** Basic hash function
**Target:** SHA-256 with persistent cache

**Features:**
- Content hash in database
- Hash comparison before reindex
- Only reprocess changed files
- Update affected symbols/relationships

**Files to Enhance:**
- `src/features/project-intelligence/FileIndexer.ts`

### Phase 6: API Layer

#### 17. Project Intelligence API
**Endpoints:**
```
POST   /api/projects/:projectId/index
GET    /api/projects/:projectId/index/status
POST   /api/projects/:projectId/index/file
POST   /api/projects/:projectId/search
GET    /api/projects/:projectId/files
GET    /api/projects/:projectId/symbols
GET    /api/projects/:projectId/graph
POST   /api/projects/:projectId/context
GET    /api/projects/:projectId/summary
```

**Files to Create:**
- `server/api/intelligenceRoutes.ts`

### Phase 7: Frontend Components

#### 18. Intelligence Panel
**Components:**
- `IntelligencePanel.tsx` - Main panel
- `IndexStatus.tsx` - Progress indicator
- `ProjectStats.tsx` - File/symbol/chunk counts
- `SearchResults.tsx` - Search results display
- `SymbolExplorer.tsx` - Symbol browser
- `DependencyGraph.tsx` - Graph visualization
- `MemoryInspector.tsx` - Memory viewer
- `ContextPreview.tsx` - Context before agent runs

**Files to Create:**
- `src/features/project-intelligence/components/*.tsx`

#### 19. Intelligence Store
**State:**
```typescript
interface IntelligenceState {
  status: 'IDLE' | 'INDEXING' | 'PARTIAL' | 'ERROR';
  progress: number;
  filesIndexed: number;
  totalFiles: number;
  symbols: number;
  chunks: number;
  lastIndexedAt?: string;
  errors: IndexError[];
}
```

**Files to Create:**
- `src/features/project-intelligence/store/intelligenceStore.ts`

---

## Architecture Diagram

```
                    PROJECT
                       │
                       ▼
              PROJECT SCANNER ✅
                       │
                       ▼
              FILE INDEX ✅
          (with secret scanning)
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
   SYMBOL INDEXER ⚠️           DEPENDENCY INDEXER ⚠️
   (regex-based)                (file-level)
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
               DEPENDENCY GRAPH ⚠️
                       │
                       ▼
                    CHUNKER ⚠️
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
        SECRET SCANNER ⚠️   EMBEDDING ENGINE ❌
              │                 │
              └────────┬────────┘
                       │
                       ▼
                 VECTOR STORE ❌
                       │
                       ▼
              PROJECT MEMORY ❌
                       │
                       ▼
            CONTEXT RETRIEVER ❌
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    EXACT SEARCH  SYMBOL SEARCH  SEMANTIC SEARCH ❌
         │             │             │
         └─────────────┼─────────────┘
                       │
                       ▼
                 RANKING ❌
                       │
                       ▼
             CONTEXT ASSEMBLER ❌
                       │
                       ▼
                  CONTEXT PACK
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
      AGENT         TESTING       CHAT
```

**Legend:**
- ✅ = Completed
- ⚠️ = Partially implemented (needs enhancement)
- ❌ = Not implemented

---

## Implementation Priority

### MVP (Minimum Viable Product)
1. ✅ ProjectScanner
2. ✅ Enhanced FileIndexer (secret scanning)
3. ⚠️ ParserRegistry (TypeScript only)
4. ⚠️ Enhanced SymbolIndexer (AST-based)
5. ⚠️ Enhanced DependencyIndexer (symbol-level)
6. ⚠️ Enhanced Chunker (structure-aware)
7. ❌ EmbeddingEngine (mock)
8. ❌ VectorStore (mock)
9. ❌ ContextRetriever (keyword + symbol only)
10. ❌ ContextAssembler (basic)
11. ❌ ProjectMemory (basic facts)
12. ❌ FileWatcher
13. ❌ API endpoints

### Professional Version
14. ❌ Multiple language parsers
15. ❌ Real embedding provider
16. ❌ Real vector store
17. ❌ Hybrid retrieval (semantic + graph)
18. ❌ Context ranking
19. ❌ Decision memory
20. ❌ Context budget management
21. ❌ Secret redaction in context
22. ❌ Graph visualization
23. ❌ Index queue and background workers
24. ❌ Index health monitoring
25. ❌ Frontend components

### Advanced Version
26. ❌ Architecture inference
27. ❌ Cross-language graph
28. ❌ Runtime observations
29. ❌ Test coverage graph
30. ❌ Agent task memory
31. ❌ Memory decay and revalidation
32. ❌ Branch-aware indexing
33. ❌ Monorepo support
34. ❌ Multi-project isolation
35. ❌ Performance optimization

---

## Integration with Feature 1

### Current State
Feature 1 (Autonomous Agent) has tools:
- `read_file`
- `list_files`
- `search_code`
- `write_file`
- `edit_file`
- `run_command`
- `run_tests`
- `get_project_structure`

### After Feature 2 Integration
Agent should use:
```typescript
// Instead of reading entire project
const context = await contextRetriever.buildContext({
  projectId,
  task: "Add authentication",
  maxTokens: 50000
});

// Agent receives:
// - Relevant files (not all files)
// - Relevant symbols
// - Dependency graph
// - Project decisions
// - Only if safe (no secrets)
```

### Tool Enhancements Needed
- Add `get_context` tool to ToolRegistry
- Add `search_symbols` tool
- Add `get_dependencies` tool
- Add `get_project_memory` tool

---

## Database Schema Already Created

The database schema in `server/database/schema.sql` already includes:
- ✅ `project_files` - File index
- ✅ `project_symbols` - Symbol index
- ✅ `project_relationships` - Dependency graph
- ✅ `project_chunks` - Code chunks
- ✅ `project_embeddings` - Vector storage
- ✅ `project_memories` - Decision memory
- ✅ `index_jobs` - Background indexing
- ✅ `index_errors` - Error tracking

**This is a solid foundation for the MVP.**

---

## Next Steps to Complete MVP

1. **Create ParserRegistry** with TypeScript parser
2. **Enhance SymbolIndexer** to use AST instead of regex
3. **Enhance DependencyIndexer** to track symbol-level relationships
4. **Create EmbeddingEngine** with mock implementation
5. **Create VectorStore** with mock implementation
6. **Create ContextRetriever** with keyword + symbol search
7. **Create ContextAssembler** for basic context packs
8. **Create ProjectMemory** for storing package.json facts
9. **Create FileWatcher** for incremental indexing
10. **Add API endpoints** for search and context
11. **Create basic frontend components**
12. **Integrate with Agent tools**

**Estimated time for MVP completion:** 3-4 days of focused development

---

## Security Considerations

### ✅ Already Implemented
- Secret file detection in ProjectScanner
- Secret pattern matching in FileIndexer
- Sensitivity classification
- Database schema with project isolation

### ❌ Still Needed
- Secret redaction in context validator
- Path traversal prevention
- Project/workspace isolation in vector search
- Gitignored file respect
- Context sanitization before sending to AI

---

## Performance Considerations

### ✅ Already Implemented
- Hash-based incremental indexing (basic)
- File exclusion patterns
- Binary file detection

### ❌ Still Needed
- Real caching (AST, symbols, embeddings)
- Batch embedding processing
- Context budget management
- Lazy retrieval
- Background workers
- Index queue with debouncing
- Staged indexing for large projects

---

## Testing Strategy

### Unit Tests Needed
1. ProjectScanner file discovery
2. Secret detection patterns
3. Hash computation
4. Symbol extraction
5. Dependency graph building
6. Chunk generation
7. Context retrieval ranking
8. Memory conflict resolution

### Integration Tests Needed
1. Full project indexing workflow
2. Incremental reindexing
3. Context pack generation
4. Agent context retrieval
5. Secret exclusion validation

### Performance Tests Needed
1. 1,000 file project indexing time
2. 10,000 file project indexing time
3. Incremental reindexing time
4. Search latency
5. Memory usage

---

## Acceptance Criteria

Feature 2 is complete when:

1. **Project Understanding**
   - ✅ Can identify languages
   - ✅ Can identify important files
   - ❌ Can identify framework (from package.json)
   - ❌ Can identify commands

2. **Code Understanding**
   - ❌ Can identify functions (AST-based)
   - ❌ Can identify classes
   - ❌ Can identify components
   - ❌ Can identify interfaces
   - ❌ Can identify imports

3. **Relationship Understanding**
   - ⚠️ Can track imports (file-level)
   - ❌ Can track function calls
   - ❌ Can track class extends
   - ❌ Can track references

4. **Semantic Understanding**
   - ❌ Can retrieve semantically similar code
   - ❌ Can handle synonym queries
   - ❌ Can match concepts not in text

5. **Incremental Updates**
   - ❌ File change detection
   - ❌ Hash-based reindexing
   - ❌ Symbol updates
   - ❌ Graph updates
   - ❌ Embedding regeneration

6. **Security**
   - ✅ Secret file detection
   - ✅ Secret pattern matching
   - ❌ Secret redaction in context
   - ❌ Path traversal prevention
   - ❌ Project isolation

7. **AI Integration**
   - ❌ Context retrieval for agent
   - ❌ Context pack generation
   - ❌ Relevant context only (not entire project)

---

## Conclusion

Feature 2 is **~20% complete** with solid foundations:
- ✅ Database schema (16 tables)
- ✅ ProjectScanner (security-first)
- ✅ Enhanced FileIndexer (secret scanning)
- ⚠️ Basic symbol/dependency/chunk indexing (regex-based)
- ❌ No AST parsing
- ❌ No semantic embeddings
- ❌ No context retrieval
- ❌ No incremental indexing
- ❌ No frontend components

**Recommended next step:** Focus on completing the MVP components (ParserRegistry, enhanced indexers, mock embeddings, basic retrieval) before adding advanced features like real embeddings, complex graph traversal, and full UI.

This feature is **foundational** - completing it will dramatically improve Feature 1 (Autonomous Agent), Feature 3 (Fix Everything), Feature 4 (Testing Agent), and all other AI-dependent features.
