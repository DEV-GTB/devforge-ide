import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain, Search, GitBranch, Database, FileText, Activity, Settings, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';

interface IntelligencePanelProps {
  projectId: string;
  onSearch?: (query: string) => void;
  onIndex?: () => void;
}

export function IntelligencePanel({ projectId, onSearch, onIndex }: IntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'decisions' | 'git' | 'health'>('overview');
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stats']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Project Intelligence</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
              isIndexing ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isIndexing ? 'animate-pulse' : ''}`} />
              {isIndexing ? 'Indexing...' : 'Ready'}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsIndexing(true);
                onIndex?.();
                setTimeout(() => setIsIndexing(false), 3000);
              }}
              className="p-2 hover:bg-gray-800 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${isIndexing ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['overview', 'search', 'decisions', 'git', 'health'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'hover:bg-gray-800 text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && <OverviewTab expandedSections={expandedSections} toggleSection={toggleSection} />}
        {activeTab === 'search' && <SearchTab onSearch={onSearch} />}
        {activeTab === 'decisions' && <DecisionsTab projectId={projectId} />}
        {activeTab === 'git' && <GitTab projectId={projectId} />}
        {activeTab === 'health' && <HealthTab projectId={projectId} />}
      </div>
    </div>
  );
}

function OverviewTab({ expandedSections, toggleSection }: { expandedSections: Set<string>; toggleSection: (s: string) => void }) {
  return (
    <div className="space-y-4">
      {/* Stats Section */}
      <Section
        title="Index Statistics"
        icon={Database}
        expanded={expandedSections.has('stats')}
        onToggle={() => toggleSection('stats')}
      >
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Files" value="1,284" icon={FileText} />
          <StatCard label="Symbols" value="8,421" icon={FileText} />
          <StatCard label="Dependencies" value="3,211" icon={GitBranch} />
          <StatCard label="Embeddings" value="14,829" icon={Brain} />
        </div>
      </Section>

      {/* Project Structure */}
      <Section
        title="Project Structure"
        icon={FileText}
        expanded={expandedSections.has('structure')}
        onToggle={() => toggleSection('structure')}
      >
        <div className="space-y-2 text-sm">
          <StructureItem name="src/" type="directory" items={620} />
          <StructureItem name="server/" type="directory" items={156} />
          <StructureItem name="tests/" type="directory" items={89} />
          <StructureItem name="docs/" type="directory" items={42} />
        </div>
      </Section>

      {/* Technology Stack */}
      <Section
        title="Technology Stack"
        icon={Activity}
        expanded={expandedSections.has('stack')}
        onToggle={() => toggleSection('stack')}
      >
        <div className="flex flex-wrap gap-2">
          {['React', 'TypeScript', 'Vite', 'Node.js', 'Express', 'SQLite'].map((tech) => (
            <span key={tech} className="px-3 py-1 bg-gray-800 rounded-full text-xs">
              {tech}
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}

function SearchTab({ onSearch }: { onSearch?: (q: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query);
      // Mock results
      setResults([
        { path: 'src/services/auth.ts', symbol: 'login', score: 0.97, type: 'function' },
        { path: 'src/hooks/useAuth.ts', symbol: 'useAuth', score: 0.94, type: 'hook' },
        { path: 'src/pages/Login.tsx', symbol: 'Login', score: 0.89, type: 'component' },
      ]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search project..."
          className="flex-1 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSearch}
          className="px-4 py-2 bg-purple-500 rounded-lg flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </motion.button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-gray-800 rounded-lg hover:bg-gray-750 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{result.symbol}</div>
                  <div className="text-sm text-gray-400">{result.path}</div>
                </div>
                <div className="text-right">
                  <div className="text-purple-400 font-medium">{(result.score * 100).toFixed(0)}%</div>
                  <div className="text-xs text-gray-500">{result.type}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function DecisionsTab({ projectId }: { projectId: string }) {
  const [decisions] = useState([
    { category: 'authentication', decision: 'Use JWT for authentication', confidence: 0.95 },
    { category: 'state-management', decision: 'Use Zustand for state', confidence: 0.98 },
    { category: 'api', decision: 'REST API architecture', confidence: 0.92 },
  ]);

  return (
    <div className="space-y-3">
      {decisions.map((decision, i) => (
        <div key={i} className="p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase text-gray-500">{decision.category}</span>
            <span className="text-xs text-green-400">{(decision.confidence * 100).toFixed(0)}% confidence</span>
          </div>
          <div className="text-sm">{decision.decision}</div>
        </div>
      ))}
    </div>
  );
}

function GitTab({ projectId }: { projectId: string }) {
  const [commits] = useState([
    { hash: 'abc123', message: 'Fix authentication flow', author: 'John', date: '2 hours ago' },
    { hash: 'def456', message: 'Add user preferences', author: 'Jane', date: '1 day ago' },
    { hash: 'ghi789', message: 'Update dependencies', author: 'John', date: '3 days ago' },
  ]);

  return (
    <div className="space-y-3">
      {commits.map((commit, i) => (
        <div key={i} className="p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-mono">{commit.hash}</span>
            <span className="text-xs text-gray-400">{commit.date}</span>
          </div>
          <div className="text-sm mb-1">{commit.message}</div>
          <div className="text-xs text-gray-500">by {commit.author}</div>
        </div>
      ))}
    </div>
  );
}

function HealthTab({ projectId }: { projectId: string }) {
  const [health] = useState({
    status: 'healthy',
    checks: [
      { name: 'File consistency', status: 'pass' },
      { name: 'Symbol consistency', status: 'pass' },
      { name: 'Dependency graph', status: 'pass' },
      { name: 'Vector store', status: 'pass' },
    ],
  });

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${
        health.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
      }`}>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <span className="font-semibold capitalize">{health.status}</span>
        </div>
      </div>

      <div className="space-y-2">
        {health.checks.map((check, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <span className="text-sm">{check.name}</span>
            <span className={`text-xs ${
              check.status === 'pass' ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {check.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, expanded, onToggle, children }: any) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-purple-400" />
          <span className="font-medium">{title}</span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {expanded && <div className="p-3 pt-0">{children}</div>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <div className="p-3 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-purple-400" />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function StructureItem({ name, type, items }: any) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
      <div className="flex items-center gap-2">
        <span className="text-purple-400">{type === 'directory' ? '📁' : '📄'}</span>
        <span className="text-sm">{name}</span>
      </div>
      <span className="text-xs text-gray-500">{items} items</span>
    </div>
  );
}
