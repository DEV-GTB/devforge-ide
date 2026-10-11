// Command Translator - Translates natural language to terminal commands
export interface CommandTranslation {
  commands: string[];
  explanation: string;
  riskLevel: 'safe' | 'moderate' | 'high' | 'dangerous';
  requiresApproval: boolean;
}

export class CommandTranslator {
  private commandMappings: Map<string, CommandMapping> = new Map();

  constructor() {
    this.initializeMappings();
  }

  private initializeMappings(): void {
    // File operations
    this.addMapping('show current folder', { commands: ['pwd'], explanation: 'Shows current working directory' });
    this.addMapping('list files', { commands: ['ls'], explanation: 'Lists files in current directory' });
    this.addMapping('go to folder', { commands: ['cd {folder}'], explanation: 'Changes to specified folder', params: ['folder'] });
    this.addMapping('go back', { commands: ['cd ..'], explanation: 'Goes back to parent directory' });
    this.addMapping('create folder', { commands: ['mkdir {name}'], explanation: 'Creates a new folder', params: ['name'] });
    this.addMapping('create file', { commands: ['touch {file}'], explanation: 'Creates a new file', params: ['file'] });
    this.addMapping('delete file', { commands: ['rm {file}'], explanation: 'Deletes specified file', params: ['file'], riskLevel: 'moderate', requiresApproval: true });
    this.addMapping('delete folder', { commands: ['rm -rf {folder}'], explanation: 'Deletes folder and contents', params: ['folder'], riskLevel: 'dangerous', requiresApproval: true });
    this.addMapping('copy file', { commands: ['cp {source} {dest}'], explanation: 'Copies file', params: ['source', 'dest'] });
    this.addMapping('move file', { commands: ['mv {source} {dest}'], explanation: 'Moves/renames file', params: ['source', 'dest'] });

    // Reading files
    this.addMapping('show file', { commands: ['cat {file}'], explanation: 'Displays file contents', params: ['file'] });
    this.addMapping('show first lines', { commands: ['head {file}'], explanation: 'Shows first lines of file', params: ['file'] });
    this.addMapping('show last lines', { commands: ['tail {file}'], explanation: 'Shows last lines of file', params: ['file'] });
    this.addMapping('search in file', { commands: ['grep "{text}" {file}'], explanation: 'Searches for text in file', params: ['text', 'file'] });
    this.addMapping('find files', { commands: ['find . -name "{pattern}"'], explanation: 'Finds files matching pattern', params: ['pattern'] });

    // NPM commands
    this.addMapping('install dependencies', { commands: ['npm install'], explanation: 'Installs project dependencies' });
    this.addMapping('install package', { commands: ['npm install {package}'], explanation: 'Installs specified package', params: ['package'] });
    this.addMapping('uninstall package', { commands: ['npm uninstall {package}'], explanation: 'Uninstalls specified package', params: ['package'] });
    this.addMapping('update packages', { commands: ['npm update'], explanation: 'Updates dependencies' });
    this.addMapping('start dev server', { commands: ['npm run dev'], explanation: 'Starts development server' });
    this.addMapping('build project', { commands: ['npm run build'], explanation: 'Builds the project' });
    this.addMapping('run tests', { commands: ['npm run test'], explanation: 'Runs test suite' });
    this.addMapping('run linter', { commands: ['npm run lint'], explanation: 'Runs linter' });

    // Python commands
    this.addMapping('install python package', { commands: ['pip install {package}'], explanation: 'Installs Python package', params: ['package'] });
    this.addMapping('install python requirements', { commands: ['pip install -r requirements.txt'], explanation: 'Installs requirements.txt' });
    this.addMapping('run python', { commands: ['python {file}'], explanation: 'Runs Python script', params: ['file'] });
    this.addMapping('python version', { commands: ['python --version'], explanation: 'Shows Python version' });

    // Rust commands
    this.addMapping('cargo build', { commands: ['cargo build'], explanation: 'Builds Rust project' });
    this.addMapping('cargo run', { commands: ['cargo run'], explanation: 'Runs Rust project' });
    this.addMapping('cargo test', { commands: ['cargo test'], explanation: 'Runs Rust tests' });
    this.addMapping('cargo check', { commands: ['cargo check'], explanation: 'Checks Rust code' });

    // Go commands
    this.addMapping('go run', { commands: ['go run .'], explanation: 'Runs Go project' });
    this.addMapping('go build', { commands: ['go build'], explanation: 'Builds Go project' });
    this.addMapping('go test', { commands: ['go test'], explanation: 'Runs Go tests' });
    this.addMapping('go mod tidy', { commands: ['go mod tidy'], explanation: 'Cleans up Go dependencies' });

    // Java commands
    this.addMapping('compile java', { commands: ['javac {file}'], explanation: 'Compiles Java file', params: ['file'] });
    this.addMapping('run java', { commands: ['java {class}'], explanation: 'Runs Java class', params: ['class'] });

    // Git commands
    this.addMapping('init git', { commands: ['git init'], explanation: 'Initializes git repository' });
    this.addMapping('git status', { commands: ['git status'], explanation: 'Shows git status' });
    this.addMapping('stage all', { commands: ['git add .'], explanation: 'Stages all changes' });
    this.addMapping('commit', { commands: ['git commit -m "{message}"'], explanation: 'Commits changes', params: ['message'] });
    this.addMapping('git log', { commands: ['git log'], explanation: 'Shows commit history' });
    this.addMapping('git diff', { commands: ['git diff'], explanation: 'Shows unstaged changes' });
    this.addMapping('create branch', { commands: ['git branch {name}'], explanation: 'Creates new branch', params: ['name'] });
    this.addMapping('switch branch', { commands: ['git checkout {branch}'], explanation: 'Switches to branch', params: ['branch'] });
    this.addMapping('pull', { commands: ['git pull'], explanation: 'Pulls changes from remote' });
    this.addMapping('push', { commands: ['git push'], explanation: 'Pushes changes to remote' });
    this.addMapping('clone repo', { commands: ['git clone {url}'], explanation: 'Clones repository', params: ['url'] });

    // Network commands
    this.addMapping('ping', { commands: ['ping {host}'], explanation: 'Pings host', params: ['host'] });
    this.addMapping('curl', { commands: ['curl {url}'], explanation: 'Makes HTTP request', params: ['url'] });

    // Common combinations
    this.addMapping('install and start', { commands: ['npm install', 'npm run dev'], explanation: 'Installs dependencies and starts dev server' });
    this.addMapping('setup project', { commands: ['npm install', 'npm run build'], explanation: 'Installs and builds project' });
  }

  private addMapping(pattern: string, mapping: CommandMapping): void {
    this.commandMappings.set(pattern.toLowerCase(), mapping);
  }

  translate(input: string): CommandTranslation {
    const lowerInput = input.toLowerCase();

    // Check for exact matches
    for (const [pattern, mapping] of this.commandMappings) {
      if (lowerInput.includes(pattern)) {
        const commands = this.interpolateCommands(mapping.commands, input);
        return {
          commands,
          explanation: mapping.explanation,
          riskLevel: mapping.riskLevel || 'safe',
          requiresApproval: mapping.requiresApproval || false,
        };
      }
    }

    // Use AI for complex queries
    return this.aiTranslate(input);
  }

  private interpolateCommands(commands: string[], input: string): string[] {
    // Extract parameters from input and interpolate
    // This is a simple implementation - in production, use more sophisticated NLP
    return commands.map(templateCmd => {
      // Replace {folder}, {file}, etc. with extracted values
      const words = input.split(/\s+/);
      let cmd = templateCmd;

      // Simple parameter extraction
      if (cmd.includes('{folder}') && words.length > 2) {
        const folder = words[words.length - 1];
        cmd = cmd.replace('{folder}', folder);
      }
      if (cmd.includes('{file}') && words.length > 2) {
        const file = words[words.length - 1];
        cmd = cmd.replace('{file}', file);
      }
      if (cmd.includes('{package}') && words.length > 2) {
        const pkg = words[words.length - 1];
        cmd = cmd.replace('{package}', pkg);
      }
      if (cmd.includes('{message}') && words.length > 2) {
        const message = words.slice(2).join(' ');
        cmd = cmd.replace('{message}', message);
      }
      if (cmd.includes('{branch}') && words.length > 2) {
        const branch = words[words.length - 1];
        cmd = cmd.replace('{branch}', branch);
      }
      if (cmd.includes('{host}') && words.length > 1) {
        const host = words[words.length - 1];
        cmd = cmd.replace('{host}', host);
      }
      if (cmd.includes('{url}') && words.length > 1) {
        const url = words[words.length - 1];
        cmd = cmd.replace('{url}', url);
      }
      if (cmd.includes('{class}') && words.length > 2) {
        const className = words[words.length - 1].replace('.java', '');
        cmd = cmd.replace('{class}', className);
      }

      return cmd;
    });
  }

  private aiTranslate(input: string): CommandTranslation {
    // Fallback: try to detect common patterns
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('install') && lowerInput.includes('start')) {
      return {
        commands: ['npm install', 'npm run dev'],
        explanation: 'Installs dependencies and starts development server',
        riskLevel: 'safe',
        requiresApproval: false,
      };
    }

    if (lowerInput.includes('install') && lowerInput.includes('test')) {
      return {
        commands: ['npm install', 'npm test'],
        explanation: 'Installs dependencies and runs tests',
        riskLevel: 'safe',
        requiresApproval: false,
      };
    }

    // Default: return as-is with moderate risk
    return {
      commands: [input],
      explanation: 'Executing command as entered',
      riskLevel: 'moderate',
      requiresApproval: true,
    };
  }

  // AI-specific commands
  isAICommand(input: string): boolean {
    return input.startsWith('/');
  }

  executeAICommand(input: string): AICommandResult {
    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1).join(' ');

    switch (command) {
      case '/explain':
        return {
          type: 'explain',
          command: args,
          action: 'Explain the command before executing',
        };
      case '/run':
        return {
          type: 'run',
          command: args,
          action: 'Run the command with monitoring',
        };
      case '/fix':
        return {
          type: 'fix',
          command: args,
          action: 'Run auto-fix on errors',
        };
      case '/test':
        return {
          type: 'test',
          command: args || 'npm test',
          action: 'Run tests and analyze failures',
        };
      case '/build':
        return {
          type: 'build',
          command: args || 'npm run build',
          action: 'Build and analyze errors',
        };
      case '/install':
        return {
          type: 'install',
          command: `npm install ${args}`,
          action: 'Install package and check dependencies',
        };
      case '/search':
        return {
          type: 'search',
          command: args,
          action: 'Search codebase for pattern',
        };
      case '/find':
        return {
          type: 'find',
          command: args,
          action: 'Find files matching pattern',
        };
      case '/preview':
        return {
          type: 'preview',
          command: '',
          action: 'Open live preview',
        };
      case '/stop':
        return {
          type: 'stop',
          command: '',
          action: 'Stop running process',
        };
      default:
        return {
          type: 'unknown',
          command: input,
          action: 'Unknown AI command',
        };
    }
  }
}

interface CommandMapping {
  commands: string[];
  explanation: string;
  params?: string[];
  riskLevel?: 'safe' | 'moderate' | 'high' | 'dangerous';
  requiresApproval?: boolean;
}

export interface AICommandResult {
  type: 'explain' | 'run' | 'fix' | 'test' | 'build' | 'install' | 'search' | 'find' | 'preview' | 'stop' | 'unknown';
  command: string;
  action: string;
}
