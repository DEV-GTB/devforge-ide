import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FilePlus,
  FolderPlus,
  RotateCw,
  ChevronsDownUp,
  FolderInput,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Edit2,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Files,
  AlertTriangle,
  Folder,
  FolderOpen
} from 'lucide-react';
import { FileNode, findNodeById } from '../core/filesystem';
import { FileIcon } from '../core/fileIcons';
import { filesystemService, ClipboardItem } from '../services/filesystemService';

interface ContextMenuState {
  x: number;
  y: number;
  targetNode: FileNode | null; // null means empty space
}

interface InlineEditState {
  type: 'rename' | 'new-file' | 'new-folder';
  nodeId?: string; // for rename
  parentPathOrId: string | null; // for new file/folder
  initialValue: string;
}

interface DeleteModalState {
  isOpen: boolean;
  node: FileNode | null;
}

interface ExplorerProps {
  files: FileNode[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onFilesChanged: (newFiles: FileNode[]) => void;
  workspaceName?: string;
  onOpenDirectoryFromDisk?: () => void;
}

export function Explorer({
  files,
  activeFileId,
  onSelectFile,
  onFilesChanged,
  workspaceName = 'PROJECT',
  onOpenDirectoryFromDisk
}: ExplorerProps) {
  // Navigation & selection
  const [selectedId, setSelectedId] = useState<string | null>(activeFileId);
  const [searchQuery, setSearchQuery] = useState('');
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(filesystemService.getClipboard());
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);

  // Modals & Popups
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ isOpen: false, node: null });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedNode = selectedId ? findNodeById(files, selectedId) : null;
  const selectedParentId = selectedNode?.type === 'folder' ? selectedNode.id : null;

  // Sync selectedId with activeFileId when changed from outside
  useEffect(() => {
    if (activeFileId) {
      setSelectedId(activeFileId);
    }
  }, [activeFileId]);

  // Focus inline input automatically
  useEffect(() => {
    if (inlineEdit && inlineInputRef.current) {
      inlineInputRef.current.focus();
      if (inlineEdit.type === 'rename') {
        const dotIdx = inlineEdit.initialValue.lastIndexOf('.');
        if (dotIdx > 0) {
          inlineInputRef.current.setSelectionRange(0, dotIdx);
        } else {
          inlineInputRef.current.select();
        }
      } else {
        inlineInputRef.current.select();
      }
    }
  }, [inlineEdit]);

  // Dismiss context menu on click outside or Escape
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        if (inlineEdit) setInlineEdit(null);
        if (deleteModal.isOpen) setDeleteModal({ isOpen: false, node: null });
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu, inlineEdit, deleteModal]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // --- Filtering ---
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase().trim();

    function filterNode(node: FileNode): FileNode | null {
      const nameMatches = node.name.toLowerCase().includes(query);

      if (node.type === 'folder' && node.children) {
        const matchingChildren: FileNode[] = [];
        for (const child of node.children) {
          const filteredChild = filterNode(child);
          if (filteredChild) {
            matchingChildren.push(filteredChild);
          }
        }

        if (nameMatches || matchingChildren.length > 0) {
          return {
            ...node,
            isOpen: true, // Auto-expand matching folders
            children: matchingChildren
          };
        }
      } else if (nameMatches) {
        return node;
      }
      return null;
    }

    const result: FileNode[] = [];
    for (const file of files) {
      const filtered = filterNode(file);
      if (filtered) result.push(filtered);
    }
    return result;
  }, [files, searchQuery]);

  // Flatten visible nodes for keyboard navigation
  const visibleNodes = useMemo(() => {
    const list: FileNode[] = [];
    function traverse(nodes: FileNode[]) {
      for (const node of nodes) {
        list.push(node);
        if (node.type === 'folder' && node.isOpen && node.children) {
          traverse(node.children);
        }
      }
    }
    traverse(filteredFiles);
    return list;
  }, [filteredFiles]);

  // --- Keyboard Shortcuts in Explorer ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (inlineEdit) return; // Typing in input

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = visibleNodes.findIndex((n) => n.id === selectedId);
      const nextIndex = Math.min(visibleNodes.length - 1, currentIndex + 1);
      if (visibleNodes[nextIndex]) {
        setSelectedId(visibleNodes[nextIndex].id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = visibleNodes.findIndex((n) => n.id === selectedId);
      const prevIndex = Math.max(0, currentIndex - 1);
      if (visibleNodes[prevIndex]) {
        setSelectedId(visibleNodes[prevIndex].id);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const node = visibleNodes.find((n) => n.id === selectedId);
      if (node && node.type === 'folder') {
        if (!node.isOpen) {
          const updated = filesystemService.toggleFolder(node.id);
          onFilesChanged([...updated]);
        } else if (node.children && node.children.length > 0) {
          setSelectedId(node.children[0].id);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const node = visibleNodes.find((n) => n.id === selectedId);
      if (node && node.type === 'folder' && node.isOpen) {
        const updated = filesystemService.toggleFolder(node.id);
        onFilesChanged([...updated]);
      } else if (node) {
        // Jump to parent folder
        const parentPath = node.path.includes('/')
          ? node.path.substring(0, node.path.lastIndexOf('/'))
          : null;
        if (parentPath) {
          const parentNode = filesystemService.findNodeByPath(parentPath);
          if (parentNode) setSelectedId(parentNode.id);
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const node = visibleNodes.find((n) => n.id === selectedId);
      if (node) {
        if (node.type === 'file') {
          onSelectFile(node.id);
        } else {
          const updated = filesystemService.toggleFolder(node.id);
          onFilesChanged([...updated]);
        }
      }
    } else if (e.key === 'F2') {
      e.preventDefault();
      const node = visibleNodes.find((n) => n.id === selectedId);
      if (node) {
        setInlineEdit({
          type: 'rename',
          nodeId: node.id,
          parentPathOrId: null,
          initialValue: node.name
        });
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const node = visibleNodes.find((n) => n.id === selectedId);
        if (node) {
          setDeleteModal({ isOpen: true, node });
        }
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (selectedId) {
        filesystemService.setClipboard(selectedId, 'copy');
        setClipboard(filesystemService.getClipboard());
        showToast('Copied to clipboard');
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      if (selectedId) {
        filesystemService.setClipboard(selectedId, 'cut');
        setClipboard(filesystemService.getClipboard());
        showToast('Cut to clipboard');
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      handlePasteAction(selectedId);
    }
  };

  // --- Handlers for Actions ---

  const handleToggleFolder = (folderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedId(folderId);
    const updated = filesystemService.toggleFolder(folderId);
    onFilesChanged([...updated]);
  };

  const handleSelectNode = (node: FileNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedId(node.id);
    if (node.type === 'file') {
      onSelectFile(node.id);
    }
  };

  const handleStartCreate = (type: 'new-file' | 'new-folder', parentPathOrId: string | null) => {
    setInlineEdit({
      type,
      parentPathOrId,
      initialValue: type === 'new-file' ? 'untitled.ts' : 'new-folder'
    });
  };

  const handleCommitInlineEdit = (value: string) => {
    if (!inlineEdit) return;
    const clean = value.trim();
    if (!clean) {
      setInlineEdit(null);
      return;
    }

    if (inlineEdit.type === 'rename' && inlineEdit.nodeId) {
      const res = filesystemService.rename(inlineEdit.nodeId, clean);
      if (!res.success) {
        showToast(res.error || 'Failed to rename');
      } else {
        onFilesChanged([...filesystemService.getFiles()]);
        showToast(`Renamed to ${clean}`);
      }
    } else if (inlineEdit.type === 'new-file') {
      const res = filesystemService.create(inlineEdit.parentPathOrId, clean, 'file', '');
      if (!res.success) {
        showToast(res.error || 'Failed to create file');
      } else {
        onFilesChanged([...filesystemService.getFiles()]);
        if (res.node) {
          setSelectedId(res.node.id);
          onSelectFile(res.node.id);
        }
        showToast(`Created file ${clean}`);
      }
    } else if (inlineEdit.type === 'new-folder') {
      const res = filesystemService.create(inlineEdit.parentPathOrId, clean, 'folder');
      if (!res.success) {
        showToast(res.error || 'Failed to create folder');
      } else {
        onFilesChanged([...filesystemService.getFiles()]);
        if (res.node) {
          setSelectedId(res.node.id);
        }
        showToast(`Created folder ${clean}`);
      }
    }
    setInlineEdit(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal.node) return;
    const { id, name } = deleteModal.node;
    const res = filesystemService.delete(id);
    if (res.success) {
      onFilesChanged([...filesystemService.getFiles()]);
      if (selectedId === id) setSelectedId(null);
      showToast(`Deleted ${name}`);
    } else {
      showToast(res.error || 'Failed to delete');
    }
    setDeleteModal({ isOpen: false, node: null });
  };

  const handleDuplicate = (nodeId: string) => {
    const res = filesystemService.duplicate(nodeId);
    if (res.success && res.newNode) {
      onFilesChanged([...filesystemService.getFiles()]);
      setSelectedId(res.newNode.id);
      showToast(`Duplicated to ${res.newNode.name}`);
    } else {
      showToast(res.error || 'Failed to duplicate');
    }
  };

  const handlePasteAction = (targetParentId: string | null) => {
    let parentPathOrId = targetParentId;
    if (targetParentId) {
      const targetNode = filesystemService.findNode(targetParentId);
      if (targetNode && targetNode.type === 'file') {
        // If file is selected, paste into its parent directory
        const parts = targetNode.path.split('/');
        parts.pop();
        parentPathOrId = parts.join('/') || null;
      }
    }

    const res = filesystemService.paste(parentPathOrId);
    if (res.success) {
      onFilesChanged([...filesystemService.getFiles()]);
      setClipboard(filesystemService.getClipboard());
      showToast('Pasted successfully');
    } else {
      showToast(res.error || 'Paste failed');
    }
  };

  const handleCollapseAll = () => {
    const updated = filesystemService.collapseAll();
    onFilesChanged([...updated]);
    showToast('All folders collapsed');
  };

  const handleRefresh = () => {
    const updated = filesystemService.refresh();
    onFilesChanged([...updated]);
    showToast('Explorer refreshed');
  };

  // --- Drag and Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.stopPropagation();
    setDragSourceId(node.id);
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetNode: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragSourceId) return;

    if (targetNode) {
      // If dragging over a file or same node, drop target is invalid
      if (targetNode.type !== 'folder' || targetNode.id === dragSourceId) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      setDragOverNodeId(targetNode.id);
      e.dataTransfer.dropEffect = 'move';
    } else {
      // Root drop target
      setDragOverNodeId('root');
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverNodeId(null);
  };

  const handleDrop = (e: React.DragEvent, targetNode: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverNodeId(null);

    const sourceId = e.dataTransfer.getData('text/plain') || dragSourceId;
    if (!sourceId) return;

    const targetParentPathOrId = targetNode && targetNode.type === 'folder' ? targetNode.id : null;
    const res = filesystemService.move(sourceId, targetParentPathOrId);

    if (res.success) {
      onFilesChanged([...filesystemService.getFiles()]);
      showToast('Moved item successfully');
    } else {
      showToast(res.error || 'Move failed');
    }
    setDragSourceId(null);
  };

  // --- Context Menu Trigger ---
  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (node) {
      setSelectedId(node.id);
    }

    // Viewport bound calculation
    const menuWidth = 180;
    const menuHeight = 220;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setContextMenu({ x, y, targetNode: node });
  };

  // --- Recursive Tree Rendering ---
  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isSelected = node.id === selectedId;
      const isDragTarget = dragOverNodeId === node.id;
      const isCut = clipboard?.id === node.id && clipboard?.mode === 'cut';

      if (node.type === 'folder') {
        const isEditingThis = inlineEdit?.type === 'rename' && inlineEdit?.nodeId === node.id;
        const isAddingChild =
          (inlineEdit?.type === 'new-file' || inlineEdit?.type === 'new-folder') &&
          inlineEdit?.parentPathOrId === node.id;

        return (
          <div key={node.id} className="select-none">
            {/* Folder Row */}
            <div
              draggable={!inlineEdit}
              onDragStart={(e) => handleDragStart(e, node)}
              onDragOver={(e) => handleDragOver(e, node)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, node)}
              onClick={(e) => handleToggleFolder(node.id, e)}
              onContextMenu={(e) => handleContextMenu(e, node)}
              style={{ paddingLeft: `${depth * 12 + 6}px` }}
              className={`group flex items-center justify-between py-1 px-1.5 rounded cursor-pointer text-xs transition-colors relative ${
                isCut ? 'opacity-50 border-dashed border border-zinc-500' : ''
              } ${
                isDragTarget
                  ? 'bg-blue-600/30 outline outline-1 outline-blue-500 text-blue-100'
                  : isSelected
                  ? 'bg-blue-600/20 text-blue-200 font-medium'
                  : 'hover:bg-zinc-800/60 text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                {/* Expand / Collapse Chevron */}
                <span className="shrink-0 text-zinc-500 group-hover:text-zinc-300">
                  {node.isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>

                {/* Folder Icon */}
                <span className="shrink-0">
                  {node.isOpen ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </span>

                {/* Inline Rename or Name Label */}
                {isEditingThis ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCommitInlineEdit(inlineInputRef.current?.value || '');
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0"
                  >
                    <input
                      ref={inlineInputRef}
                      defaultValue={inlineEdit.initialValue}
                      onBlur={(e) => handleCommitInlineEdit(e.target.value)}
                      className="w-full bg-[#121214] border border-blue-500 text-white rounded px-1 py-0.5 text-xs outline-hidden"
                    />
                  </form>
                ) : (
                  <span className="truncate">{node.name}</span>
                )}
              </div>

              {/* Hover Quick Actions */}
              <div className="hidden group-hover:flex items-center space-x-0.5 shrink-0 pl-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartCreate('new-file', node.id);
                  }}
                  title="New File in Folder"
                  className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                >
                  <FilePlus className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartCreate('new-folder', node.id);
                  }}
                  title="New Folder in Folder"
                  className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModal({ isOpen: true, node });
                  }}
                  title="Delete Folder"
                  className="p-1 hover:bg-rose-900/60 rounded text-zinc-400 hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Folder Children */}
            {node.isOpen && (
              <div className="relative">
                {/* Indent Guide Line */}
                <div
                  className="absolute top-0 bottom-0 border-l border-zinc-800/80 pointer-events-none"
                  style={{ left: `${depth * 12 + 12}px` }}
                />

                {/* Inline item creation row if adding inside this folder */}
                {isAddingChild && (
                  <div
                    style={{ paddingLeft: `${(depth + 1) * 12 + 18}px` }}
                    className="py-1 px-1.5 flex items-center gap-1.5 bg-[#141418] border border-blue-500/50 rounded my-0.5"
                  >
                    {inlineEdit.type === 'new-folder' ? (
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <FileIcon filename={inlineEdit.initialValue} className="w-3.5 h-3.5" />
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCommitInlineEdit(inlineInputRef.current?.value || '');
                      }}
                      className="flex-1 min-w-0"
                    >
                      <input
                        ref={inlineInputRef}
                        defaultValue={inlineEdit.initialValue}
                        onBlur={(e) => handleCommitInlineEdit(e.target.value)}
                        className="w-full bg-[#18181b] border border-blue-500 text-white rounded px-1.5 py-0.5 text-xs outline-hidden"
                      />
                    </form>
                  </div>
                )}

                {node.children && renderTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      // File Row
      const isEditingThis = inlineEdit?.type === 'rename' && inlineEdit?.nodeId === node.id;

      return (
        <div
          key={node.id}
          draggable={!inlineEdit}
          onDragStart={(e) => handleDragStart(e, node)}
          onClick={(e) => handleSelectNode(node, e)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          style={{ paddingLeft: `${depth * 12 + 18}px` }}
          className={`group flex items-center justify-between py-1 px-1.5 rounded cursor-pointer text-xs transition-colors select-none ${
            isCut ? 'opacity-50 border-dashed border border-zinc-500' : ''
          } ${
            isSelected
              ? 'bg-blue-600/20 text-blue-200 font-medium'
              : 'hover:bg-zinc-800/60 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
            <FileIcon filename={node.name} className="w-3.5 h-3.5" />

            {isEditingThis ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCommitInlineEdit(inlineInputRef.current?.value || '');
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0"
              >
                <input
                  ref={inlineInputRef}
                  defaultValue={inlineEdit.initialValue}
                  onBlur={(e) => handleCommitInlineEdit(e.target.value)}
                  className="w-full bg-[#121214] border border-blue-500 text-white rounded px-1 py-0.5 text-xs outline-hidden"
                />
              </form>
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>

          {/* Indicators & Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {node.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
            )}
            <div className="hidden group-hover:flex items-center space-x-0.5 pl-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInlineEdit({
                    type: 'rename',
                    nodeId: node.id,
                    parentPathOrId: null,
                    initialValue: node.name
                  });
                }}
                title="Rename (F2)"
                className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(node.id);
                }}
                title="Duplicate File"
                className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModal({ isOpen: true, node });
                }}
                title="Delete File"
                className="p-1 hover:bg-rose-900/60 rounded text-zinc-400 hover:text-rose-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => handleContextMenu(e, null)}
      onDragOver={(e) => handleDragOver(e, null)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, null)}
      className="flex flex-col h-full overflow-hidden select-none outline-hidden"
    >
      {/* 1. TOP EXPLORER CONTROLS */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] bg-[#141418] text-xs">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-300 truncate">
          <span>{workspaceName}</span>
        </div>

        <div className="flex items-center space-x-0.5 text-zinc-400">
          <button
            onClick={() => handleStartCreate('new-file', selectedParentId)}
            title="New File"
            className="p-1 hover:bg-zinc-800 rounded hover:text-white transition"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartCreate('new-folder', selectedParentId)}
            title="New Folder"
            className="p-1 hover:bg-zinc-800 rounded hover:text-white transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRefresh}
            title="Refresh Explorer"
            className="p-1 hover:bg-zinc-800 rounded hover:text-white transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCollapseAll}
            title="Collapse All Folders"
            className="p-1 hover:bg-zinc-800 rounded hover:text-white transition"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </button>
          {onOpenDirectoryFromDisk && (
            <button
              onClick={onOpenDirectoryFromDisk}
              title="Open Local Folder (File System Access API)"
              className="p-1 hover:bg-zinc-800 rounded hover:text-blue-400 transition"
            >
              <FolderInput className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. SEARCH / QUICK FILTER INPUT */}
      <div className="px-2.5 py-1.5 bg-[#121214] border-b border-[#27272a]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Filter files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] rounded pl-7 pr-6 py-1 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 p-0.5 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. FILE TREE VIEW AREA */}
      <div
        className={`flex-1 overflow-y-auto p-1 text-xs space-y-0.5 ${
          dragOverNodeId === 'root' ? 'bg-blue-600/10 outline outline-1 outline-blue-500/50' : ''
        }`}
      >
        {/* Inline item creation row if adding at Root */}
        {inlineEdit && !inlineEdit.parentPathOrId && (
          <div className="py-1 px-2 flex items-center gap-2 bg-[#141418] border border-blue-500/60 rounded my-1">
            {inlineEdit.type === 'new-folder' ? (
              <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <FileIcon filename={inlineEdit.initialValue} className="w-3.5 h-3.5" />
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCommitInlineEdit(inlineInputRef.current?.value || '');
              }}
              className="flex-1 min-w-0"
            >
              <input
                ref={inlineInputRef}
                defaultValue={inlineEdit.initialValue}
                onBlur={(e) => handleCommitInlineEdit(e.target.value)}
                className="w-full bg-[#18181b] border border-blue-500 text-white rounded px-1.5 py-0.5 text-xs outline-hidden"
              />
            </form>
          </div>
        )}

        {filteredFiles.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-xs">
            {searchQuery
              ? 'No matching files found'
              : 'Workspace is empty. Use New File or New Folder above to get started.'}
          </div>
        ) : (
          renderTree(filteredFiles)
        )}
      </div>

      {/* 4. NOTIFICATION TOAST */}
      {toastMessage && (
        <div className="px-3 py-1.5 bg-blue-600/90 text-white text-[11px] font-medium border-t border-blue-400/30 flex items-center justify-between">
          <span className="truncate">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-0.5 hover:opacity-80">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 5. CONTEXT MENU */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-44 bg-[#1e1e24] border border-[#3f3f46] rounded-md shadow-2xl py-1 text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-75"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetNode ? (
            contextMenu.targetNode.type === 'file' ? (
              // FILE CONTEXT MENU: Open, Rename, Duplicate, Cut, Copy, Delete
              <>
                <button
                  onClick={() => {
                    onSelectFile(contextMenu.targetNode!.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-blue-600/30 hover:text-blue-100 transition text-left"
                >
                  <span>Open</span>
                  <span className="text-[10px] text-zinc-500 font-mono">↵</span>
                </button>
                <button
                  onClick={() => {
                    const node = contextMenu.targetNode!;
                    setInlineEdit({
                      type: 'rename',
                      nodeId: node.id,
                      parentPathOrId: null,
                      initialValue: node.name
                    });
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Rename</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">F2</span>
                </button>
                <button
                  onClick={() => {
                    handleDuplicate(contextMenu.targetNode!.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800 transition text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Duplicate</span>
                </button>
                <div className="h-px bg-zinc-800 my-1" />
                <button
                  onClick={() => {
                    filesystemService.setClipboard(contextMenu.targetNode!.id, 'cut');
                    setClipboard(filesystemService.getClipboard());
                    showToast('Cut file to clipboard');
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Cut</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘X</span>
                </button>
                <button
                  onClick={() => {
                    filesystemService.setClipboard(contextMenu.targetNode!.id, 'copy');
                    setClipboard(filesystemService.getClipboard());
                    showToast('Copied file');
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘C</span>
                </button>
                <div className="h-px bg-zinc-800 my-1" />
                <button
                  onClick={() => {
                    const node = contextMenu.targetNode!;
                    setContextMenu(null);
                    setDeleteModal({ isOpen: true, node });
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-950/60 text-rose-300 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-70">Del</span>
                </button>
              </>
            ) : (
              // FOLDER CONTEXT MENU: New File, New Folder, Rename, Copy, Cut, Paste, Delete
              <>
                <button
                  onClick={() => {
                    handleStartCreate('new-file', contextMenu.targetNode!.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800 transition text-left"
                >
                  <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>New File</span>
                </button>
                <button
                  onClick={() => {
                    handleStartCreate('new-folder', contextMenu.targetNode!.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800 transition text-left"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>New Folder</span>
                </button>
                <div className="h-px bg-zinc-800 my-1" />
                <button
                  onClick={() => {
                    const node = contextMenu.targetNode!;
                    setInlineEdit({
                      type: 'rename',
                      nodeId: node.id,
                      parentPathOrId: null,
                      initialValue: node.name
                    });
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Rename</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">F2</span>
                </button>
                <button
                  onClick={() => {
                    filesystemService.setClipboard(contextMenu.targetNode!.id, 'copy');
                    setClipboard(filesystemService.getClipboard());
                    showToast('Copied folder');
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘C</span>
                </button>
                <button
                  onClick={() => {
                    filesystemService.setClipboard(contextMenu.targetNode!.id, 'cut');
                    setClipboard(filesystemService.getClipboard());
                    showToast('Cut folder');
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Cut</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘X</span>
                </button>
                <button
                  disabled={!clipboard}
                  onClick={() => {
                    handlePasteAction(contextMenu.targetNode!.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 disabled:opacity-40 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Clipboard className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Paste</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">⌘V</span>
                </button>
                <div className="h-px bg-zinc-800 my-1" />
                <button
                  onClick={() => {
                    const node = contextMenu.targetNode!;
                    setContextMenu(null);
                    setDeleteModal({ isOpen: true, node });
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-950/60 text-rose-300 transition text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-70">Del</span>
                </button>
              </>
            )
          ) : (
            // EMPTY SPACE CONTEXT MENU: New File, New Folder, Paste, Refresh
            <>
              <button
                onClick={() => {
                  handleStartCreate('new-file', null);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800 transition text-left"
              >
                <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
                <span>New File</span>
              </button>
              <button
                onClick={() => {
                  handleStartCreate('new-folder', null);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800 transition text-left"
              >
                <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
                <span>New Folder</span>
              </button>
              <button
                disabled={!clipboard}
                onClick={() => {
                  handlePasteAction(null);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-zinc-800 disabled:opacity-40 transition text-left"
              >
                <span className="flex items-center gap-1.5">
                  <Clipboard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Paste</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">⌘V</span>
              </button>
              <div className="h-px bg-zinc-800 my-1" />
              <button
                onClick={() => {
                  handleRefresh();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800 transition text-left"
              >
                <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Refresh Explorer</span>
              </button>
              <button
                onClick={() => {
                  handleCollapseAll();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800 transition text-left"
              >
                <ChevronsDownUp className="w-3.5 h-3.5 text-zinc-400" />
                <span>Collapse All</span>
              </button>
              {onOpenDirectoryFromDisk && (
                <button
                  onClick={() => {
                    onOpenDirectoryFromDisk();
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-zinc-800 text-blue-400 transition text-left"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Open Local Folder...</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* 6. POLISHED CONFIRMATION DIALOG FOR DESTRUCTIVE ACTIONS */}
      {deleteModal.isOpen && deleteModal.node && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-sm bg-[#18181b] border border-[#3f3f46] rounded-xl shadow-2xl p-4 text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Delete {deleteModal.node.type === 'folder' ? 'Folder' : 'File'}?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-mono text-zinc-200 font-medium">"{deleteModal.node.name}"</span>?
                  {deleteModal.node.type === 'folder' &&
                    ' This will delete all files and subfolders inside it.'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteModal({ isOpen: false, node: null })}
                className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              >
                Cancel
              </button>
              <button
                autoFocus
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 text-xs rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
