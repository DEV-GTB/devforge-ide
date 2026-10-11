import React, { useState, useEffect } from 'react';
import { Search, X, Check, FileCode, Play, Terminal, Eye, Settings, Sparkles, FolderPlus, FilePlus } from 'lucide-react';
import { InspectedElement } from '../core/preview';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-xl bg-[#1e1e24] dark:bg-[#18181b] border border-[#3f3f46] rounded-xl shadow-2xl overflow-hidden text-zinc-200"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#27272a] bg-[#121214]">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search (e.g. 'Run', 'Format', 'Preview')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-hidden text-sm text-zinc-100 placeholder-zinc-500"
          />
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-500">
              No matching commands found
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-blue-600/30 text-blue-200 border-l-2 border-blue-500' : 'hover:bg-zinc-800/60 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                      {item.category}
                    </span>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  {item.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Modal for creating a new file or folder
interface PromptModalProps {
  isOpen: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}

export function PromptModal({ isOpen, title, placeholder, initialValue = '', onConfirm, onCancel }: PromptModalProps) {
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-[#1e1e24] border border-[#3f3f46] rounded-lg shadow-2xl p-4 text-zinc-200">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <input
          autoFocus
          type="text"
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && val.trim()) onConfirm(val.trim());
            if (e.key === 'Escape') onCancel();
          }}
          className="w-full px-3 py-1.5 text-xs bg-[#121214] border border-[#3f3f46] rounded text-white focus:outline-hidden focus:border-blue-500 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            Cancel
          </button>
          <button
            disabled={!val.trim()}
            onClick={() => onConfirm(val.trim())}
            className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// Element Inspector Inspector Modal
interface ElementInspectorModalProps {
  element: InspectedElement | null;
  onClose: () => void;
  onOpenInEditor?: (fileHint: string) => void;
  onAskAi?: (element: InspectedElement) => void;
}

export function ElementInspectorModal({ element, onClose, onOpenInEditor, onAskAi }: ElementInspectorModalProps) {
  if (!element) return null;

  return (
    <div className="fixed bottom-10 right-10 z-50 w-96 bg-[#18181b] border border-blue-500/50 rounded-xl shadow-2xl overflow-hidden text-zinc-200">
      <div className="flex items-center justify-between px-3 py-2 bg-blue-950/40 border-b border-blue-900/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-blue-300">DOM Element Inspector</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-blue-900/40 rounded text-zinc-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 text-xs space-y-2.5 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
          <span className="font-mono text-blue-400 font-bold">&lt;{element.tagName}&gt;</span>
          {element.id && <span className="font-mono text-purple-400">#{element.id}</span>}
          {element.className && (
            <span className="font-mono text-emerald-400 truncate max-w-[140px]">
              .{element.className.split(' ')[0]}
            </span>
          )}
        </div>

        {element.textContent && (
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono">Inner Text:</div>
            <div className="text-zinc-200 font-mono bg-zinc-900 p-1.5 rounded text-[11px] truncate">
              "{element.textContent}"
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] text-zinc-400 uppercase font-mono mb-1">Computed Styles:</div>
          <div className="bg-zinc-900/80 rounded border border-zinc-800 divide-y divide-zinc-800/60 font-mono text-[11px]">
            {Object.entries(element.styles).map(([prop, val]) => (
              <div key={prop} className="flex items-center justify-between px-2 py-1">
                <span className="text-zinc-400">{prop}:</span>
                <span className="text-amber-300 font-semibold truncate max-w-[150px]">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          {onAskAi && (
            <button
              onClick={() => {
                onAskAi(element);
                onClose();
              }}
              className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-center font-medium text-[11px] flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" /> Ask AI to edit this element
            </button>
          )}
          <div className="flex gap-2">
          <button
            onClick={() => {
              if (onOpenInEditor) onOpenInEditor('src/style.css');
              onClose();
            }}
            className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-center font-medium text-[11px]"
          >
            Edit style.css
          </button>
          <button
            onClick={() => {
              if (onOpenInEditor) onOpenInEditor('index.html');
              onClose();
            }}
            className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 text-center font-medium text-[11px]"
          >
            Edit index.html
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
