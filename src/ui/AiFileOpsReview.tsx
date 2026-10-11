import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Pencil,
  Trash2
} from 'lucide-react';
import { FileOperation } from '../services/nexusChat';

interface AiFileOpsReviewProps {
  operations: FileOperation[];
  onApply: (operations: FileOperation[]) => void;
  compact?: boolean;
}

const OP_META: Record<FileOperation['op'], { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  create: { label: 'Create', color: 'text-emerald-400', Icon: FilePlus2 },
  update: { label: 'Update', color: 'text-sky-400', Icon: Pencil },
  delete: { label: 'Delete', color: 'text-rose-400', Icon: Trash2 },
  rename: { label: 'Rename', color: 'text-amber-400', Icon: ArrowRight }
};

/**
 * Review surface for AI-proposed file changes. Nothing is written until the user
 * approves. Each operation can be toggled individually, and Apply sends only the
 * approved operations back to the workspace.
 */
export function AiFileOpsReview({ operations, onApply, compact = false }: AiFileOpsReviewProps) {
  const [selected, setSelected] = useState<boolean[]>(() => operations.map(() => true));
  const [expanded, setExpanded] = useState<number | null>(null);

  const selectedCount = selected.filter(Boolean).length;
  const allOn = selectedCount === operations.length && operations.length > 0;

  const toggle = (index: number) => {
    setSelected((previous) => previous.map((value, idx) => (idx === index ? !value : value)));
  };

  return (
    <div className={`mt-2.5 overflow-hidden rounded border border-[#33333d] bg-[#121214] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
      <div className="flex items-center justify-between border-b border-[#2a2a34] bg-[#1a1a20] px-2.5 py-1.5">
        <span className="font-semibold text-zinc-300">
          {operations.length} AI file change{operations.length === 1 ? '' : 's'}
        </span>
        <button onClick={() => setSelected(operations.map(() => !allOn))} className="text-zinc-400 transition hover:text-zinc-200">
          {allOn ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div className="divide-y divide-[#232329]">
        {operations.map((operation, index) => {
          const meta = OP_META[operation.op];
          const Icon = meta.Icon;
          const hasContent = operation.op === 'create' || operation.op === 'update';
          const displayPath = operation.op === 'rename' ? `${operation.path} → ${operation.newPath}` : operation.path;
          return (
            <div key={`${operation.op}-${index}`} className="px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected[index]}
                  onChange={() => toggle(index)}
                  className="accent-blue-500"
                  aria-label={`Include ${operation.op} ${displayPath}`}
                />
                <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                <span className={`shrink-0 font-medium ${meta.color}`}>{meta.label}</span>
                <span className="flex-1 truncate font-mono text-zinc-400" title={displayPath}>{displayPath}</span>
                {hasContent && (
                  <button
                    onClick={() => setExpanded(expanded === index ? null : index)}
                    className="text-zinc-500 transition hover:text-zinc-300"
                    title="Preview contents"
                  >
                    {expanded === index ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              {hasContent && expanded === index && (
                <pre className="mt-1.5 max-h-48 overflow-auto rounded bg-black/60 p-2 font-mono text-[10px] leading-relaxed text-zinc-300">
                  {(operation as { content: string }).content}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-[#2a2a34] bg-[#16161c] px-2.5 py-1.5">
        <span className="text-[10px] text-zinc-500">{selectedCount} selected · your approval required</span>
        <button
          onClick={() => onApply(operations.filter((_, index) => selected[index]))}
          disabled={selectedCount === 0}
          className="flex items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          <Check className="h-3 w-3" /> Apply approved
        </button>
      </div>
    </div>
  );
}
