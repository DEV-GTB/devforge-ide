# DevForge AI - Local Backend Server Implementation

## Overview
A local backend server that runs the Autonomous Coding Agent on the user's device, keeping GPU and system resources free from cloud AI usage. All files and data are stored locally on the user's device.

## Architecture

### Core Components

#### 1. AgentService (`server/agent/AgentService.ts`)
Central service for managing agent runs with event-driven architecture.

**Features:**
- Run lifecycle management (create, update, complete, fail, cancel)
- Real-time event emission via EventEmitter
- Task, message, action, and error tracking
- File change tracking with diff support

**Events:**
- `run.created` - New agent run started
- `run.status_changed` - Agent status updated
- `run.message_added` - New message added
- `run.task_added` - New task created
- `run.task_updated` - Task status changed
- `run.action_added` - Tool action started
- `run.action_updated` - Tool action completed
- `run.error_added` - Error occurred
- `run.completed` - Run finished successfully
- `run.failed` - Run failed
- `run.cancelled` - Run cancelled by user

#### 2. AgentOrchestrator (`server/agent/AgentOrchestrator.ts`)
Central controller for the autonomous coding agent.

**Workflow:**
1. Analyze project structure
2. Create execution plan
3. Execute tasks with tool calls
4. Verify results
5. Complete or fail based on verification

**Configuration:**
- `maxIterations`: Maximum retry attempts (default: 10)
- `timeout`: Total run timeout (default: 5 minutes)
- `autoApproveSafe`: Auto-approve safe operations
- `requireApprovalForDestructive`: Require approval for destructive operations

#### 3. AgentPlanner (`server/agent/AgentPlanner.ts`)
Converts user goals into structured task plans.

**Task Types:**
- Feature addition (create/add)
- Bug fix (fix/debug)
- Deletion (delete/remove)
- General purpose

**Output:**
- Task list with dependencies
- Estimated duration
- Risk level assessment

#### 4. AgentExecutor (`server/agent/AgentExecutor.ts`)
Executes individual tasks using available tools.

**Tool Selection:**
- Inspect/Analyze → list_files, read_file
- Create/Add → write_file
- Modify/Edit → edit_file
- Delete/Remove → delete_file
- Build → run_command
- Test → run_tests

**Permission Checking:**
- Checks tool permissions before execution
- Requests approval for risky operations
- Blocks unauthorized actions

#### 5. AgentVerifier (`server/agent/AgentVerifier.ts`)
Verifies that the agent's work is correct.

**Verification Levels:**
1. Static - Files exist and are syntactically valid
2. Build - Project compiles successfully
3. Tests - Test suite passes

**Result Status:**
- `verified` - All checks passed
- `partial` - Some checks failed
- `failed` - Critical checks failed
- `not_verified` - Could not verify

#### 6. AgentMemory (`server/agent/AgentMemory.ts`)
Short-term memory for agent runs.

**Features:**
- Key-value storage
- History tracking with timestamps
- Search functionality
- Clear/reset capabilities

#### 7. AgentPolicy (`server/agent/AgentPolicy.ts`)
Security and permission management.

**Permission Levels:**
- `read` - File reading operations
- `write` - File writing operations
- `execute` - Command execution
- `system` - System-level operations

**Project Policies:**
- `allowFileWrite` - Allow file modifications
- `allowDelete` - Allow file deletion
- `allowInstall` - Allow package installation
- `allowNetwork` - Allow network access
- `allowGitCommit` - Allow git commits
- `allowDeploy` - Allow deployments
- `allowSystemCommands` - Allow system commands

### Tool System (`server/agent/tools/ToolRegistry.ts`)

#### Available Tools:

1. **read_file** - Read file contents
   - Permission: read
   - Input: `{ path: string }`
   - Output: file content string

2. **write_file** - Create or overwrite file
   - Permission: write
   - Input: `{ path: string, content: string }`
   - Output: void

3. **edit_file** - Edit specific lines in a file
   - Permission: write
   - Input: `{ path: string, changes: Array<{startLine, endLine, replacement}> }`
   - Output: void

4. **delete_file** - Delete a file
   - Permission: write
   - Input: `{ path: string }`
   - Output: void

5. **list_files** - List files in directory
   - Permission: read
   - Input: `{ path?: string }`
   - Output: string[]

6. **search_code** - Search for text in files
   - Permission: read
   - Input: `{ query: string, path?: string }`
   - Output: Array<{file, line, content}>

7. **run_command** - Execute shell command
   - Permission: execute
   - Input: `{ command: string }`
   - Output: `{ exitCode, stdout, stderr }`

8. **run_tests** - Run project test suite
   - Permission: execute
   - Input: `{}`
   - Output: `{ passed, failed, output }`

9. **get_project_structure** - Get project metadata
   - Permission: read
   - Input: `{}`
   - Output: `{ framework, language, buildTool, packageManager, entry, scripts }`

### Server API (`server/index.ts`)

#### REST Endpoints:

**POST /api/agents/runs**
Start a new agent run
```json
{
  "projectId": "project-123",
  "userId": "user-123",
  "goal": "Add authentication to the app"
}
```

**GET /api/agents/runs/:id**
Get agent run details

**POST /api/agents/runs/:id/cancel**
Cancel an active agent run

**GET /api/agents/runs**
Get all runs (optional ?projectId filter)

**GET /api/agents/status**
Get current agent status

#### WebSocket Events:

**Client → Server:**
- Connection established

**Server → Client:**
- `agent:run_created` - New run started
- `agent:status_changed` - Status update
- `agent:message_added` - New message
- `agent:task_added` - New task
- `agent:task_updated` - Task status
- `agent:action_added` - Tool action started
- `agent:action_updated` - Tool action result
- `agent:error_added` - Error occurred
- `agent:completed` - Run completed
- `agent:failed` - Run failed
- `agent:cancelled` - Run cancelled

## Running the Server

### Start the Agent Server:
```bash
npm run agent-server
```

The server will start on port 3001 (configurable via PORT environment variable).

### Start the Main Dev Server:
```bash
npm run dev
```

## Device Detection

The system automatically detects device type without user input:

- **Mobile** - Screen width < 768px
- **Tablet** - Screen width 768px - 1024px
- **Desktop** - Screen width >= 1024px

Detection is handled by the `useDeviceDetection` hook in the frontend, which provides:
- Device type
- Orientation (portrait/landscape)
- Screen dimensions
- Helper booleans (isMobile, isTablet, isDesktop, etc.)

## Local Storage

All data is stored locally on the user's device:

- **Agent runs** - In-memory (can be persisted to SQLite later)
- **File changes** - Direct filesystem operations
- **Project data** - Local workspace directory
- **Logs** - Console output (can be persisted later)

## Security Features

1. **Workspace Boundary** - Agent cannot access files outside project directory
2. **Permission System** - Tools require appropriate permissions
3. **Approval System** - Destructive operations require approval
4. **Command Risk Analysis** - Dangerous commands are blocked
5. **Path Validation** - Prevents path traversal attacks
6. **Secret Protection** - Secrets are not exposed to AI

## GPU and System Resource Usage

The local backend server is designed to:

- **Keep GPU free** - No local ML models running; AI calls go to external providers
- **Minimal CPU usage** - Efficient event-driven architecture
- **Low memory footprint** - In-memory storage with configurable limits
- **Network optimization** - Only essential API calls to AI providers

## Next Steps

1. **Add AI Provider Integration** - Connect to external AI APIs (OpenAI, Anthropic, etc.)
2. **Add Database Persistence** - Store agent runs in SQLite
3. **Add Git Integration** - Automatic branching and commits
4. **Add Snapshot System** - Workspace snapshots for rollback
5. **Add More Tools** - Browser automation, screenshot capture, etc.
6. **Add Approval UI** - Interactive approval cards in frontend
7. **Add Performance Monitoring** - Track CPU, memory, and API usage
8. **Add Rate Limiting** - Prevent excessive API calls

## API Usage Example

### Starting an Agent Run:

```javascript
// REST API
const response = await fetch('http://localhost:3001/api/agents/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'my-project',
    userId: 'user-123',
    goal: 'Add a login page with authentication'
  })
});

const run = await response.json();
console.log('Run ID:', run.id);
```

### WebSocket Connection:

```javascript
const socket = io('http://localhost:3001');

socket.on('agent:status_changed', ({ runId, status }) => {
  console.log(`Status: ${status}`);
});

socket.on('agent:message_added', ({ runId, message }) => {
  console.log(`Message: ${message.content}`);
});

socket.on('agent:completed', ({ runId, result }) => {
  console.log('Completed:', result);
});
```

## Frontend Integration

The frontend connects to the backend via:

1. **REST API** - For starting/cancelling runs and fetching data
2. **WebSocket** - For real-time updates during execution

Example integration in AgentPanel:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Start run
const run = await fetch('/api/agents/runs', {
  method: 'POST',
  body: JSON.stringify({ projectId, userId, goal })
}).then(r => r.json());

// Listen for updates
socket.on('agent:task_updated', ({ taskId, status }) => {
  updateTaskStatus(taskId, status);
});
```

## Environment Variables

```bash
PORT=3001                    # Server port
NODE_ENV=development         # Environment
AI_PROVIDER=openai           # AI provider (future)
AI_API_KEY=sk-...            # API key (future)
```

## Troubleshooting

**Server won't start:**
- Check if port 3001 is already in use
- Verify Node.js version (>= 18)
- Check npm dependencies are installed

**Agent run fails:**
- Check project directory exists
- Verify package.json is valid
- Check tool permissions in project policy

**WebSocket connection fails:**
- Ensure server is running
- Check CORS settings
- Verify client can reach localhost:3001

## File Structure

```
server/
├── index.ts                    # Main server entry point
└── agent/
    ├── AgentService.ts        # Run management
    ├── AgentOrchestrator.ts   # Central controller
    ├── AgentPlanner.ts        # Task planning
    ├── AgentExecutor.ts       # Task execution
    ├── AgentVerifier.ts       # Result verification
    ├── AgentMemory.ts         # Short-term memory
    ├── AgentPolicy.ts         # Permission system
    └── tools/
        └── ToolRegistry.ts   # Tool implementations
```
