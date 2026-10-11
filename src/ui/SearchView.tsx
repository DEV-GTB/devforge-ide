import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Replace, 
  ChevronRight, 
  ChevronDown, 
  CaseSensitive, 
  WholeWord, 
  Regex, 
  RefreshCw, 
  X, 
  MoreHorizontal, 
  Check, 
  AlertCircle, 
  Folder, 
  FileCode,
  ChevronsUpDown,
  ListCollapse,
  ListFilter
} from 'lucide-react';
import { FileNode, getFileIconColor } from '../core/filesystem';
import { searchService, SearchOptions, FileSearchResult, SearchSummary, SearchMatch, CancellationToken } from '../core/search';

interface SearchViewProps {
  files: FileNode[];
  onNavigateToResult: (filePath: string, line: number, col: number, matchLength: number) => void;
  onReplaceFiles: (updatedFiles: { file: FileNode; newContent: string; count: number }[]) => void;
  initialSearchQuery?: string;
  focusTrigger?: number;
  theme?: 'dark' | 'light';
}

export function SearchView({
  files,
  onNavigateToResult,
  onReplaceFiles,
  initialSearchQuery = '',
  focusTrigger = 0,
  theme = 'dark'
}: SearchViewProps) {
  // Search inputs
  const [query, setQuery] = useState(initialSearchQuery);
  const [replaceValue, setReplaceValue] = useState('');
  const [isReplaceVisible, setIsReplaceVisible] = useState(false);

  // Search options
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);

  // Filter options
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('node_modules, .git, dist, build, coverage');

  // Search execution state
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FileSearchResult[]>([]);
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  // Replace Confirmation Modal
  const [confirmReplaceModal, setConfirmReplaceModal] = useState<{
    isOpen: boolean;
    totalMatches: number;
    totalFiles: number;
  }>({ isOpen: false, totalMatches: 0, totalFiles: 0 });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);
  const currentTokenRef = useRef<CancellationToken | null>(null);

  // Focus search input when focusTrigger fires (e.g. from Ctrl+Shift+F)
  useEffect(() => {
    if (focusTrigger > 0) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 30);
    }
  }, [focusTrigger]);

  // Execute search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSummary(null);
      setIsSearching(false);
      return;
    }

    // Cancel any previous search
    if (currentTokenRef.current) {
      currentTokenRef.current.cancel();
    }
    const token = new CancellationToken();
    currentTokenRef.current = token;

    setIsSearching(true);

    const options: SearchOptions = {
      query: searchQuery,
      isCaseSensitive,
      isWholeWord,
      isRegex,
      includePattern,
      excludePattern,
      maxResults: 1000
    };

    try {
      const outcome = await searchService.search(files, options, token);
      if (!token.cancelled) {
        setResults(outcome.results);
        setSummary(outcome.summary);
      }
    } catch (err: any) {
      if (!token.cancelled) {
        setSummary({
          totalMatches: 0,
          totalFiles: 0,
          isLimitReached: false,
          durationMs: 0,
          error: err.message || 'Search execution failed'
        });
      }
    } finally {
      if (!token.cancelled) {
        setIsSearching(false);
      }
    }
  }, [files, isCaseSensitive, isWholeWord, isRegex, includePattern, excludePattern]);

  // Trigger debounced search when inputs change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setSummary(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSummary(null);
    searchInputRef.current?.focus();
  };

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => ({
      ...prev,
      [filePath]: !prev[filePath]
    }));
  };

  const handleToggleAllCollapse = () => {
    const areAnyExpanded = results.some((r) => !collapsedFiles[r.filePath]);
    const newState: Record<string, boolean> = {};
    if (areAnyExpanded) {
      // Collapse all
      for (const r of results) {
        newState[r.filePath] = true;
      }
    }
    setCollapsedFiles(newState);
  };

  // Replace Single File All Matches
  const handleReplaceInFile = (fileResult: FileSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const options: SearchOptions = {
      query,
      isCaseSensitive,
      isWholeWord,
      isRegex,
      includePattern,
      excludePattern
    };

    const outcome = searchService.replaceAllInWorkspace([fileResult], options, replaceValue);
    if (outcome.updatedFiles.length > 0) {
      onReplaceFiles(outcome.updatedFiles);
    }
  };

  // Replace All in Workspace (triggers confirmation modal)
  const handlePromptReplaceAll = () => {
    if (results.length === 0 || !summary?.totalMatches) return;
    setConfirmReplaceModal({
      isOpen: true,
      totalMatches: summary.totalMatches,
      totalFiles: summary.totalFiles
    });
  };

  const handleConfirmReplaceAll = () => {
    setConfirmReplaceModal({ isOpen: false, totalMatches: 0, totalFiles: 0 });
    const options: SearchOptions = {
      query,
      isCaseSensitive,
      isWholeWord,
      isRegex,
      includePattern,
      excludePattern
    };

    const outcome = searchService.replaceAllInWorkspace(results, options, replaceValue);
    if (outcome.updatedFiles.length > 0) {
      onReplaceFiles(outcome.updatedFiles);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs text-zinc-300 font-sans select-none">
      {/* Search Input Controls Header */}
      <div className="p-2 space-y-2 border-b border-[#27272a] bg-[#141518]/60 shrink-0">
        {/* Search Bar Row */}
        <div className="flex items-center gap-1">
          {/* Replace toggle arrow */}
          <button
            onClick={() => setIsReplaceVisible((prev) => !prev)}
            title="Toggle Replace"
            className={`p-1 rounded transition text-zinc-400 hover:text-zinc-200 ${
              isReplaceVisible ? 'bg-zinc-800 text-blue-400' : 'hover:bg-zinc-800'
            }`}
          >
            {isReplaceVisible ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Search text input */}
          <div className="flex-1 relative flex items-center bg-[#121214] border border-[#2e3038] focus-within:border-blue-500 rounded px-2 py-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search in files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-hidden text-xs text-white placeholder-zinc-500 pr-1"
            />
            {query && (
              <button
                onClick={handleClear}
                className="text-zinc-500 hover:text-zinc-300 mr-1.5"
                title="Clear Search"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Toggle Buttons: Case, Word, Regex */}
            <div className="flex items-center gap-0.5 border-l border-zinc-700/60 pl-1.5 shrink-0">
              <button
                onClick={() => setIsCaseSensitive((p) => !p)}
                title="Match Case (Alt+C)"
                className={`px-1 py-0.5 rounded text-[10px] font-mono transition ${
                  isCaseSensitive
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                Aa
              </button>
              <button
                onClick={() => setIsWholeWord((p) => !p)}
                title="Match Whole Word (Alt+W)"
                className={`px-1 py-0.5 rounded text-[10px] font-mono transition ${
                  isWholeWord
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                \b
              </button>
              <button
                onClick={() => setIsRegex((p) => !p)}
                title="Use Regular Expression (Alt+R)"
                className={`px-1 py-0.5 rounded text-[10px] font-mono transition ${
                  isRegex
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                .*
              </button>
            </div>
          </div>
        </div>

        {/* Replace Bar Row (when expanded) */}
        {isReplaceVisible && (
          <div className="flex items-center gap-1 pl-5">
            <div className="flex-1 relative flex items-center bg-[#121214] border border-[#2e3038] focus-within:border-blue-500 rounded px-2 py-1">
              <input
                type="text"
                placeholder="Replace with..."
                value={replaceValue}
                onChange={(e) => setReplaceValue(e.target.value)}
                className="flex-1 bg-transparent border-none outline-hidden text-xs text-white placeholder-zinc-500"
              />
              {replaceValue && (
                <button
                  onClick={() => setReplaceValue('')}
                  className="text-zinc-500 hover:text-zinc-300 mr-1"
                  title="Clear Replace"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Replace All button */}
            <button
              onClick={handlePromptReplaceAll}
              disabled={results.length === 0}
              title="Replace All (Ctrl+Alt+Enter)"
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded font-medium text-[11px] flex items-center gap-1 transition shrink-0"
            >
              <Replace className="w-3 h-3" />
              <span>All</span>
            </button>
          </div>
        )}

        {/* Filter Accordion Toggle */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 pt-0.5">
          <button
            onClick={() => setIsFiltersVisible((p) => !p)}
            className="flex items-center gap-1 hover:text-zinc-200 transition"
          >
            <ListFilter className="w-3 h-3 text-zinc-400" />
            <span>Files to include/exclude</span>
            {isFiltersVisible ? (
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-zinc-500" />
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => performSearch(query)}
              title="Refresh Search"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className={`w-3 h-3 ${isSearching ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={handleToggleAllCollapse}
              title="Collapse / Expand All"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
            >
              <ListCollapse className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Filter Inputs (Expandable) */}
        {isFiltersVisible && (
          <div className="space-y-1.5 pt-1 text-[11px]">
            <div>
              <div className="text-zinc-400 mb-0.5">files to include (e.g. *.tsx, src/*):</div>
              <input
                type="text"
                value={includePattern}
                onChange={(e) => setIncludePattern(e.target.value)}
                placeholder="e.g. *.ts, src/*"
                className="w-full bg-[#121214] border border-[#2e3038] rounded px-2 py-0.5 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <div className="text-zinc-400 mb-0.5">files to exclude:</div>
              <input
                type="text"
                value={excludePattern}
                onChange={(e) => setExcludePattern(e.target.value)}
                placeholder="e.g. node_modules, dist"
                className="w-full bg-[#121214] border border-[#2e3038] rounded px-2 py-0.5 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Regex Error Banner */}
        {summary?.error && (
          <div className="flex items-start gap-1.5 p-1.5 bg-rose-950/60 border border-rose-800/80 rounded text-rose-300 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>{summary.error}</span>
          </div>
        )}
      </div>

      {/* Summary Header */}
      {query && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#18191e] border-b border-[#27272a] text-[11px] text-zinc-400 shrink-0">
          <span>
            {isSearching ? (
              <span className="text-blue-400 animate-pulse">Searching workspace...</span>
            ) : summary ? (
              summary.totalMatches > 0 ? (
                <>
                  <span className="font-semibold text-zinc-200">{summary.totalMatches}</span>{' '}
                  {summary.totalMatches === 1 ? 'match' : 'matches'} in{' '}
                  <span className="font-semibold text-zinc-200">{summary.totalFiles}</span>{' '}
                  {summary.totalFiles === 1 ? 'file' : 'files'}
                  {summary.isLimitReached && (
                    <span className="text-amber-400 ml-1">(Limit 1000 reached)</span>
                  )}
                </>
              ) : (
                'No results found'
              )
            ) : null}
          </span>
          {summary && !isSearching && (
            <span className="text-[10px] text-zinc-500 font-mono">
              {summary.durationMs}ms
            </span>
          )}
        </div>
      )}

      {/* Results Tree View */}
      <div className="flex-1 overflow-y-auto p-1 divide-y divide-zinc-800/40">
        {results.map((fileResult) => {
          const isCollapsed = collapsedFiles[fileResult.filePath];
          const icon = getFileIconColor(fileResult.fileName);
          const dirPath = fileResult.filePath.includes('/')
            ? fileResult.filePath.substring(0, fileResult.filePath.lastIndexOf('/'))
            : '';

          return (
            <div key={fileResult.filePath} className="py-1">
              {/* File Group Header */}
              <div
                onClick={() => toggleFileCollapse(fileResult.filePath)}
                className="group flex items-center justify-between px-1.5 py-1 rounded hover:bg-zinc-800/60 cursor-pointer transition text-xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                  )}
                  <span
                    className="font-mono text-[10px] font-bold shrink-0"
                    style={{ color: icon.color }}
                  >
                    {icon.label}
                  </span>
                  <span className="font-semibold text-zinc-200 truncate">
                    {fileResult.fileName}
                  </span>
                  {dirPath && (
                    <span className="text-[10px] text-zinc-500 truncate font-mono">
                      {dirPath}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Replace all in this file button */}
                  {isReplaceVisible && (
                    <button
                      onClick={(e) => handleReplaceInFile(fileResult, e)}
                      title={`Replace ${fileResult.matches.length} matches in ${fileResult.fileName}`}
                      className="hidden group-hover:flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-[10px] transition"
                    >
                      <Replace className="w-2.5 h-2.5" />
                      <span>Replace</span>
                    </button>
                  )}
                  {/* Match count badge */}
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono text-[10px] border border-zinc-700/60">
                    {fileResult.matches.length}
                  </span>
                </div>
              </div>

              {/* Match Items in File */}
              {!isCollapsed && (
                <div className="ml-5 space-y-0.5 mt-0.5">
                  {fileResult.matches.map((match, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        onNavigateToResult(
                          fileResult.filePath,
                          match.line,
                          match.col,
                          match.length
                        )
                      }
                      className="group flex items-start gap-2 px-2 py-1 rounded hover:bg-blue-950/40 hover:text-white cursor-pointer transition font-mono text-[11px]"
                    >
                      <span className="text-zinc-500 text-[10px] shrink-0 select-none pt-0.5">
                        {match.line}:
                      </span>
                      <div className="truncate text-zinc-400 group-hover:text-zinc-200">
                        <span>{match.previewBefore}</span>
                        <span className="bg-amber-500/30 text-amber-200 font-bold px-0.5 rounded underline decoration-amber-400">
                          {match.previewMatch}
                        </span>
                        <span>{match.previewAfter}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!query && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-center px-4">
            <Search className="w-6 h-6 mb-2 text-zinc-600" />
            <p className="text-xs">Search for text across all workspace files</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Supports match case (Aa), whole word (\b), regex (.*), and globs
            </p>
          </div>
        )}
      </div>

      {/* Replace All Confirmation Dialog */}
      {confirmReplaceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#1e1f26] border border-[#3b3d4a] rounded-xl shadow-2xl p-4 text-zinc-200">
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <Replace className="w-5 h-5" />
              <h3 className="font-semibold text-sm text-zinc-100">Confirm Replace All</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Replace <strong className="text-white">{confirmReplaceModal.totalMatches}</strong> occurrence{confirmReplaceModal.totalMatches > 1 ? 's' : ''} across{' '}
              <strong className="text-white">{confirmReplaceModal.totalFiles}</strong> file{confirmReplaceModal.totalFiles > 1 ? 's' : ''} with &ldquo;<span className="text-emerald-300 font-mono">{replaceValue}</span>&rdquo;?
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setConfirmReplaceModal({ isOpen: false, totalMatches: 0, totalFiles: 0 })}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReplaceAll}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
