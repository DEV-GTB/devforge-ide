import React from 'react';
import {
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  Archive,
  Database,
  Code2,
  Hash,
  Layers,
  FileSpreadsheet,
  Globe,
  Terminal,
  Settings,
  HelpCircle
} from 'lucide-react';

export type FileCategory =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'markdown'
  | 'python'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'rust'
  | 'go'
  | 'php'
  | 'sql'
  | 'xml'
  | 'yaml'
  | 'image'
  | 'audio'
  | 'video'
  | 'font'
  | 'archive'
  | 'unknown';

export interface FileTypeInfo {
  category: FileCategory;
  extension: string;
  label: string;
  color: string;
  bgColor?: string;
}

/**
 * Single reusable file-icon/type mapping system recognizing common extensions:
 * HTML, CSS, JavaScript, TypeScript, JSON, Markdown, Python, Java, C, C++, C#,
 * Rust, Go, PHP, SQL, XML, YAML, images, audio, video, fonts, archives, unknown files.
 */
export function getFileTypeInfo(filename: string): FileTypeInfo {
  const parts = filename.toLowerCase().split('.');
  const ext = parts.length > 1 ? parts.pop()! : '';

  // Specific special filenames
  const lowerName = filename.toLowerCase();
  if (lowerName === 'dockerfile') return { category: 'unknown', extension: 'dockerfile', label: '🐳', color: '#38bdf8' };
  if (lowerName.startsWith('.env')) return { category: 'unknown', extension: 'env', label: '⚙️', color: '#fbbf24' };
  if (lowerName === '.gitignore') return { category: 'unknown', extension: 'git', label: 'GIT', color: '#f97316' };

  switch (ext) {
    // HTML
    case 'html':
    case 'htm':
    case 'xhtml':
      return { category: 'html', extension: ext, label: '<>', color: '#e34f26' };

    // CSS
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return { category: 'css', extension: ext, label: '#', color: '#264de4' };

    // JavaScript
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return { category: 'javascript', extension: ext, label: 'JS', color: '#f7df1e' };

    // TypeScript
    case 'ts':
      return { category: 'typescript', extension: ext, label: 'TS', color: '#3178c6' };
    case 'tsx':
      return { category: 'typescript', extension: ext, label: 'TSX', color: '#38bdf8' };

    // JSON
    case 'json':
    case 'jsonc':
    case 'json5':
      return { category: 'json', extension: ext, label: '{}', color: '#f59e0b' };

    // Markdown
    case 'md':
    case 'markdown':
    case 'mdown':
    case 'mkd':
      return { category: 'markdown', extension: ext, label: 'M↓', color: '#38bdf8' };

    // Python
    case 'py':
    case 'pyw':
    case 'ipynb':
      return { category: 'python', extension: ext, label: 'PY', color: '#3776ab' };

    // Java
    case 'java':
    case 'class':
    case 'jar':
      return { category: 'java', extension: ext, label: '☕', color: '#f89820' };

    // C
    case 'c':
    case 'h':
      return { category: 'c', extension: ext, label: 'C', color: '#60a5fa' };

    // C++
    case 'cpp':
    case 'cxx':
    case 'cc':
    case 'hpp':
    case 'hxx':
      return { category: 'cpp', extension: ext, label: 'C++', color: '#00599c' };

    // C#
    case 'cs':
      return { category: 'csharp', extension: ext, label: 'C#', color: '#a855f7' };

    // Rust
    case 'rs':
      return { category: 'rust', extension: ext, label: 'RS', color: '#dea584' };

    // Go
    case 'go':
      return { category: 'go', extension: ext, label: 'GO', color: '#00add8' };

    // PHP
    case 'php':
    case 'phtml':
      return { category: 'php', extension: ext, label: 'PHP', color: '#777bb4' };

    // SQL
    case 'sql':
    case 'sqlite':
    case 'db':
      return { category: 'sql', extension: ext, label: 'SQL', color: '#336791' };

    // XML & SVG
    case 'xml':
      return { category: 'xml', extension: ext, label: 'XML', color: '#f28d1a' };
    case 'svg':
      return { category: 'xml', extension: ext, label: 'SVG', color: '#f59e0b' };

    // YAML
    case 'yaml':
    case 'yml':
      return { category: 'yaml', extension: ext, label: 'YML', color: '#cb171e' };

    // Images
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'ico':
    case 'bmp':
    case 'tiff':
      return { category: 'image', extension: ext, label: 'IMG', color: '#10b981' };

    // Audio
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'aac':
    case 'm4a':
      return { category: 'audio', extension: ext, label: 'AUD', color: '#c084fc' };

    // Video
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'mkv':
    case 'avi':
      return { category: 'video', extension: ext, label: 'VID', color: '#f43f5e' };

    // Fonts
    case 'woff':
    case 'woff2':
    case 'ttf':
    case 'otf':
    case 'eot':
      return { category: 'font', extension: ext, label: 'FNT', color: '#a1a1aa' };

    // Archives
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
    case 'tgz':
      return { category: 'archive', extension: ext, label: 'ZIP', color: '#eab308' };

    default:
      return { category: 'unknown', extension: ext || 'txt', label: '•', color: '#94a3b8' };
  }
}

interface FileIconProps {
  filename: string;
  isFolder?: boolean;
  isOpen?: boolean;
  className?: string;
}

/**
 * Reusable File & Folder Icon Component
 */
export function FileIcon({ filename, isFolder, isOpen, className = 'w-4 h-4' }: FileIconProps) {
  if (isFolder) {
    return isOpen ? (
      <FolderOpen className={`${className} text-amber-400 shrink-0`} />
    ) : (
      <Folder className={`${className} text-amber-400 shrink-0`} />
    );
  }

  const info = getFileTypeInfo(filename);

  switch (info.category) {
    case 'html':
      return <Globe className={className} style={{ color: info.color }} />;
    case 'css':
      return <Hash className={className} style={{ color: info.color }} />;
    case 'javascript':
    case 'typescript':
    case 'python':
    case 'java':
    case 'c':
    case 'cpp':
    case 'csharp':
    case 'rust':
    case 'go':
    case 'php':
      return (
        <span
          className="font-mono text-[9px] font-bold px-1 py-0.2 rounded shrink-0 leading-tight select-none"
          style={{
            color: info.color,
            backgroundColor: `${info.color}15`,
            border: `1px solid ${info.color}35`
          }}
        >
          {info.label}
        </span>
      );
    case 'json':
      return <FileJson className={className} style={{ color: info.color }} />;
    case 'markdown':
      return <FileText className={className} style={{ color: info.color }} />;
    case 'sql':
      return <Database className={className} style={{ color: info.color }} />;
    case 'xml':
    case 'yaml':
      return <Code2 className={className} style={{ color: info.color }} />;
    case 'image':
      return <ImageIcon className={className} style={{ color: info.color }} />;
    case 'audio':
      return <Music className={className} style={{ color: info.color }} />;
    case 'video':
      return <VideoIcon className={className} style={{ color: info.color }} />;
    case 'font':
      return <FileText className={className} style={{ color: info.color }} />;
    case 'archive':
      return <Archive className={className} style={{ color: info.color }} />;
    default:
      return <File className={`${className} text-zinc-400 shrink-0`} />;
  }
}
