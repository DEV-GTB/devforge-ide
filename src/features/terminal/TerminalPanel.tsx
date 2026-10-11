// Terminal Panel with Natural-Language Support
import React, { useState, useRef, useEffect } from 'react';
import { CommandTranslator, CommandTranslation, AICommandResult } from './CommandTranslator';
import { CommandRiskAnalyzer, RiskAnalysis } from './CommandRiskAnalyzer';

export function TerminalPanel() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mode, setMode] = useState<'normal' | 'ai' | 'explain'>('normal');
  const [pendingCommand, setPendingCommand] = useState<CommandTranslation | null>(null);
  const [aiCommandResult, setAiCommandResult] = useState<AICommandResult | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const translator = new CommandTranslator();
  const riskAnalyzer = new CommandRiskAnalyzer();

  useEffect(() => {
    scrollToBottom();
  }, [output]);

  const scrollToBottom = () => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  };

  const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory(1);
    }
  };

  const navigateHistory = (direction: number) => {
    const newIndex = historyIndex + direction;
    if (newIndex >= -1 && newIndex < history.length) {
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? '' : history[history.length - 1 - newIndex]);
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;

    // Add to history
    setHistory(prev => [...prev, input]);
    setHistoryIndex(-1);

    // Check if AI command
    if (translator.isAICommand(input)) {
      const aiResult = translator.executeAICommand(input);
      setAiCommandResult(aiResult);
      setOutput(prev => [...prev, { type: 'ai-command', content: input, aiResult }]);
      setInput('');
      return;
    }

    // Translate natural language
    const translation = translator.translate(input);
    const riskAnalysis = riskAnalyzer.analyzeMultiple(translation.commands);

    setOutput(prev => [...prev, { type: 'input', content: input }]);

    if (riskAnalysis.requiresApproval || translation.requiresApproval) {
      setPendingCommand({ ...translation, riskLevel: riskAnalysis.riskLevel });
      setOutput(prev => [
        ...prev,
        {
          type: 'translation',
          content: JSON.stringify(translation),
          translation,
          riskAnalysis,
        },
      ]);
    } else {
      executeCommands(translation.commands);
    }

    setInput('');
  };

  const executeCommands = async (commands: string[]) => {
    for (const cmd of commands) {
      setOutput(prev => [...prev, { type: 'command', content: `$ ${cmd}` }]);

      // Simulate command execution
      try {
        const result = await simulateCommand(cmd);
        setOutput(prev => [...prev, { type: 'output', content: result }]);
      } catch (error) {
        setOutput(prev => [
          ...prev,
          { type: 'error', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
        ]);
      }
    }
  };

  const approveCommand = () => {
    if (pendingCommand) {
      executeCommands(pendingCommand.commands);
      setPendingCommand(null);
    }
  };

  const rejectCommand = () => {
    setOutput(prev => [...prev, { type: 'info', content: 'Command rejected by user' }]);
    setPendingCommand(null);
  };

  const simulateCommand = async (command: string): Promise<string> => {
    // Simulate command execution with delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock responses for common commands
    if (command === 'pwd') return '/home/user/project';
    if (command === 'ls') return 'node_modules/  package.json  src/  README.md';
    if (command === 'npm install') return 'Installing dependencies...\n✓ Dependencies installed';
    if (command === 'npm run dev') return 'Server running on http://localhost:3000';
    if (command === 'npm run build') return 'Build completed successfully';
    if (command === 'npm test') return '✓ All tests passed';
    if (command.startsWith('git')) return 'Git operation completed';
    if (command.startsWith('cat')) return 'File contents...';
    if (command.startsWith('grep')) return 'Match found';

    return `Command executed: ${command}`;
  };

  const getRiskColor = (level: string) => {
    const colors: Record<string, string> = {
      safe: 'text-green-400',
      moderate: 'text-yellow-400',
      high: 'text-orange-400',
      dangerous: 'text-red-500',
    };
    return colors[level] || 'text-gray-400';
  };

  const getRiskBg = (level: string) => {
    const colors: Record<string, string> = {
      safe: 'bg-green-900/20 border-green-700',
      moderate: 'bg-yellow-900/20 border-yellow-700',
      high: 'bg-orange-900/20 border-orange-700',
      dangerous: 'bg-red-900/20 border-red-700',
    };
    return colors[level] || 'bg-gray-800 border-gray-700';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Terminal</span>
          <span className="text-xs text-gray-400">Ctrl+` to toggle</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('normal')}
            className={`px-2 py-1 rounded text-xs ${mode === 'normal' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Normal
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`px-2 py-1 rounded text-xs ${mode === 'ai' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            AI Mode
          </button>
          <button
            onClick={() => setOutput([])}
            className="px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div ref={outputRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {output.map((line, i) => (
          <div key={i}>
            {line.type === 'input' && (
              <div className="text-green-400">
                <span className="text-blue-400">$</span> {line.content}
              </div>
            )}

            {line.type === 'command' && (
              <div className="text-gray-300">{line.content}</div>
            )}

            {line.type === 'output' && (
              <div className="text-gray-400 whitespace-pre-wrap">{line.content}</div>
            )}

            {line.type === 'error' && (
              <div className="text-red-400">{line.content}</div>
            )}

            {line.type === 'info' && (
              <div className="text-blue-400">{line.content}</div>
            )}

            {line.type === 'translation' && (
              <div className={`p-3 rounded border ${getRiskBg(line.riskAnalysis.riskLevel)}`}>
                <div className="font-medium mb-2">AI Translation:</div>
                <div className="text-sm text-gray-300 mb-2">{line.translation.explanation}</div>
                <div className="space-y-1">
                  {line.translation.commands.map((cmd, j) => (
                    <div key={j} className="text-green-400">
                      $ {cmd}
                    </div>
                  ))}
                </div>
                <div className={`mt-2 text-xs ${getRiskColor(line.riskAnalysis.riskLevel)}`}>
                  Risk Level: {line.riskAnalysis.riskLevel.toUpperCase()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {line.riskAnalysis.reasons.join(', ')}
                </div>
              </div>
            )}

            {line.type === 'ai-command' && (
              <div className="p-3 rounded border border-purple-700 bg-purple-900/20">
                <div className="font-medium mb-2">AI Command: {line.content}</div>
                <div className="text-sm text-gray-300">{line.aiResult.action}</div>
                {line.aiResult.command && (
                  <div className="text-green-400 mt-1">$ {line.aiResult.command}</div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Pending Command Approval */}
        {pendingCommand && (
          <div className={`p-4 rounded border ${getRiskBg(pendingCommand.riskLevel)}`}>
            <div className="font-medium mb-2">⚠️ Command requires approval</div>
            <div className="text-sm text-gray-300 mb-2">{pendingCommand.explanation}</div>
            <div className="space-y-1 mb-3">
              {pendingCommand.commands.map((cmd, i) => (
                <div key={i} className="text-green-400">
                  $ {cmd}
                </div>
              ))}
            </div>
            <div className={`text-xs mb-3 ${getRiskColor(pendingCommand.riskLevel)}`}>
              Risk Level: {pendingCommand.riskLevel.toUpperCase()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={approveCommand}
                className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
              >
                Approve
              </button>
              <button
                onClick={rejectCommand}
                className="flex-1 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-green-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInput}
            placeholder={mode === 'ai' ? 'Say what you want to do...' : 'Enter command...'}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
            autoFocus
          />
          {mode === 'ai' && <span className="text-xs text-blue-400">AI Mode</span>}
        </div>
      </div>

      {/* Quick Commands */}
      <div className="px-3 py-2 border-t border-gray-700 bg-gray-800 text-xs">
        <div className="text-gray-400 mb-1">Quick AI Commands:</div>
        <div className="flex flex-wrap gap-2">
          <span className="text-purple-400">/explain</span>
          <span className="text-purple-400">/run</span>
          <span className="text-purple-400">/fix</span>
          <span className="text-purple-400">/test</span>
          <span className="text-purple-400">/build</span>
          <span className="text-purple-400">/install</span>
          <span className="text-purple-400">/search</span>
          <span className="text-purple-400">/find</span>
          <span className="text-purple-400">/preview</span>
          <span className="text-purple-400">/stop</span>
        </div>
      </div>
    </div>
  );
}

interface TerminalOutput {
  type: 'input' | 'command' | 'output' | 'error' | 'info' | 'translation' | 'ai-command';
  content: string;
  translation?: CommandTranslation;
  riskAnalysis?: RiskAnalysis;
  aiResult?: AICommandResult;
}
