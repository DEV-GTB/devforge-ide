import React, { useState } from 'react';
import { 
  Terminal, 
  Eye, 
  FolderTree, 
  Bug, 
  GitBranch, 
  Sparkles, 
  Languages, 
  Blocks, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  Play, 
  FileCode, 
  Folder, 
  Settings, 
  HelpCircle, 
  Github, 
  ExternalLink,
  Code2,
  Search,
  Sliders,
  Maximize2,
  Cpu,
  Layers,
  Shield,
  Laptop
} from 'lucide-react';

interface LandingPageProps {
  onOpenIDE: () => void;
}

export function LandingPage({ onOpenIDE }: LandingPageProps) {
  // Miniature IDE preview interactive state
  const [activePreviewTab, setActivePreviewTab] = useState<'App.tsx' | 'index.html' | 'style.css'>('App.tsx');
  const [isSrcOpen, setIsSrcOpen] = useState(true);
  const [isComponentsOpen, setIsComponentsOpen] = useState(true);
  const [isPublicOpen, setIsPublicOpen] = useState(false);

  // Workflow steps definition
  const workflowSteps = [
    {
      step: '01',
      title: 'CREATE',
      tag: 'Scaffold',
      desc: 'Instant workspace generation with modern project structures and zero local environment setup.'
    },
    {
      step: '02',
      title: 'CODE',
      tag: 'Monaco Engine',
      desc: 'Precision code editing with type definitions, IntelliSense, and keyboard-centric navigation.'
    },
    {
      step: '03',
      title: 'RUN',
      tag: 'Cloud Runtime',
      desc: 'Integrated development tasks, fast builds, and persistent process execution in shell.'
    },
    {
      step: '04',
      title: 'PREVIEW',
      tag: 'Hot Reload',
      desc: 'Immediate sub-millisecond DOM reflection across desktop, tablet, and mobile device viewports.'
    },
    {
      step: '05',
      title: 'DEBUG',
      tag: 'Diagnostics',
      desc: 'Interactive runtime inspection, stack traces, console logging, and breakpoint evaluations.'
    },
    {
      step: '06',
      title: 'IMPROVE',
      tag: 'AI Intelligence',
      desc: 'Workspace-aware code review, automated bug fixes, refactoring suggestions, and unit tests.'
    }
  ];

  // 9 Major Future Capabilities (Presented as planned capabilities)
  const features = [
    {
      icon: FileCode,
      title: 'Powerful Code Editor',
      status: 'Planned / Foundation Ready',
      desc: 'Professional multi-buffer editor powered by the Monaco engine, featuring syntax highlighting, multi-cursor editing, bracket colorization, and code folding.'
    },
    {
      icon: FolderTree,
      title: 'Project Explorer',
      status: 'Planned / Foundation Ready',
      desc: 'Hierarchical file tree management with drag-and-drop organization, nested folder tracking, file creation, deletion, and cross-session workspace persistence.'
    },
    {
      icon: Terminal,
      title: 'Integrated Terminal',
      status: 'Planned / Foundation Ready',
      desc: 'High-performance terminal emulator supporting development scripts, package installations, build commands, and multi-session split view.'
    },
    {
      icon: Eye,
      title: 'Live Preview',
      status: 'Planned / Foundation Ready',
      desc: 'Real-time isolated web preview with live DOM element inspection, computed CSS style analysis, and responsive screen viewports.'
    },
    {
      icon: Bug,
      title: 'Debugging',
      status: 'Planned / Architecture Stage',
      desc: 'Source-mapped breakpoint debugging, call stack navigation, variable state watches, and runtime expression evaluation in an interactive debug console.'
    },
    {
      icon: GitBranch,
      title: 'Git & Source Control',
      status: 'Planned / Foundation Ready',
      desc: 'Visual git branch switching, visual diff inspection, staging, commit creation, and remote repository synchronization workflows.'
    },
    {
      icon: Sparkles,
      title: 'Nexus AI Studio',
      status: 'Planned / Intelligence Layer',
      desc: 'Workspace-aware assistant that parses your full project files, proposes reviewable unified diffs, fixes compiler errors, and writes tests.'
    },
    {
      icon: Languages,
      title: 'Multi-language Support',
      status: 'Planned / LSP Matrix',
      desc: 'Extensible language server integration for TypeScript, JavaScript, HTML, CSS, JSON, Python, Rust, and Go with syntax verification.'
    },
    {
      icon: Blocks,
      title: 'Extensions',
      status: 'Planned / Plugin API',
      desc: 'Modular plugin architecture for custom language grammars, linters, formatter configurations, and community-driven workbench themes.'
    }
  ];

  return (
    <div className="visitor-page min-h-screen bg-[#0c0d12] text-[#d4d4d8] font-sans antialiased selection:bg-[#3b82f6] selection:text-white overflow-y-auto scroll-smooth">
      {/* 1. STICKY NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0c0d12]/90 backdrop-blur-md border-b border-[#1f212d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#161822] border border-[#272a3b] flex items-center justify-center text-[#3b82f6] shadow-xs">
              <Code2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white font-mono">DevForge</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1f212d] text-[#9ca3af] border border-[#2e3245]">
                IDE
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-7 text-xs font-medium text-[#9ca3af]">
            <a href="#product" className="hover:text-white transition-colors">Product</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenIDE}
              className="hidden sm:inline-flex items-center text-xs text-[#9ca3af] hover:text-white px-2.5 py-1.5 rounded transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onOpenIDE}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-98 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>Open IDE</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-blue-700/60 rounded border border-blue-400/30 text-blue-100">
                ⌘↵
              </kbd>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="product" className="visitor-hero relative isolate pt-6 sm:pt-8 pb-8 px-4 sm:px-6 max-w-7xl mx-auto text-center">
        <div className="visitor-grid" aria-hidden="true" />
        <div className="visitor-signal visitor-signal-app" aria-hidden="true">APP / HOT RELOAD</div>
        <div className="visitor-signal visitor-signal-game" aria-hidden="true">GAME LOOP / 60 FPS</div>
        {/* Subtle Release Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161822] border border-[#272a3b] text-[11px] text-[#9ca3af] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
          <span className="font-mono text-[#d4d4d8]">DevForge Developer Preview</span>
          <span className="text-[#6b7280]">•</span>
          <span>Foundation Shell v1.0</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 max-w-4xl mx-auto leading-[1.12]">
          Your entire development workspace,{' '}
          <span className="text-[#60a5fa]">in one place.</span>
        </h1>

        {/* Supporting Text */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#9ca3af] mb-6 leading-relaxed font-normal">
          The IDE provides coding, projects, preview, terminal, debugging and AI-assisted development in one unified workspace — built directly for the modern browser.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
          <button
            onClick={onOpenIDE}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-98 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Open IDE</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-700/70 rounded border border-blue-400/30 text-blue-100 ml-1">
              ⌘ Enter
            </kbd>
          </button>

          <a
            href="#features"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-[#161822] hover:bg-[#1f212d] active:scale-98 text-[#d4d4d8] hover:text-white text-xs sm:text-sm font-medium border border-[#272a3b] transition-all"
          >
            <span>Explore Features</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#9ca3af]" />
          </a>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="hidden sm:flex items-center justify-center gap-1.5 text-[11px] text-[#6b7280] font-mono">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#161822] border border-[#272a3b] text-[#9ca3af] text-[10px]">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-[#161822] border border-[#272a3b] text-[#9ca3af] text-[10px]">Enter</kbd>
          <span>to open IDE instantly</span>
        </div>

        {/* 3. HERO IDE PREVIEW (Realistic miniature version of actual IDE) */}
        <div className="visitor-app-preview mt-6 rounded-lg border border-[#232634] bg-[#111218] shadow-2xl overflow-hidden text-left max-w-5xl mx-auto">
          {/* Top Window / Menu Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#0e0f14] border-b border-[#232634] text-[11px] text-[#9ca3af] select-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/80 inline-block" />
              </div>
              <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-[#232634] text-[11px] font-mono text-[#71717a]">
                <span>File</span>
                <span>Edit</span>
                <span>Selection</span>
                <span>View</span>
                <span>Go</span>
                <span>Run</span>
                <span>Terminal</span>
                <span>Help</span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-[#9ca3af]">devforge-workspace</span>
              <span className="text-[#52525b]">—</span>
              <span className="text-white font-medium">{activePreviewTab}</span>
            </div>

            <button
              onClick={onOpenIDE}
              className="px-2 py-0.5 rounded bg-[#1f212d] hover:bg-[#2e3245] text-white text-[10px] font-mono border border-[#2e3245] transition flex items-center gap-1 cursor-pointer"
            >
              <span>Launch Fullscreen</span>
              <Maximize2 className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* IDE Workbench Layout Grid */}
          <div className="flex h-[200px] sm:h-[230px] lg:h-[250px] text-xs font-mono select-none overflow-hidden">
            {/* Activity Bar */}
            <div className="w-10 bg-[#0e0f14] border-r border-[#232634] flex flex-col items-center py-2 justify-between shrink-0">
              <div className="flex flex-col items-center space-y-3 text-[#71717a]">
                <div className="p-1.5 rounded text-white bg-[#1f212d] border-l-2 border-blue-500">
                  <FolderTree className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="p-1.5 hover:text-white cursor-pointer">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <div className="p-1.5 hover:text-white cursor-pointer">
                  <GitBranch className="w-3.5 h-3.5" />
                </div>
                <div className="p-1.5 hover:text-white cursor-pointer">
                  <Play className="w-3.5 h-3.5" />
                </div>
                <div className="p-1.5 hover:text-white cursor-pointer">
                  <Blocks className="w-3.5 h-3.5" />
                </div>
                <div className="p-1.5 hover:text-white cursor-pointer">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </div>
              <div className="text-[#71717a] hover:text-white cursor-pointer">
                <Settings className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Explorer Sidebar */}
            <div className="w-48 sm:w-52 bg-[#111218] border-r border-[#232634] p-2 flex flex-col shrink-0 overflow-y-auto">
              <div className="text-[10px] font-bold text-[#71717a] tracking-wider uppercase px-1 pb-1 mb-1 border-b border-[#1f212d] flex items-center justify-between">
                <span>EXPLORER</span>
                <span className="text-[9px] text-[#52525b]">PROJECT</span>
              </div>

              <div className="space-y-0.5 text-[11px] text-[#a1a1aa]">
                {/* Root project heading */}
                <div className="flex items-center gap-1 font-semibold text-white px-1 py-0.5">
                  <ChevronDown className="w-3 h-3 text-[#71717a]" />
                  <span>PROJECT</span>
                </div>

                {/* src folder */}
                <div className="pl-3">
                  <div 
                    onClick={() => setIsSrcOpen(!isSrcOpen)}
                    className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-[#1f212d] text-[#d4d4d8] cursor-pointer"
                  >
                    {isSrcOpen ? <ChevronDown className="w-2.5 h-2.5 text-[#71717a]" /> : <ChevronRight className="w-2.5 h-2.5 text-[#71717a]" />}
                    <Folder className="w-3 h-3 text-blue-400" />
                    <span>src</span>
                  </div>

                  {isSrcOpen && (
                    <div className="pl-3 space-y-0.5 border-l border-[#1f212d] ml-1.5 my-0.5">
                      {/* components folder */}
                      <div 
                        onClick={() => setIsComponentsOpen(!isComponentsOpen)}
                        className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-[#1f212d] text-[#d4d4d8] cursor-pointer"
                      >
                        {isComponentsOpen ? <ChevronDown className="w-2.5 h-2.5 text-[#71717a]" /> : <ChevronRight className="w-2.5 h-2.5 text-[#71717a]" />}
                        <Folder className="w-3 h-3 text-blue-400" />
                        <span>components</span>
                      </div>

                      {/* App.tsx */}
                      <div
                        onClick={() => setActivePreviewTab('App.tsx')}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer ${
                          activePreviewTab === 'App.tsx' ? 'bg-[#1f212d] text-white font-medium' : 'hover:bg-[#161822]'
                        }`}
                      >
                        <span className="text-[#3b82f6] font-bold text-[10px]">TS</span>
                        <span>App.tsx</span>
                      </div>

                      {/* main.tsx */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#161822] cursor-pointer">
                        <span className="text-[#3b82f6] font-bold text-[10px]">TS</span>
                        <span>main.tsx</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* public folder */}
                <div className="pl-3">
                  <div 
                    onClick={() => setIsPublicOpen(!isPublicOpen)}
                    className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-[#1f212d] text-[#d4d4d8] cursor-pointer"
                  >
                    {isPublicOpen ? <ChevronDown className="w-2.5 h-2.5 text-[#71717a]" /> : <ChevronRight className="w-2.5 h-2.5 text-[#71717a]" />}
                    <Folder className="w-3 h-3 text-amber-400" />
                    <span>public</span>
                  </div>
                  {isPublicOpen && (
                    <div className="pl-4 py-0.5 text-[10px] text-[#71717a]">
                      <span>logo.svg</span>
                    </div>
                  )}
                </div>

                {/* index.html */}
                <div
                  onClick={() => setActivePreviewTab('index.html')}
                  className={`flex items-center gap-1.5 px-3 py-0.5 rounded cursor-pointer ${
                    activePreviewTab === 'index.html' ? 'bg-[#1f212d] text-white font-medium' : 'hover:bg-[#161822]'
                  }`}
                >
                  <span className="text-[#f97316] font-bold text-[10px]">&lt;&gt;</span>
                  <span>index.html</span>
                </div>

                {/* package.json */}
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded hover:bg-[#161822] cursor-pointer">
                  <span className="text-[#eab308] font-bold text-[10px]">{'{}'}</span>
                  <span>package.json</span>
                </div>

                {/* README.md */}
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded hover:bg-[#161822] cursor-pointer">
                  <span className="text-[#38bdf8] font-bold text-[10px]">M↓</span>
                  <span>README.md</span>
                </div>
              </div>
            </div>

            {/* Central Editor Area & Bottom Terminal */}
            <div className="flex-1 flex flex-col bg-[#14151e] overflow-hidden">
              {/* Editor Tab Bar */}
              <div className="flex items-center justify-between bg-[#0e0f14] border-b border-[#232634] h-8 px-1">
                <div className="flex items-center h-full space-x-1">
                  {/* index.html tab */}
                  <div
                    onClick={() => setActivePreviewTab('index.html')}
                    className={`flex items-center gap-1.5 h-full px-3 text-[11px] border-r border-[#232634] cursor-pointer ${
                      activePreviewTab === 'index.html'
                        ? 'bg-[#14151e] text-white border-t-2 border-t-blue-500 font-medium'
                        : 'text-[#71717a] hover:text-white'
                    }`}
                  >
                    <span className="text-[#f97316] font-bold text-[10px]">&lt;&gt;</span>
                    <span>index.html</span>
                  </div>

                  {/* App.tsx tab */}
                  <div
                    onClick={() => setActivePreviewTab('App.tsx')}
                    className={`flex items-center gap-1.5 h-full px-3 text-[11px] border-r border-[#232634] cursor-pointer ${
                      activePreviewTab === 'App.tsx'
                        ? 'bg-[#14151e] text-white border-t-2 border-t-blue-500 font-medium'
                        : 'text-[#71717a] hover:text-white'
                    }`}
                  >
                    <span className="text-[#3b82f6] font-bold text-[10px]">TS</span>
                    <span>App.tsx</span>
                  </div>

                  {/* style.css tab with unsaved indicator */}
                  <div
                    onClick={() => setActivePreviewTab('style.css')}
                    className={`flex items-center gap-1.5 h-full px-3 text-[11px] border-r border-[#232634] cursor-pointer ${
                      activePreviewTab === 'style.css'
                        ? 'bg-[#14151e] text-white border-t-2 border-t-blue-500 font-medium'
                        : 'text-[#71717a] hover:text-white'
                    }`}
                  >
                    <span className="text-[#38bdf8] font-bold text-[10px]">#</span>
                    <span>style.css</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" title="Unsaved changes" />
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[#71717a] text-[10px] pr-2">
                  <span className="hidden sm:inline">TypeScript 5.4</span>
                </div>
              </div>

              {/* Breadcrumb Path */}
              <div className="flex items-center px-3 py-1 bg-[#111218] border-b border-[#232634] text-[10px] text-[#71717a]">
                <span>project</span>
                <ChevronRight className="w-2.5 h-2.5 mx-1 text-[#52525b]" />
                <span>src</span>
                <ChevronRight className="w-2.5 h-2.5 mx-1 text-[#52525b]" />
                <span className="text-white font-medium">{activePreviewTab}</span>
                <ChevronRight className="w-2.5 h-2.5 mx-1 text-[#52525b]" />
                <span className="text-[#9ca3af]">function App()</span>
              </div>

              {/* Code Surface with line numbers, code folding, syntax highlight, cursor */}
              <div className="flex-1 p-3 overflow-hidden flex relative font-mono text-[11px] leading-relaxed">
                {/* Line numbers + folding indicators */}
                <div className="text-[#52525b] pr-3 select-none text-right space-y-0.5 border-r border-[#232634] mr-3 shrink-0">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-end gap-1">
                      {i === 0 || i === 4 ? (
                        <ChevronDown className="w-2.5 h-2.5 text-[#71717a]" />
                      ) : (
                        <span className="w-2.5" />
                      )}
                      <span>{i + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Simulated Code Content */}
                <div className="flex-1 space-y-0.5 text-[#d4d4d8] overflow-x-auto">
                  {activePreviewTab === 'App.tsx' && (
                    <>
                      <div>
                        <span className="text-[#c084fc]">import</span> React, {'{'} <span className="text-[#60a5fa]">useState</span> {'}'} <span className="text-[#c084fc]">from</span> <span className="text-[#86efac]">'react'</span>;
                      </div>
                      <div>
                        <span className="text-[#c084fc]">import</span> {'{'} <span className="text-[#60a5fa]">Header</span> {'}'} <span className="text-[#c084fc]">from</span> <span className="text-[#86efac]">'./components/Header'</span>;
                      </div>
                      <div className="text-[#52525b]">// DevForge Workspace Component</div>
                      <div>
                        <span className="text-[#c084fc]">export function</span> <span className="text-[#fde047]">App</span>() {'{'}
                      </div>
                      <div className="pl-4">
                        <span className="text-[#c084fc]">const</span> [count, setCount] = <span className="text-[#60a5fa]">useState</span>(<span className="text-[#93c5fd]">0</span>);
                      </div>
                      <div className="pl-4">
                        <span className="text-[#c084fc]">return</span> (
                      </div>
                      <div className="pl-8 text-[#93c5fd]">
                        &lt;<span className="text-[#60a5fa]">main</span> <span className="text-[#93c5fd]">className</span>=<span className="text-[#86efac]">"workspace-container"</span>&gt;
                      </div>
                      <div className="pl-12 text-[#93c5fd]">
                        &lt;<span className="text-[#fde047]">Header</span> <span className="text-[#93c5fd]">status</span>=<span className="text-[#86efac]">"Active"</span> /&gt;
                      </div>
                      <div className="pl-12 text-[#93c5fd] bg-[#1f212d]/60 rounded px-1 -mx-1 flex items-center">
                        <span>&lt;<span className="text-[#60a5fa]">button</span> <span className="text-[#93c5fd]">onClick</span>={'{'}() =&gt; setCount(c =&gt; c + 1){'}'}&gt;Count: {'{'}count{'}'}&lt;/<span className="text-[#60a5fa]">button</span>&gt;</span>
                        <span className="w-1.5 h-3.5 bg-blue-400 inline-block ml-1 animate-pulse" />
                      </div>
                      <div className="pl-8 text-[#93c5fd]">
                        &lt;/<span className="text-[#60a5fa]">main</span>&gt;
                      </div>
                      <div>{'}'}</div>
                    </>
                  )}

                  {activePreviewTab === 'index.html' && (
                    <>
                      <div>&lt;!<span className="text-[#60a5fa]">DOCTYPE</span> <span className="text-[#fde047]">html</span>&gt;</div>
                      <div>&lt;<span className="text-[#60a5fa]">html</span> <span className="text-[#93c5fd]">lang</span>=<span className="text-[#86efac]">"en"</span>&gt;</div>
                      <div className="pl-4">&lt;<span className="text-[#60a5fa]">head</span>&gt;</div>
                      <div className="pl-8">&lt;<span className="text-[#60a5fa]">title</span>&gt;DevForge Application&lt;/<span className="text-[#60a5fa]">title</span>&gt;</div>
                      <div className="pl-8">&lt;<span className="text-[#60a5fa]">link</span> <span className="text-[#93c5fd]">rel</span>=<span className="text-[#86efac]">"stylesheet"</span> <span className="text-[#93c5fd]">href</span>=<span className="text-[#86efac]">"/src/style.css"</span> /&gt;</div>
                      <div className="pl-4">&lt;/<span className="text-[#60a5fa]">head</span>&gt;</div>
                      <div className="pl-4">&lt;<span className="text-[#60a5fa]">body</span>&gt;</div>
                      <div className="pl-8">&lt;<span className="text-[#60a5fa]">div</span> <span className="text-[#93c5fd]">id</span>=<span className="text-[#86efac]">"root"</span>&gt;&lt;/<span className="text-[#60a5fa]">div</span>&gt;</div>
                      <div className="pl-8">&lt;<span className="text-[#60a5fa]">script</span> <span className="text-[#93c5fd]">type</span>=<span className="text-[#86efac]">"module"</span> <span className="text-[#93c5fd]">src</span>=<span className="text-[#86efac]">"/src/main.tsx"</span>&gt;&lt;/<span className="text-[#60a5fa]">script</span>&gt;</div>
                      <div className="pl-4">&lt;/<span className="text-[#60a5fa]">body</span>&gt;</div>
                      <div>&lt;/<span className="text-[#60a5fa]">html</span>&gt;</div>
                    </>
                  )}

                  {activePreviewTab === 'style.css' && (
                    <>
                      <div><span className="text-[#60a5fa]">body</span> {'{'}</div>
                      <div className="pl-4"><span className="text-[#93c5fd]">margin</span>: <span className="text-[#86efac]">0</span>;</div>
                      <div className="pl-4"><span className="text-[#93c5fd]">font-family</span>: <span className="text-[#86efac]">'Plus Jakarta Sans', sans-serif</span>;</div>
                      <div className="pl-4"><span className="text-[#93c5fd]">background</span>: <span className="text-[#86efac]">#0c0d12</span>;</div>
                      <div className="pl-4"><span className="text-[#93c5fd]">color</span>: <span className="text-[#86efac]">#d4d4d8</span>;</div>
                      <div>{'}'}</div>
                      <div className="mt-1"><span className="text-[#fde047]">.workspace-container</span> {'{'}</div>
                      <div className="pl-4"><span className="text-[#93c5fd]">display</span>: <span className="text-[#86efac]">flex</span>;</div>
                      <div className="pl-4"><span className="text-[#93c5fd]">padding</span>: <span className="text-[#86efac]">2rem</span>;</div>
                      <div>{'}'}</div>
                    </>
                  )}
                </div>

                {/* Minimap Area Representation */}
                <div className="w-14 bg-[#0e0f14]/50 border-l border-[#232634] p-1 select-none hidden sm:block shrink-0 opacity-60">
                  <div className="h-1 bg-blue-400/40 rounded mb-1 w-3/4" />
                  <div className="h-1 bg-[#52525b]/40 rounded mb-1 w-1/2" />
                  <div className="h-1 bg-[#52525b]/30 rounded mb-1 w-2/3" />
                  <div className="h-1 bg-yellow-400/30 rounded mb-1 w-4/5" />
                  <div className="h-1 bg-[#52525b]/40 rounded mb-1 w-1/3" />
                  <div className="h-1 bg-blue-400/30 rounded mb-1 w-1/2" />
                  <div className="h-1 bg-[#52525b]/30 rounded mb-1 w-3/4" />
                </div>
              </div>

              {/* Bottom Terminal Panel */}
              <div className="h-16 sm:h-20 bg-[#0e0f14] border-t border-[#232634] p-2 font-mono text-[10px] flex flex-col justify-between">
                <div className="flex items-center justify-between pb-1 border-b border-[#1f212d] text-[#71717a]">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold">TERMINAL</span>
                    <span>PROBLEMS (0)</span>
                    <span>OUTPUT</span>
                    <span>DEBUG CONSOLE</span>
                  </div>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>node v20.12.0</span>
                  </span>
                </div>

                <div className="space-y-0.5 text-[#a1a1aa] overflow-y-auto">
                  <div className="text-blue-400">$ npm run dev</div>
                  <div className="text-[#71717a]">Starting development server...</div>
                  <div className="text-emerald-400 font-semibold">Ready in 240ms on http://localhost:3000</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-1 bg-[#181926] text-[#a1a1aa] text-[9px] sm:text-[10px] font-mono border-t border-[#232634] select-none">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="flex items-center gap-1 text-white">
                <GitBranch className="w-3 h-3 text-blue-400" /> main
              </span>
              <span>✓</span>
              <span className="text-emerald-400">0 errors</span>
              <span className="hidden sm:inline text-amber-400">0 warnings</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="hidden sm:inline">Ln 24, Col 8</span>
              <span className="hidden md:inline">Spaces: 2</span>
              <span>UTF-8</span>
              <span className="hidden sm:inline text-white font-medium">TypeScript</span>
              <span className="sm:hidden text-white font-medium">TS</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FUTURE CAPABILITIES SECTION */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#1f212d]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#161822] text-[11px] font-mono text-[#3b82f6] border border-[#272a3b] mb-3">
            <span>ARCHITECTURAL ROADMAP</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Comprehensive IDE Capabilities
          </h2>
          <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
            Engineered from ground up to deliver low-latency coding, rapid execution, and seamless productivity inside your browser.
          </p>
        </div>

        {/* 9 Major Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div
                key={index}
                className="p-5 rounded bg-[#111218] border border-[#232634] hover:border-[#3b82f6]/40 transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-8 h-8 rounded bg-[#161822] border border-[#272a3b] text-[#3b82f6] flex items-center justify-center group-hover:border-[#3b82f6]/50 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-[#71717a] bg-[#161822] px-2 py-0.5 rounded border border-[#272a3b]">
                      {feat.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-[#60a5fa] transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-[#9ca3af] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. WORKFLOW SECTION: CREATE → CODE → RUN → PREVIEW → DEBUG → IMPROVE */}
      <section id="workflow" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#1f212d]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#161822] text-[11px] font-mono text-emerald-400 border border-[#272a3b] mb-3">
            <span>CONTINUOUS CYCLE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            The Complete Developer Workflow
          </h2>
          <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
            Zero toolchain switching. Move seamlessly through every development stage in a single unified workbench.
          </p>
        </div>

        {/* Linear workflow pipeline */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {workflowSteps.map((ws, i) => (
            <div
              key={i}
              className="p-4 rounded bg-[#111218] border border-[#232634] flex flex-col justify-between hover:border-[#3b82f6]/40 transition-colors relative"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#71717a] mb-2">
                  <span className="text-white font-bold">{ws.step}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#161822] text-[#9ca3af] border border-[#272a3b]">
                    {ws.tag}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mb-2 font-mono tracking-wider text-[#60a5fa]">
                  {ws.title}
                </h4>
                <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                  {ws.desc}
                </p>
              </div>
              {i < workflowSteps.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[#52525b]">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. CALL TO ACTION SECTION */}
      <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center border-t border-[#1f212d]">
        <div className="p-8 sm:p-12 rounded-xl bg-[#111218] border border-[#232634]">
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Build without leaving your workspace.
          </h2>
          <p className="text-xs sm:text-sm text-[#9ca3af] max-w-md mx-auto mb-7 leading-relaxed">
            Experience the full developer workbench instantly in your browser with zero installation or machine configuration.
          </p>
          <button
            onClick={onOpenIDE}
            className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-98 text-white text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Open IDE</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-700/70 rounded border border-blue-400/30 text-blue-100 ml-1">
              ⌘ Enter
            </kbd>
          </button>
        </div>
      </section>

      {/* 7. MINIMAL FOOTER */}
      <footer className="py-8 px-4 sm:px-6 border-t border-[#1f212d] bg-[#090a0f] text-[#71717a] text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-[#d4d4d8]">
            <Code2 className="w-4 h-4 text-[#3b82f6]" />
            <span className="font-semibold text-white">DevForge IDE</span>
            <span className="text-[10px] text-[#52525b]">© 2026</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-[#9ca3af]">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-[#71717a]" />
            </a>
            <a href="#product" className="hover:text-white transition-colors">Home</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
