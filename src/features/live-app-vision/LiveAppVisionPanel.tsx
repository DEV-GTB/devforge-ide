import { Eye } from 'lucide-react';
import { FileNode } from '../../core/filesystem';
import { VisionWorkspace } from './components/VisionWorkspace';

export function LiveAppVisionPanel({ files }: { files: FileNode[] }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] shrink-0">
        <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          Live App Vision
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">local-first</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <VisionWorkspace files={files} />
      </div>
    </div>
  );
}