import React, { useState } from 'react';
import { ThreadItem, Turn } from '../../types';
import {
  Brain,
  ListTodo,
  Search,
  FileEdit,
  Play,
  FlaskConical,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  XCircle,
  Clock,
  Users,
  RotateCcw,
} from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { ToolExecutionView } from './ToolExecutionView';
import { ApprovalBanner } from './ApprovalBanner';
import { PerceptionView } from './PerceptionView';
import { useApp } from '../../state/AppContext';
import { CompactionGlyph } from './subcomponents/ExecutionGlyphs';
import ThoughtLine from '../../components/ThoughtLine';

export const ActivityItem: React.FC<{
  item: ThreadItem;
  turnId: string;
  turnStatus?: Turn['status'];
  isActive?: boolean;
  isMainChat?: boolean;
}> = ({ item, turnId, turnStatus, isActive = false, isMainChat = false }) => {
  const { theme } = useApp();
  const isLight = theme === 'light';
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // If item is tool execution
  if (item.type === 'tool_execution' && item.tool) {
    return <ToolExecutionView tool={item.tool} />;
  }

  // If item is diff
  if (item.type === 'diff' && item.diff) {
    return <DiffViewer diff={item.diff} />;
  }

  // If item is approval request
  if (item.type === 'approval_request' && item.approval) {
    return <ApprovalBanner approval={item.approval} turnId={turnId} />;
  }

  // If item is context compaction
  if (
    (item.activityState as string) === 'compacted' ||
    item.activityLabel?.toLowerCase().includes('compact') ||
    item.text?.toLowerCase().includes('compacted')
  ) {
    const isCompactingNow =
      isActive || item.activityLabel?.toLowerCase().includes('compacting');
    return (
      <div
        data-testid="context-compacted"
        className={`flex items-center gap-2 py-1 text-[13px] select-none ${
          isLight ? 'text-neutral-500' : 'text-neutral-400'
        }`}
      >
        <CompactionGlyph className="w-3.5 h-3.5 shrink-0 opacity-80" />
        <span
          className={
            isCompactingNow
              ? `animate-shimmer-text bg-clip-text text-transparent ${
                  isLight
                    ? 'bg-gradient-to-r from-neutral-500 via-neutral-900 to-neutral-500'
                    : 'bg-gradient-to-r from-neutral-400 via-neutral-100 to-neutral-400'
                }`
              : ''
          }
        >
          {isCompactingNow ? 'Compacting context' : 'Context automatically compacted'}
        </span>
      </div>
    );
  }

  // If item is perception or computer action
  if (item.type === 'perception_snapshot' || item.type === 'computer_action') {
    return <PerceptionView computerAction={item.computerAction} perception={item.perception} />;
  }

  // In Main Chat, strip raw specialist activity chatter so the timeline stays calm and scannable
  if (isMainChat) {
    return null;
  }

  // Activity steps (Thinking, Planning, Inspecting, Editing, Running, Testing, Verifying)
  const getIcon = () => {
    const isFailedLabel =
      item.activityState === 'failed' ||
      item.activityLabel?.toLowerCase().includes('fail') ||
      item.text?.toLowerCase().includes('fail') ||
      item.activityLabel?.toLowerCase().includes('error') ||
      item.text?.toLowerCase().includes('error');

    const mutedIconColor = isLight ? 'text-neutral-400' : 'text-neutral-500';

    if (isFailedLabel || (turnStatus === 'failed' && isActive)) {
      return <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    }
    if (turnStatus === 'cancelled' || item.activityState === 'cancelled') {
      return <XCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />;
    }
    if (turnStatus === 'waiting_approval' && isActive) {
      return <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (isActive) {
      return (
        <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`} />
      );
    }

    switch (item.activityState) {
      case 'thinking':
        return <Brain className={`w-3.5 h-3.5 ${mutedIconColor} shrink-0`} />;
      case 'planning':
        return <ListTodo className={`w-3.5 h-3.5 ${mutedIconColor} shrink-0`} />;
      case 'inspecting':
        return <Search className={`w-3.5 h-3.5 ${mutedIconColor} shrink-0`} />;
      case 'editing':
        return <FileEdit className={`w-3.5 h-3.5 ${mutedIconColor} shrink-0`} />;
      case 'running':
        return <Play className={`w-3.5 h-3.5 ${mutedIconColor} shrink-0`} />;
      case 'testing':
        return <FlaskConical className={`w-3.5 h-3.5 ${mutedIconColor} shrink-0`} />;
      case 'verifying':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />;
      case 'verified':
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/75 shrink-0" />;
      case 'collaborating':
        return <Users className={`w-3.5 h-3.5 ${mutedIconColor} shrink-0`} />;
      case 'waiting':
      case 'waiting_for_approval':
        return <Clock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />;
      case 'retrying':
      case 'recovered':
        return <RotateCcw className={`w-3.5 h-3.5 ${mutedIconColor} shrink-0`} />;
      case 'blocked':
      case 'failed':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      default:
        if (turnStatus === 'failed') {
          return <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
        }
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/75 shrink-0" />;
    }
  };

  const hasDetail = Boolean(item.activityDetail);

  // Suppress mechanical lifecycle heartbeats that clutter the timeline
  const isHeartbeatNoise =
    !hasDetail &&
    (item.activityLabel?.endsWith('progress.') ||
      item.activityLabel?.endsWith('started.') ||
      item.activityLabel?.toLowerCase() === 'mediobot is working on the task.' ||
      item.activityLabel?.toLowerCase() === 'cody progress.' ||
      item.activityLabel?.toLowerCase() === 'maestro task started.' ||
      item.activityLabel?.toLowerCase() === 'cody started.');

  if (isHeartbeatNoise && !isActive) {
    return null;
  }

  return (
    <div className="py-0.5 select-none">
      <div
        onClick={() => hasDetail && setIsDetailOpen((p) => !p)}
        className={`group flex items-center justify-between gap-2 py-[3px] px-1.5 -mx-1.5 rounded-md text-[13px] transition-colors ${
          hasDetail
            ? isLight
              ? 'cursor-pointer hover:bg-black/[0.03] text-neutral-600 hover:text-neutral-900'
              : 'cursor-pointer hover:bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
            : isLight
            ? 'text-neutral-600'
            : 'text-neutral-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isActive ? (
            <ThoughtLine
              working={true}
              label={item.activityLabel || 'Thinking…'}
              glyph={item.activityState === 'thinking' || item.activityState === 'planning' ? 'sparkle' : 'dot'}
              fontSize={13}
              collapsible={false}
              showTimer={false}
              isLight={isLight}
              color={isLight ? '#52525b' : '#a1a1aa'}
              glyphColor={item.activityState === 'thinking' || item.activityState === 'planning' ? (isLight ? '#2563eb' : '#60a5fa') : (isLight ? '#52525b' : '#a1a1aa')}
            />
          ) : (
            <>
              <span className="shrink-0">{getIcon()}</span>
              <span
                className={`truncate ${
                  isLight ? 'text-neutral-700' : 'text-neutral-300'
                }`}
              >
                {item.activityLabel || 'Activity'}
              </span>
            </>
          )}

          {hasDetail && (
            <span className={isLight ? 'text-neutral-400' : 'text-neutral-500'}>
              {isDetailOpen ? (
                <ChevronDown className="w-3 h-3 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
              )}
            </span>
          )}
        </div>

        {item.durationMs && (
          <span
            className={`text-[11px] font-mono tabular-nums shrink-0 ${
              isLight ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            {(item.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {isDetailOpen && item.activityDetail && (
        <div
          className={`mt-1 mb-1.5 ml-5 p-2.5 rounded-lg border text-[11.5px] font-mono leading-relaxed whitespace-pre-line ${
            isLight
              ? 'bg-[#f8f9fb] border-black/[0.08] text-neutral-700'
              : 'bg-white/[0.02] border-white/[0.06] text-neutral-300'
          }`}
        >
          {item.activityDetail}
        </div>
      )}
    </div>
  );
};

