import React from 'react';
import { FileCode, FileText, Settings, File } from 'lucide-react';
import { useApp } from '../../state/AppContext';

export interface UnboxedFileMentionProps {
  filePath: string;
  isLight?: boolean;
  className?: string;
}

function resolveFileIcon(path: string, color: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'cpp', 'c', 'go'].includes(ext ?? '')) {
    return <FileCode className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  }
  if (['json', 'yaml', 'yml', 'toml', 'env'].includes(ext ?? '')) {
    return <Settings className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  }
  if (['md', 'txt', 'rst'].includes(ext ?? '')) {
    return <FileText className={`w-3.5 h-3.5 ${color} shrink-0`} />;
  }
  return <File className={`w-3.5 h-3.5 ${color} shrink-0`} />;
}

/**
 * Unboxed file mentions: file paths rendered unboxed with native file icons
 * and hover underlines navigating to workspace graph or opening in editor.
 */
export const UnboxedFileMention: React.FC<UnboxedFileMentionProps> = ({
  filePath,
  isLight = false,
  className = '',
}) => {
  const { openFileTab } = useApp();
  const iconColor = isLight ? 'text-neutral-500' : 'text-neutral-400';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof openFileTab === 'function') {
      openFileTab(filePath);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={`file-mention-${filePath.replace(/[/\\:.]/g, '-')}`}
      className={`inline-flex items-center gap-1.5 font-mono text-xs cursor-pointer hover:underline focus:outline-none transition-colors ${
        isLight
          ? 'text-neutral-800 hover:text-sky-600'
          : 'text-neutral-200 hover:text-sky-400'
      } ${className}`}
      title={`Open ${filePath}`}
    >
      {resolveFileIcon(filePath, iconColor)}
      <span className="font-medium truncate">{filePath}</span>
    </button>
  );
};
