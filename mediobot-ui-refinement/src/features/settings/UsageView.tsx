import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle2,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface UsageViewProps {
  isLight?: boolean;
}

export const UsageView: React.FC<UsageViewProps> = ({ isLight = false }) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [resetDone, setResetDone] = useState(false);

  const modelUsage = [
    {
      name: 'Gemini 3.8 Flash',
      tag: 'Default Reasoning & Code',
      tokens: 198420,
      requests: 1120,
      costPct: 62,
      latency: '118ms',
      color: 'bg-blue-500',
    },
    {
      name: 'Gemini 3.1 Pro Preview',
      tag: 'Deep Architecture & Multi-turn',
      tokens: 64120,
      requests: 185,
      costPct: 24,
      latency: '340ms',
      color: 'bg-emerald-500',
    },
    {
      name: 'Gemini 3.1 Flash Lite',
      tag: 'Autocomplete & Fast Tool Loop',
      tokens: 22000,
      requests: 124,
      costPct: 14,
      latency: '82ms',
      color: 'bg-purple-500',
    },
  ];

  const recentCalls = [
    { id: 'req_8921', model: 'gemini-3.8-flash', promptTokens: 412, completionTokens: 184, latency: '124ms', time: '2m ago', status: '200 OK' },
    { id: 'req_8920', model: 'gemini-3.8-flash', promptTokens: 890, completionTokens: 320, latency: '138ms', time: '14m ago', status: '200 OK' },
    { id: 'req_8919', model: 'gemini-3.1-pro-preview', promptTokens: 1820, completionTokens: 640, latency: '380ms', time: '42m ago', status: '200 OK' },
    { id: 'req_8918', model: 'gemini-3.8-flash', promptTokens: 512, completionTokens: 210, latency: '112ms', time: '1h ago', status: '200 OK' },
    { id: 'req_8917', model: 'gemini-3.1-flash-lite', promptTokens: 240, completionTokens: 96, latency: '86ms', time: '3h ago', status: '200 OK' },
  ];

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      exportedAt: new Date().toISOString(),
      timeRange,
      totalTokens: 284540,
      totalRequests: 1429,
      modelBreakdown: modelUsage,
      recentCalls,
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mediobot-usage-${timeRange}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleReset = () => {
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn" data-testid="usage-dashboard">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-[28px] font-semibold tracking-tight ${isLight ? 'text-[#1f2937]' : 'text-[#e5e5e7]'}`}>
            Usage
          </h1>
          <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-[#4b5563]' : 'text-neutral-400'}`}>
            Track your model token consumption, real-time request volume, and API quota utilization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Filter Pills */}
          <div className={`flex items-center p-0.5 rounded-lg border ${isLight ? 'bg-[#f0f0f3] border-[#dcdce2]' : 'bg-[#222227] border-[#2e2e34]'}`}>
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  timeRange === r
                    ? isLight
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'bg-[#32313a] text-white shadow-xs'
                    : isLight
                    ? 'text-neutral-500 hover:text-neutral-800'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-neutral-50 border-[#dcdce2] text-neutral-700'
                : 'bg-[#242429] hover:bg-[#2e2e34] border-[#34343c] text-neutral-200'
            }`}
            title="Export usage report as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tokens */}
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-[#fbfbfd] border-[#e2e4e8]' : 'bg-[#1e1e23] border-[#2b2b32]'}`}>
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-medium">Total Tokens</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-semibold tracking-tight ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
            284,540
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>+14.2% vs previous period</span>
          </div>
        </div>

        {/* Card 2: Total Requests */}
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-[#fbfbfd] border-[#e2e4e8]' : 'bg-[#1e1e23] border-[#2b2b32]'}`}>
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-medium">API Requests</span>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div className={`text-2xl font-semibold tracking-tight ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
            1,429
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>99.8% successful execution</span>
          </div>
        </div>

        {/* Card 3: Avg Latency */}
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-[#fbfbfd] border-[#e2e4e8]' : 'bg-[#1e1e23] border-[#2b2b32]'}`}>
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-medium">Average Latency</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className={`text-2xl font-semibold tracking-tight ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
            132 ms
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            <span>Fast token-to-first-byte (TTFB)</span>
          </div>
        </div>

        {/* Card 4: Quota Status */}
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-[#fbfbfd] border-[#e2e4e8]' : 'bg-[#1e1e23] border-[#2b2b32]'}`}>
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-medium">Quota Used</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-semibold tracking-tight ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
            18.5%
          </div>
          <div className="mt-2 w-full bg-neutral-700/30 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '18.5%' }} />
          </div>
        </div>
      </div>

      {/* Model Breakdown Section */}
      <div className={`rounded-xl border p-5 ${isLight ? 'bg-[#fbfbfd] border-[#e2e4e8]' : 'bg-[#1e1e23] border-[#2b2b32]'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-sm font-semibold ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
              Consumption by Model
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Token volume and request split across active providers.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">3 models active</span>
        </div>

        <div className="space-y-4">
          {modelUsage.map((m) => (
            <div key={m.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.color}`} />
                  <span className={`font-medium ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>
                    {m.name}
                  </span>
                  <span className="text-[11px] text-neutral-400 hidden sm:inline">
                    — {m.tag}
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span className="text-neutral-400">{m.requests} calls</span>
                  <span className="font-medium">{m.tokens.toLocaleString()} tokens ({m.costPct}%)</span>
                </div>
              </div>
              <div className="w-full bg-neutral-700/20 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${m.color} transition-all duration-500`}
                  style={{ width: `${m.costPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent API Logs Table */}
      <div className={`rounded-xl border p-5 ${isLight ? 'bg-[#fbfbfd] border-[#e2e4e8]' : 'bg-[#1e1e23] border-[#2b2b32]'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-sm font-semibold ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`}>
              Recent Model Invocations
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Real-time audit log of executed inference and tool turns.
            </p>
          </div>
          <button
            onClick={handleReset}
            className={`flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${
              resetDone ? 'text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{resetDone ? 'Counters Reset' : 'Reset Metrics'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className={`border-b ${isLight ? 'border-neutral-200 text-neutral-500' : 'border-neutral-800 text-neutral-400'} text-[11px]`}>
                <th className="pb-2.5 font-medium">Request ID</th>
                <th className="pb-2.5 font-medium">Model</th>
                <th className="pb-2.5 font-medium">Prompt</th>
                <th className="pb-2.5 font-medium">Completion</th>
                <th className="pb-2.5 font-medium">Latency</th>
                <th className="pb-2.5 font-medium">Status</th>
                <th className="pb-2.5 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-neutral-100 text-neutral-700' : 'divide-neutral-800/60 text-neutral-300'}`}>
              {recentCalls.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 font-semibold text-neutral-400">{log.id}</td>
                  <td className="py-2.5 font-sans font-medium">{log.model}</td>
                  <td className="py-2.5 text-neutral-400">{log.promptTokens}</td>
                  <td className="py-2.5 text-neutral-400">{log.completionTokens}</td>
                  <td className="py-2.5">{log.latency}</td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-neutral-400">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
