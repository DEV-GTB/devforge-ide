import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileCode, Clock, CornerDownLeft, X, ArrowUpDown } from 'lucide-react';
import { FileNode, flattenFiles, getFileIconColor } from '../core/filesystem';
import { fuzzyMatch } from '../core/commands';

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileNode[];
  recentFileIds: string[];
  onOpenFile: (fileId: string, targetLine?: number) => void;
  theme?: 'dark' | 'light';
}

interface RankedFileItem {
  file: FileNode;
  score: number;
  highlightIndices: number[];
  isRecent: boolean;
  targetLine?: number;
}

export function QuickOpen({
  isOpen,
  onClose,
  files,
  recentFileIds,
  onOpenFile,
  theme = 'dark'
}: QuickOpenProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const flatFiles = useMemo(() => flattenFiles(files), [files]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  // Parse line jump syntax: e.g. "App.tsx:42", "main.tsx#15", "Header.tsx 20"
  const { cleanQuery, lineJump } = useMemo(() => {
    const trimmed = query.trim();
    const match = trimmed.match(/^([^:#\s]+)(?:[:#\s]+(\d+))?$/);
    if (match && match[2]) {
      return {
        cleanQuery: match[1],
        lineJump: parseInt(match[2], 10)
      };
    }
    return { cleanQuery: trimmed, lineJump: undefined };
  }, [query]);

  // Rank and filter files
  const rankedItems = useMemo<RankedFileItem[]>(() => {
    if (!cleanQuery) {
      // Show recent files first, followed by remaining files
      const recentSet = new Set(recentFileIds);
      const recents: RankedFileItem[] = [];
      const others: RankedFileItem[] = [];

      for (const fId of recentFileIds) {
        const found = flatFiles.find((f) => f.id === fId);
        if (found) {
          recents.push({
            file: found,
            score: 100,
            highlightIndices: [],
            isRecent: true
          });
        }
      }

      for (const file of flatFiles) {
        if (!recentSet.has(file.id)) {
          others.push({
            file,
            score: 50,
            highlightIndices: [],
            isRecent: false
          });
        }
      }

      return [...recents, ...others];
    }

    const items: RankedFileItem[] = [];
    const recentSet = new Set(recentFileIds);

    for (const file of flatFiles) {
      // Match against filename first (heavily weighted)
      const nameMatch = fuzzyMatch(cleanQuery, file.name);
      const pathMatch = fuzzyMatch(cleanQuery, file.path);

      let bestScore = -1;
      let highlights: number[] = [];

      if (nameMatch) {
        bestScore = nameMatch.score + 200; // prioritize filename match
        highlights = nameMatch.highlightIndices;
      } else if (pathMatch) {
        bestScore = pathMatch.score;
        highlights = [];
      }

      if (bestScore > 0) {
        // Extra boost for recent files
        if (recentSet.has(file.id)) {
          bestScore += 40;
        }

        items.push({
          file,
          score: bestScore,
          highlightIndices: highlights,
          isRecent: recentSet.has(file.id),
          targetLine: lineJump
        });
      }
    }

    // Sort descending by score
    return items.sort((a, b) => b.score - a.score);
  }, [cleanQuery, lineJump, flatFiles, recentFileIds]);

  // Keep selected item within bounds
  useEffect(() => {
    if (selectedIndex >= rankedItems.length) {
      setSelectedIndex(Math.max(0, rankedItems.length - 1));
    }
  }, [rankedItems.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (rankedItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + rankedItems.length) % (rankedItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = rankedItems[selectedIndex];
      if (current) {
        onOpenFile(current.file.id, current.targetLine || lineJump);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const renderHighlightedText = (text: string, indices: number[]) => {
    if (!indices || indices.length === 0) return <span>{text}</span>;
    const indexSet = new Set(indices);
    const chars = text.split('');

    return (
      <span>
        {chars.map((char, i) => (
          indexSet.has(i) ? (
            <span key={i} className="text-amber-400 font-bold underline decoration-amber-400/60">
              {char}
            </span>
          ) : (
            <span key={i}>{char}</span>
          )
        ))}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 bg-black/65 backdrop-blur-xs px-2"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl bg-[#1c1d22] border border-[#3b3d4a] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-zinc-200"
      >
        {/* Quick Open Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#141518] border-b border-[#292b33]">
          <Search className="w-4 h-4 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files by name (e.g. 'App', 'Header.tsx', or 'App.tsx:42')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-hidden text-sm text-zinc-100 placeholder-zinc-500 font-sans"
          />
          {lineJump && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 shrink-0">
              Line {lineJump}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* File Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1 divide-y divide-zinc-800/40">
          {rankedItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-zinc-500">
              No matching files found
            </div>
          ) : (
            rankedItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const icon = getFileIconColor(item.file.name);
              const dirPath = item.file.path.includes('/')
                ? item.file.path.substring(0, item.file.path.lastIndexOf('/'))
                : '';

              return (
                <div
                  key={item.file.id}
                  onClick={() => {
                    onOpenFile(item.file.id, item.targetLine || lineJump);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-600/30 text-white border-l-2 border-blue-500'
                      : 'hover:bg-zinc-800/50 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="font-mono text-[10px] font-bold shrink-0 w-4 text-center"
                      style={{ color: icon.color }}
                    >
                      {icon.label}
                    </span>
                    <div className="truncate flex items-baseline gap-2">
                      <span className={`font-medium ${isSelected ? 'text-blue-100' : 'text-zinc-200'}`}>
                        {renderHighlightedText(item.file.name, item.highlightIndices)}
                      </span>
                      {dirPath && (
                        <span className="text-[11px] text-zinc-500 truncate font-mono">
                          {dirPath}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.isRecent && !cleanQuery && (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                        <Clock className="w-2.5 h-2.5 text-zinc-400" />
                        Recent
                      </span>
                    )}
                    {item.file.isDirty && (
                      <span className="w-2 h-2 rounded-full bg-blue-400" title="Unsaved changes" />
                    )}
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-300">
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#141518] border-t border-[#292b33] text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">↵</kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">Esc</kbd>
              Close
            </span>
          </div>
          <span className="text-zinc-400 font-mono text-[10px]">
            {rankedItems.length} {rankedItems.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>
    </div>
  );
}
