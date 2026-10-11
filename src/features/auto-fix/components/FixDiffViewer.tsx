// Fix Diff Viewer Component - Shows diff of proposed changes
import React, { useState } from 'react';
import { Patch } from '../PatchGenerator';

export interface FixDiffViewerProps {
  patches: Patch[];
  onApprove?: () => void;
  onReject?: () => void;
  onApproveIndividual?: (patchId: string) => void;
  onRejectIndividual?: (patchId: string) => void;
}

export function FixDiffViewer({
  patches,
  onApprove,
  onReject,
  onApproveIndividual,
  onRejectIndividual,
}: FixDiffViewerProps) {
  const [expandedPatches, setExpandedPatches] = useState<Set<string>>(new Set());

  const toggleExpand = (patchId: string) => {
    const newExpanded = new Set(expandedPatches);
    if (newExpanded.has(patchId)) {
      newExpanded.delete(patchId);
    } else {
      newExpanded.add(patchId);
    }
    setExpandedPatches(newExpanded);
  };

  const renderDiff = (patch: Patch) => {
    const originalLines = patch.originalContent.split('\n');
    const newLines = patch.newContent.split('\n');
    const maxLines = Math.max(originalLines.length, newLines.length);

    const lines = [];
    for (let i = 0; i < maxLines; i++) {
      const original = originalLines[i];
      const newLine = newLines[i];

      if (original === newLine) {
        lines.push(
          <div key={i} className="flex">
            <div className="w-8 text-right pr-2 text-gray-600 text-xs">{i + 1}</div>
            <div className="flex-1 text-gray-400 text-sm font-mono whitespace-pre">
              {original || ''}
            </div>
          </div>
        );
      } else {
        if (original !== undefined) {
          lines.push(
            <div key={`${i}-old`} className="flex bg-red-900/20">
              <div className="w-8 text-right pr-2 text-red-400 text-xs">{i + 1}</div>
              <div className="flex-1 text-red-300 text-sm font-mono whitespace-pre">
                -{original}
              </div>
            </div>
          );
        }
        if (newLine !== undefined) {
          lines.push(
            <div key={`${i}-new`} className="flex bg-green-900/20">
              <div className="w-8 text-right pr-2 text-green-400 text-xs">{i + 1}</div>
              <div className="flex-1 text-green-300 text-sm font-mono whitespace-pre">
                +{newLine}
              </div>
            </div>
          );
        }
      }
    }

    return lines;
  };

  const getRiskColor = (risk: Patch['risk']) => {
    switch (risk) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="font-medium text-white">
            {patches.length} Proposed Change{patches.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            {onReject && (
              <button
                onClick={onReject}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
              >
                Reject All
              </button>
            )}
            {onApprove && (
              <button
                onClick={onApprove}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                Approve All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-700">
        {patches.map((patch) => (
          <div key={patch.id} className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleExpand(patch.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400">
                  {expandedPatches.has(patch.id) ? '▼' : '▶'}
                </span>
                <div className="text-sm font-medium text-white">{patch.file}</div>
                <span className={`text-xs capitalize ${getRiskColor(patch.risk)}`}>
                  {patch.risk} risk
                </span>
                <span className="text-xs text-gray-500">
                  {patch.estimatedLinesChanged} lines changed
                </span>
              </div>
              <div className="flex gap-2">
                {onRejectIndividual && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRejectIndividual(patch.id);
                    }}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                  >
                    Reject
                  </button>
                )}
                {onApproveIndividual && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApproveIndividual(patch.id);
                    }}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-400">{patch.description}</div>

            {expandedPatches.has(patch.id) && (
              <div className="mt-4 p-4 bg-gray-900 rounded font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {renderDiff(patch)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
