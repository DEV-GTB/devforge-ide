import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCheck,
  Code2,
  Copy,
  CornerDownRight,
  ExternalLink,
  Image as ImageIcon,
  RotateCcw,
  Send,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { FileNode } from '../core/filesystem';
import { InspectedElement } from '../core/preview';
import { ProblemItem } from '../core/workspace';
import { askNexus, NexusChatResult, NexusImage, NexusSource, FileOperation, generateNexusImage } from '../services/nexusChat';
import { AiFileOpsReview } from './AiFileOpsReview';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  codeBlock?: { language: string; code: string; filename?: string };
  route?: { id: string; label: string };
  sources?: NexusSource[];
  images?: NexusImage[];
  fileOps?: FileOperation[];
  error?: boolean;
  retryPrompt?: string;
  timestamp?: string;
}

interface ContinuationCheckpoint {
  command: string;
  lastOutput: string;
  route?: string;
  updatedAt: string;
}

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileNode[];
  activeFile: FileNode | null;
  onApplyDiff: (filename: string, code: string) => void;
  onApplyFileOperations?: (operations: FileOperation[]) => void;
  inspectedElement?: InspectedElement | null;
  problems?: ProblemItem[];
  draftPrompt?: string | null;
  onDraftPromptConsumed?: () => void;
}

const MESSAGES_STORAGE_KEY = 'devforge_copilot_messages';
const CHECKPOINT_STORAGE_KEY = 'devforge_copilot_checkpoint';

function loadMessages(): CopilotMessage[] {
  try {
    const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadCheckpoint(): ContinuationCheckpoint | null {
  try {
    const saved = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function timestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CopilotPanel({
  isOpen,
  onClose,
  files,
  activeFile,
  onApplyDiff,
  onApplyFileOperations,
  inspectedElement = null,
  problems = [],
  draftPrompt = null,
  onDraftPromptConsumed
}: CopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>(loadMessages);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<ContinuationCheckpoint | null>(loadCheckpoint);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    try {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages.slice(-60)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (!draftPrompt) return;
    setInputPrompt(draftPrompt);
    onDraftPromptConsumed?.();
  }, [draftPrompt, onDraftPromptConsumed]);

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (customPrompt?: string, isContinuation = false) => {
    const text = (customPrompt ?? inputPrompt).trim();
    if (!text || isLoading) return;

    const originalCommand = isContinuation ? checkpoint?.command || text : text;
    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: timestamp()
    };
    setMessages((previous) => [...previous, userMessage]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    let responseRoute: CopilotMessage['route'];
    try {
      const result: NexusChatResult = await askNexus({
        message: text,
        history: messages
          .slice(-6)
          .map((message) => ({ role: message.role, text: message.content })),
        files,
        activeFile,
        inspectedElement,
        problems
      });
      responseRoute = { id: result.route.id, label: `${result.route.label} · ${result.route.provider}` };
      const codeBlock = result.codeBlock ? {
        language: result.codeBlock.language,
        filename: result.codeBlock.filename,
        code: result.codeBlock.code
      } : undefined;
      const assistantMessage: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.text,
        codeBlock,
        route: responseRoute,
        sources: result.sources,
        images: result.images,
        fileOps: result.fileOps,
        timestamp: timestamp()
      };
      if (!assistantMessage.content && codeBlock) {
        assistantMessage.content = 'Proposed implementation. Review it before applying.';
      }
      if (!assistantMessage.content && assistantMessage.fileOps?.length) {
        assistantMessage.content = 'I prepared the following file changes. Review and approve what you want to apply.';
      }
      if (!assistantMessage.content && assistantMessage.images?.length) {
        assistantMessage.content = 'Here are the images I found.';
      }
      setMessages((previous) => [...previous, assistantMessage]);

      const nextCheckpoint: ContinuationCheckpoint = {
        command: originalCommand,
        lastOutput: `${assistantMessage.content}${codeBlock ? `\n\n${codeBlock.filename}:\n${codeBlock.code}` : ''}`.slice(0, 6000),
        route: assistantMessage.route?.label,
        updatedAt: new Date().toISOString()
      };
      setCheckpoint(nextCheckpoint);
      localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(nextCheckpoint));
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Unknown AI assistant error.';
      console.error('AI assistant failed:', error);
      setMessages((previous) => [...previous, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `I couldn't complete this request: ${reason} Your command is preserved; please retry.`,
        route: responseRoute,
        error: true,
        retryPrompt: text,
        timestamp: timestamp()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    const prompt = inputPrompt.trim() || 'abstract neon gradient artwork, high detail';
    if (isLoading) return;
    setMessages((previous) => [...previous, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `Draw an image: ${prompt}`,
      timestamp: timestamp()
    }]);
    setInputPrompt('');
    setIsLoading(true);
    try {
      const result = await generateNexusImage(prompt);
      if (result.image) {
        setMessages((previous) => [...previous, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Here is the image I generated.',
          images: [{ url: result.image as string, title: prompt }],
          route: { id: 'image', label: 'Nexus AI · Image' },
          timestamp: timestamp()
        }]);
      } else {
        setMessages((previous) => [...previous, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `I couldn't generate that image: ${result.error || 'image generation is unavailable right now'}.`,
          error: true,
          timestamp: timestamp()
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (!checkpoint) return;
    const prompt = `Continue from the saved checkpoint.\n\nOriginal user command: ${checkpoint.command}\n\nLast AI output and stopping point: ${checkpoint.lastOutput}\n\nInspect the current workspace because changes may already have been applied. Identify the next incomplete step, continue without repeating completed work, and state what is complete and what remains.`;
    handleSend(prompt, true);
  };

  const handleActionClick = (action: string) => {
    if (action === 'Draw Image') {
      handleGenerateImage();
      return;
    }
    const filename = activeFile?.name || 'the current workspace';
    if (action === 'Explain') handleSend(`Explain the structure and behavior of ${filename}.`);
    if (action === 'Refactor') handleSend(`Refactor ${filename} for clarity and type safety while preserving its behavior.`);
    if (action === 'Fix') {
      const diagnosticContext = problems.length
        ? `Diagnose and fix the following workspace diagnostics at their reported locations. Explain the root cause, make the smallest correct change, and do not claim verification unless it was run:\n${problems.map((problem) => `${problem.severity.toUpperCase()} ${problem.file}:${problem.line}:${problem.column} ${problem.code ? `[${problem.code}] ` : ''}${problem.message}`).join('\n')}`
        : `Inspect ${filename} for reproducible bugs and type errors. Ground findings in the source and distinguish confirmed issues from possibilities.`;
      handleSend(diagnosticContext);
    }
    if (action === 'Generate Tests') handleSend(`Create focused tests for ${filename}, including relevant edge cases. Use the test framework configured in the workspace.`);
  };

  const latestAssistantId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;

  if (!isOpen) return null;

  return (
    <div id="copilot-right-panel" className="w-80 sm:w-96 bg-[#18181b] border-l border-[#27272a] flex flex-col h-full overflow-hidden select-none z-20 shrink-0">
      <div className="flex items-center justify-between px-3 py-2 bg-[#121214] border-b border-[#27272a] text-xs">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-300">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>NEXUS AI</span>
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          {checkpoint && (
            <button onClick={handleContinue} title={`Continue: ${checkpoint.command}`} className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-800 rounded text-emerald-300 transition">
              <CornerDownRight className="w-3.5 h-3.5" />
              <span className="text-[10px]">Continue</span>
            </button>
          )}
          <button
            onClick={() => {
              setMessages([]);
              setCheckpoint(null);
              localStorage.removeItem(MESSAGES_STORAGE_KEY);
              localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
            }}
            title="Reset Conversation"
            className="p-1 hover:bg-zinc-800 rounded hover:text-zinc-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} title="Close AI panel" className="p-1 hover:bg-zinc-800 rounded hover:text-zinc-200 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 bg-[#151518] border-b border-[#27272a] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { label: 'Explain', icon: Code2 },
          { label: 'Refactor', icon: Zap },
          { label: 'Fix', icon: CheckCheck },
          { label: 'Generate Tests', icon: Bot },
          { label: 'Draw Image', icon: ImageIcon }
        ].map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => handleActionClick(label)} disabled={isLoading} className="px-2.5 py-1 text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded border border-zinc-700/50 transition whitespace-nowrap flex items-center gap-1 shrink-0">
            <Icon className="w-3 h-3 text-blue-400" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {inspectedElement && (
        <button
          onClick={() => setInputPrompt(`Improve the selected preview element <${inspectedElement.tagName}>${inspectedElement.id ? `#${inspectedElement.id}` : ''}${inspectedElement.className ? `.${inspectedElement.className.trim().split(/\s+/).join('.')}` : ''}. Preserve its behavior and focus on the visual change I describe: `)}
          className="m-2 mb-0 px-2.5 py-2 text-left text-[11px] text-sky-200 bg-sky-950/30 border border-sky-900/60 rounded hover:bg-sky-950/50"
        >
          Selected: &lt;{inspectedElement.tagName}&gt; {inspectedElement.id ? `#${inspectedElement.id}` : inspectedElement.className ? `.${inspectedElement.className.trim().split(/\s+/)[0]}` : ''}. Click to ask AI to edit it.
        </button>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
        {messages.length === 0 && (
          <div className="py-8 px-3 text-center">
            <Sparkles className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-zinc-200 text-xs font-semibold">What are we building?</p>
            <p className="text-zinc-500 text-[11px] mt-1">Server-powered Nexus AI with an always-on offline fallback — completely free, no account or setup required.</p>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-500 font-mono">
              <span>{message.role === 'user' ? 'You' : 'Nexus AI'}</span>
              {message.route && <span className="text-blue-400">· {message.route.label}</span>}
              {message.timestamp && <span>· {message.timestamp}</span>}
            </div>
            <div className={`rounded-lg p-3 max-w-full text-zinc-200 leading-relaxed ${message.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30 text-zinc-100' : 'bg-[#1e1e24] border border-[#2e2e38]'}`}>
              <p className="whitespace-pre-wrap text-[12px]">{message.content}</p>
              {message.images && message.images.length > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                  {message.images.slice(0, 6).map((image, index) => (
                    <a
                      key={`${message.id}-img-${index}`}
                      href={image.source || image.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group relative block overflow-hidden rounded border border-[#33333d] bg-[#121214]"
                      title={image.title || 'Open image source'}
                    >
                      <img
                        src={image.url}
                        alt={image.title || 'Result image'}
                        loading="lazy"
                        className="h-24 w-full object-cover transition group-hover:opacity-90"
                        onError={(event) => { (event.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                      />
                    </a>
                  ))}
                </div>
              )}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2.5 space-y-1 border-t border-[#2a2a34] pt-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    <ExternalLink className="w-3 h-3" /> Sources
                  </div>
                  {message.sources.slice(0, 8).map((source, index) => (
                    <a
                      key={`${message.id}-src-${index}`}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-1.5 truncate text-[11px] text-sky-300 transition hover:text-sky-200"
                    >
                      <span className="text-zinc-500">[{index + 1}]</span>
                      <span className="truncate">{source.title}</span>
                      {source.domain && <span className="shrink-0 text-zinc-600">· {source.domain}</span>}
                    </a>
                  ))}
                </div>
              )}
              {message.error && message.retryPrompt && (
                <button onClick={() => handleSend(message.retryPrompt)} disabled={isLoading} className="mt-2 inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 disabled:opacity-50">
                  <AlertCircle className="w-3 h-3" /> Retry request
                </button>
              )}
              {message.fileOps && message.fileOps.length > 0 && (
                <AiFileOpsReview
                  operations={message.fileOps}
                  onApply={(operations) => onApplyFileOperations?.(operations)}
                />
              )}
              {message.codeBlock && !(message.fileOps && message.fileOps.length > 0) && (
                <div className="mt-2.5 rounded border border-[#33333d] bg-[#121214] overflow-hidden">
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#1a1a20] border-b border-[#2a2a34] text-[11px] font-mono text-zinc-400">
                    <span className="truncate">{message.codeBlock.filename || message.codeBlock.language}</span>
                    <button onClick={() => handleCopy(message.codeBlock!.code, message.id)} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition" title="Copy code">
                      {copiedId === message.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <pre className="p-2.5 font-mono text-[11px] overflow-x-auto text-zinc-300 leading-relaxed"><code>{message.codeBlock.code}</code></pre>
                  <div className="px-2.5 py-1.5 bg-[#16161c] border-t border-[#2a2a34] flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono">{message.codeBlock.language.toUpperCase()}</span>
                    <button onClick={() => onApplyDiff(message.codeBlock!.filename || activeFile?.path || 'src/App.tsx', message.codeBlock!.code)} className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold transition">
                      <Check className="w-3 h-3" /> Apply to workspace
                    </button>
                  </div>
                </div>
              )}
            </div>
            {message.role === 'assistant' && message.id === latestAssistantId && checkpoint && !message.error && (
              <button onClick={handleContinue} className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded border border-emerald-800/70 text-emerald-300 hover:bg-emerald-950/40 transition">
                <CornerDownRight className="w-3 h-3" /> Continue from last point
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 p-2.5 bg-[#1e1e24] rounded-lg border border-[#2e2e38] text-zinc-400 text-xs">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>Nexus AI is thinking…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2.5 bg-[#121214] border-t border-[#27272a]">
        <form onSubmit={(event) => { event.preventDefault(); handleSend(); }} className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] focus-within:border-blue-500 rounded px-2 py-1.5 transition">
          <input
            type="text"
            placeholder="Ask Nexus AI to create a file, website, to-do app, or game..."
            value={inputPrompt}
            onChange={(event) => setInputPrompt(event.target.value)}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-hidden text-xs text-zinc-100 placeholder-zinc-500"
          />
          <button type="submit" disabled={!inputPrompt.trim() || isLoading} className="p-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded transition" title="Send prompt">
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-zinc-500 font-mono">
          <span>Active: {activeFile?.name || 'All files'}</span>
          <span>{checkpoint?.route ? `${checkpoint.route}` : 'Server AI · free, offline fallback built in'}</span>
        </div>
      </div>
    </div>
  );
}