import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, CornerDownLeft, Terminal, FileCode, Play, Eye, Settings, Sparkles, FolderPlus, FilePlus } from 'lucide-react';
import { CommandItem, fuzzyMatch, formatShortcut, CommandCategory } from '../core/commands';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
  theme?: 'dark' | 'light';
}

interface RankedCommand {
  cmd: CommandItem;
  score: number;
  highlightIndices: number[];
  isEnabled: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  File: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
  Edit: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
  View: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
  Selection: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
  Navigation: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
  Terminal: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
  Preview: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
  Run: 'bg-lime-950/80 text-lime-300 border-lime-800/60',
  Preferences: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  AI: 'bg-violet-950/80 text-violet-300 border-violet-800/60',
  Help: 'bg-sky-950/80 text-sky-300 border-sky-800/60'
};

export function CommandPalette({
  isOpen,
  onClose,
  commands,
  theme = 'dark'
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSelectedCategory(null);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  // Rank commands using fuzzy matching
  const rankedCommands = useMemo<RankedCommand[]>(() => {
    const trimmed = query.trim();

    const filteredByCategory = selectedCategory
      ? commands.filter((c) => c.category === selectedCategory)
      : commands;

    if (!trimmed) {
      return filteredByCategory.map((cmd) => ({
        cmd,
        score: 1,
        highlightIndices: [],
        isEnabled: cmd.isEnabled ? cmd.isEnabled() : true
      }));
    }

    const list: RankedCommand[] = [];

    for (const cmd of filteredByCategory) {
      // Search in title and category
      const titleMatch = fuzzyMatch(trimmed, cmd.title);
      const catMatch = fuzzyMatch(trimmed, `${cmd.category}: ${cmd.title}`);

      let bestScore = -1;
      let highlights: number[] = [];

      if (titleMatch) {
        bestScore = titleMatch.score + 100;
        highlights = titleMatch.highlightIndices;
      } else if (catMatch) {
        bestScore = catMatch.score;
        highlights = [];
      }

      if (bestScore > 0) {
        const enabled = cmd.isEnabled ? cmd.isEnabled() : true;
        // Prioritize enabled commands
        if (!enabled) {
          bestScore -= 100;
        }

        list.push({
          cmd,
          score: bestScore,
          highlightIndices: highlights,
          isEnabled: enabled
        });
      }
    }

    return list.sort((a, b) => b.score - a.score);
  }, [commands, query, selectedCategory]);

  // Keep selection valid
  useEffect(() => {
    if (selectedIndex >= rankedCommands.length) {
      setSelectedIndex(Math.max(0, rankedCommands.length - 1));
    }
  }, [rankedCommands.length, selectedIndex]);

  // Scroll to active item
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
      setSelectedIndex((prev) => (prev + 1) % (rankedCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + rankedCommands.length) % (rankedCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = rankedCommands[selectedIndex];
      if (current && current.isEnabled) {
        current.cmd.action();
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
        {chars.map((char, i) =>
          indexSet.has(i) ? (
            <span key={i} className="text-blue-400 font-bold underline decoration-blue-400/50">
              {char}
            </span>
          ) : (
            <span key={i}>{char}</span>
          )
        )}
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
        {/* Command Search Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#141518] border-b border-[#292b33]">
          <span className="font-mono text-xs text-blue-400 font-bold px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 select-none">
            &gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search (e.g. 'Save', 'Preview', 'Terminal', 'Theme')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-hidden text-sm text-zinc-100 placeholder-zinc-500 font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Command Items List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1 divide-y divide-zinc-800/40">
          {rankedCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-zinc-500">
              No matching commands found
            </div>
          ) : (
            rankedCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const badgeClass = CATEGORY_COLORS[item.cmd.category] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
              const shortcutStr = formatShortcut(item.cmd);

              return (
                <div
                  key={item.cmd.id}
                  onClick={() => {
                    if (item.isEnabled) {
                      item.cmd.action();
                      onClose();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 text-xs transition-colors select-none ${
                    item.isEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'
                  } ${
                    isSelected
                      ? 'bg-blue-600/30 text-white border-l-2 border-blue-500'
                      : 'hover:bg-zinc-800/50 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate mr-3">
                    <span
                      className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border shrink-0 ${badgeClass}`}
                    >
                      {item.cmd.category}
                    </span>
                    <span className={`truncate font-medium ${isSelected ? 'text-blue-100' : 'text-zinc-200'}`}>
                      {renderHighlightedText(item.cmd.title, item.highlightIndices)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {shortcutStr && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#141518] text-zinc-300 rounded border border-zinc-700/80 shadow-xs">
                        {shortcutStr}
                      </kbd>
                    )}
                    {isSelected && item.isEnabled && (
                      <CornerDownLeft className="w-3 h-3 text-blue-400" />
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
              Execute
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">Esc</kbd>
              Close
            </span>
          </div>
          <span className="text-zinc-400 font-mono text-[10px]">
            {rankedCommands.length} commands
          </span>
        </div>
      </div>
    </div>
  );
}
