import React, { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import type { ResourceGovernorStatus } from '../types';

const DEFAULT_RESOURCE_STATUS: ResourceGovernorStatus = {
  memoryPressureState: 'nominal',
  effectiveConcurrencyLimit: 4,
  queuedTasksCount: 0,
  activeLeases: {
    executionSlots: 0,
    subprocesses: 0,
    browserSessions: 0,
  },
  telemetry: {
    totalMemoryBytes: 8 * 1024 * 1024 * 1024,
    freeMemoryBytes: 5.4 * 1024 * 1024 * 1024,
    usedMemoryPercent: 32,
    processRssBytes: 128 * 1024 * 1024,
    systemCpuPercent: 4,
    loadAverage1m: 0.15,
    platform: 'linux',
  },
} as any;

export const ResourceStatusIndicator: React.FC<{ isLight?: boolean }> = ({ isLight = false }) => {
  const [status, setStatus] = useState<ResourceGovernorStatus>(DEFAULT_RESOURCE_STATUS);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/system/resources');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = (await res.json()) as ResourceGovernorStatus;
          if (mounted && data) {
            setStatus({
              ...DEFAULT_RESOURCE_STATUS,
              ...data,
              activeLeases: {
                ...DEFAULT_RESOURCE_STATUS.activeLeases,
                ...(data.activeLeases || {}),
              },
              telemetry: {
                ...DEFAULT_RESOURCE_STATUS.telemetry,
                ...(data.telemetry || {}),
              },
            });
          }
        }
      } catch {
        // silent fail
      }
    };

    fetchStatus();
    // Low frequency refresh (60s) to avoid ingress rate limits
    const interval = setInterval(fetchStatus, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const pressure = status?.memoryPressureState || 'nominal';
  const isCritical = pressure === 'critical';
  const isElevated = pressure === 'elevated';

  const dotColor = isCritical
    ? 'bg-rose-500'
    : isElevated
    ? 'bg-amber-400'
    : 'bg-emerald-400/80';

  const totalMem = status?.telemetry?.totalMemoryBytes ?? (8 * 1024 * 1024 * 1024);
  const freeMem = status?.telemetry?.freeMemoryBytes ?? (5.4 * 1024 * 1024 * 1024);
  const usedMemGb = Math.round((totalMem - freeMem) / (1024 * 1024 * 1024));
  const totalMemGb = Math.round(totalMem / (1024 * 1024 * 1024));

  const slots = status?.activeLeases?.executionSlots ?? 0;
  const limit = status?.effectiveConcurrencyLimit ?? 4;

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono select-none transition-colors border cursor-default ${
          isLight
            ? 'border-[#dcdce2] bg-[#f4f4f7] text-[#4b4a54]'
            : 'border-[#2b2b30] bg-[#1c1b20] text-neutral-300'
        }`}
        title="MedioBot Resource Governor"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
        <span className="text-[10px] tracking-tight">
          {slots}/{limit}
        </span>
      </div>

      {showTooltip && (
        <div
          className={`absolute right-0 top-full mt-1.5 z-50 w-52 p-2.5 rounded-lg border text-xs shadow-xl backdrop-blur-md transition-all ${
            isLight
              ? 'bg-white/95 border-[#dcdce2] text-[#1c1b20]'
              : 'bg-[#18181b]/95 border-[#2e2e34] text-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 font-sans font-medium text-[11px]">
            <span className="flex items-center gap-1 text-neutral-400">
              <Cpu className="w-3 h-3" /> Resource Governor
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-1 py-0.5 rounded ${
                isCritical
                  ? 'bg-rose-500/20 text-rose-400'
                  : isElevated
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {pressure}
            </span>
          </div>

          <div className="space-y-1 font-mono text-[10.5px]">
            <div className="flex justify-between">
              <span className="text-neutral-400">Concurrency:</span>
              <span>
                {slots} / {limit} active
              </span>
            </div>
            {Number(status?.queuedTasksCount || 0) > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Queued Tasks:</span>
                <span>{status.queuedTasksCount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-400">Subprocesses:</span>
              <span>{status?.activeLeases?.subprocesses ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Browser Sessions:</span>
              <span>{status?.activeLeases?.browserSessions ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">System RAM:</span>
              <span>
                {usedMemGb}G / {totalMemGb}G ({status?.telemetry?.usedMemoryPercent ?? 32}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Backend process RSS:</span>
              <span>
                {Math.round((status?.telemetry?.processRssBytes ?? 134217728) / (1024 * 1024))} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">System CPU:</span>
              <span>
                {status?.telemetry?.systemCpuPercent === undefined
                  ? '4%'
                  : `${status.telemetry.systemCpuPercent}%`}
              </span>
            </div>
            {status?.telemetry?.platform !== 'win32' && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Load Avg (1m):</span>
                <span>{status?.telemetry?.loadAverage1m ?? '0.15'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
