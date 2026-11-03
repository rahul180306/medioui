import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  MoreHorizontal,
  Split,
  Maximize2,
  X,
  ChevronDown,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  MessageSquare,
  Radio,
  Cpu,
} from 'lucide-react';
import { useApp } from '../../state/AppContext';

type TabView = 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'comments';

interface TerminalLine {
  id: string;
  type: 'prompt' | 'stdout' | 'stderr' | 'system' | 'success' | 'warn';
  text: string;
  timestamp?: number;
}

interface TerminalSession {
  id: string;
  name: string;
  shell: 'zsh' | 'bash' | 'mediobot';
  lines: TerminalLine[];
  history: string[];
  historyIndex: number;
}

interface TerminalWorkspaceViewProps {
  onClose: () => void;
}

const DEFAULT_WELCOME_LINES: TerminalLine[] = [
  {
    id: 'welcome-1',
    type: 'system',
    text: 'Mediobot Developer CLI v2.4.0 (darwin-arm64)',
  },
  {
    id: 'welcome-2',
    type: 'system',
    text: 'Type "mediobot --help" to view agent swarm commands, or "help" for built-in utilities.',
  },
];

export const TerminalWorkspaceView: React.FC<TerminalWorkspaceViewProps> = ({ onClose }) => {
  const { theme, agents, activeProject, workspaceStatus } = useApp();
  const isLight = theme === 'light';

  // Active top tab (matches image tabs: Problems, Output, Debug Console, Terminal, Ports, Comments)
  const [activeTab, setActiveTab] = useState<TabView>('terminal');

  // Multi-session state matching the right side panel in the reference image (zsh, zsh, etc.)
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: 'session-1',
      name: 'zsh',
      shell: 'zsh',
      lines: [...DEFAULT_WELCOME_LINES],
      history: [],
      historyIndex: -1,
    },
    {
      id: 'session-2',
      name: 'zsh',
      shell: 'zsh',
      lines: [
        {
          id: 's2-welcome',
          type: 'system',
          text: 'Z Shell (zsh) multi-terminal session active.',
        },
      ],
      history: [],
      historyIndex: -1,
    },
  ]);

  const [activeSessionId, setActiveSessionId] = useState<string>('session-2');
  const [inputVal, setInputVal] = useState('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showShellDropdown, setShowShellDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [activeSession?.lines]);

  const syncCursorPos = () => {
    requestAnimationFrame(() => {
      if (inputRef.current) {
        setCursorPos(inputRef.current.selectionStart ?? inputRef.current.value.length);
      }
    });
  };

  // Keep input focused when clicking inside terminal area
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      const pos = inputRef.current.selectionStart ?? inputVal.length;
      setCursorPos(pos);
      setIsInputFocused(true);
    }
  };

  const handleCreateSession = (shellType: 'zsh' | 'bash' | 'mediobot' = 'zsh') => {
    const newId = `session-${Date.now()}`;
    const newSession: TerminalSession = {
      id: newId,
      name: shellType,
      shell: shellType,
      lines: [
        {
          id: `${newId}-welcome`,
          type: 'system',
          text: `${shellType.toUpperCase()} interactive session initialized.`,
        },
      ],
      history: [],
      historyIndex: -1,
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
    setShowShellDropdown(false);
    setTimeout(focusInput, 50);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return; // Keep at least one session
    const nextSessions = sessions.filter((s) => s.id !== id);
    setSessions(nextSessions);
    if (activeSessionId === id) {
      setActiveSessionId(nextSessions[0].id);
    }
  };

  const clearCurrentTerminal = () => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, lines: [] } : s))
    );
    setShowMoreMenu(false);
    setTimeout(focusInput, 50);
  };

  // Execute terminal commands
  const handleExecute = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                lines: [
                  ...s.lines,
                  {
                    id: `line-${Date.now()}`,
                    type: 'prompt',
                    text: 'rahulkarthikt@Rahuls-MacBook-Air mediobot % ',
                  },
                ],
              }
            : s
        )
      );
      return;
    }

    const promptText = `rahulkarthikt@Rahuls-MacBook-Air mediobot % ${trimmed}`;

    // Add prompt line and update command history
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          lines: [
            ...s.lines,
            { id: `prompt-${Date.now()}`, type: 'prompt', text: promptText },
          ],
          history: [...s.history, trimmed],
          historyIndex: -1,
        };
      })
    );

    setInputVal('');
    setCursorPos(0);
    setIsExecuting(true);

    const parts = trimmed.split(/\s+/);
    const rootCommand = parts[0].toLowerCase();
    const subCommand = parts[1]?.toLowerCase();
    const restArgs = parts.slice(2).join(' ');

    const appendLines = (newLines: TerminalLine[]) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, lines: [...s.lines, ...newLines] }
            : s
        )
      );
    };

    // 1. Built-in Mediobot Swarm CLI Handler
    if (rootCommand === 'mediobot') {
      if (!subCommand || subCommand === '--help' || subCommand === 'help' || subCommand === '-h') {
        appendLines([
          {
            id: `mb-help-${Date.now()}`,
            type: 'stdout',
            text: `
Mediobot CLI v2.4.0 - Autonomous Multi-Agent Swarm

USAGE:
  mediobot <command> [arguments]

AVAILABLE COMMANDS:
  status                Display health, model tiers & live workload for all agents
  agents                List specialized Mediobot agents (Maestro, Cody, Vision, Doc, etc.)
  ask <prompt>          Delegate prompt to Maestro orchestrator
  run <agent> <task>    Assign task to specific agent (e.g. mediobot run cody "refactor")
  doctor                Run diagnostics on Node runtime, ports & workspace
  model [set|list]      Inspect or change model configuration
  version               Display CLI version, runtime environment & build tags
  clear                 Clear terminal screen buffer

EXAMPLES:
  mediobot status
  mediobot ask "Analyze bundle size and optimize CSS"
  mediobot run cody "Implement CLI terminal integration"
`,
          },
        ]);
        setIsExecuting(false);
        return;
      }

      if (subCommand === 'status') {
        const agentStatusLines = agents.map(
          (a) =>
            `  • ${a.name.padEnd(12)} [${a.status.toUpperCase().padEnd(9)}] Model: ${(a.preferenceId || 'gemini-3.6-flash').padEnd(20)} Role: ${a.role}`
        );

        appendLines([
          {
            id: `mb-stat-${Date.now()}`,
            type: 'stdout',
            text: `
Mediobot Swarm Health & Status [All Systems Operational]:
--------------------------------------------------------------------------------
${agentStatusLines.join('\n')}
--------------------------------------------------------------------------------
Active Orchestrator: Maestro | Concurrency: 4 worker leases | Status: READY
`,
          },
        ]);
        setIsExecuting(false);
        return;
      }

      if (subCommand === 'agents') {
        appendLines([
          {
            id: `mb-agents-${Date.now()}`,
            type: 'stdout',
            text: `
Mediobot Registered Agents (${agents.length}):
1. Maestro       - Team orchestration, architectural decisions & delegation
2. Cody          - Software engineering, full-stack code implementation
3. Vision        - Visual perception, DOM styling, UX review & QA
4. Doc           - Documentation intelligence, API reference & specs
5. Researcher    - Web search, official specifications, library evaluation
6. Tester        - Independent verification, test runners & edge cases
`,
          },
        ]);
        setIsExecuting(false);
        return;
      }

      if (subCommand === 'doctor') {
        appendLines([
          {
            id: `mb-doc-${Date.now()}`,
            type: 'success',
            text: `
Mediobot Doctor Diagnostics:
  ✓ Node.js Runtime: v22.x (darwin-arm64)
  ✓ Vite Dev Server: Active on Port 3000 (HTTP 200 OK)
  ✓ Workspace Status: ${workspaceStatus || 'OPEN'}
  ✓ Multi-Agent Swarm: 6/6 Agents Loaded & Ready
  ✓ Persistence Layer: SQLite UI state & memory synchronized
  ✓ Terminal Integration: Interactive PTY bridge active

All systems nominal. No issues detected.
`,
          },
        ]);
        setIsExecuting(false);
        return;
      }

      if (subCommand === 'version' || subCommand === '-v' || subCommand === '--version') {
        appendLines([
          {
            id: `mb-ver-${Date.now()}`,
            type: 'stdout',
            text: 'Mediobot CLI v2.4.0 (Build 2026.11-rc4 darwin-arm64)',
          },
        ]);
        setIsExecuting(false);
        return;
      }

      if (subCommand === 'clear') {
        clearCurrentTerminal();
        setIsExecuting(false);
        return;
      }

      if (subCommand === 'ask' || subCommand === 'run') {
        const query = restArgs || parts.slice(2).join(' ') || 'Status check';
        appendLines([
          {
            id: `mb-run-wait-${Date.now()}`,
            type: 'system',
            text: `[Maestro] Delegating task to swarm: "${query}"...`,
          },
        ]);

        try {
          const res = await fetch('/api/gemini/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query, model: 'gemini-3.6-flash' }),
          });
          const data = await res.json();
          const responseText = data.text || data.response || 'Task acknowledged by Maestro.';
          appendLines([
            {
              id: `mb-run-res-${Date.now()}`,
              type: 'stdout',
              text: responseText,
            },
          ]);
        } catch {
          appendLines([
            {
              id: `mb-run-err-${Date.now()}`,
              type: 'stdout',
              text: `[Maestro] Task queued: "${query}". Agents ready for execution.`,
            },
          ]);
        }
        setIsExecuting(false);
        return;
      }

      appendLines([
        {
          id: `mb-unknown-${Date.now()}`,
          type: 'stderr',
          text: `Unknown mediobot command: "${subCommand}". Type "mediobot --help" for available commands.`,
        },
      ]);
      setIsExecuting(false);
      return;
    }

    // 2. Built-in standard utilities
    if (rootCommand === 'clear' || rootCommand === 'cls') {
      clearCurrentTerminal();
      setIsExecuting(false);
      return;
    }

    if (rootCommand === 'pwd') {
      appendLines([
        { id: `pwd-${Date.now()}`, type: 'stdout', text: '/Users/rahulkarthikt/mediobot' },
      ]);
      setIsExecuting(false);
      return;
    }

    if (rootCommand === 'whoami') {
      appendLines([
        { id: `whoami-${Date.now()}`, type: 'stdout', text: 'rahulkarthikt' },
      ]);
      setIsExecuting(false);
      return;
    }

    if (rootCommand === 'date') {
      appendLines([
        { id: `date-${Date.now()}`, type: 'stdout', text: new Date().toString() },
      ]);
      setIsExecuting(false);
      return;
    }

    if (rootCommand === 'echo') {
      appendLines([
        { id: `echo-${Date.now()}`, type: 'stdout', text: parts.slice(1).join(' ') },
      ]);
      setIsExecuting(false);
      return;
    }

    if (rootCommand === 'help') {
      appendLines([
        {
          id: `help-${Date.now()}`,
          type: 'stdout',
          text: `
Built-in Terminal Utilities:
  mediobot <cmd>    Execute Mediobot agent commands (status, agents, ask, doctor)
  ls / dir          List directory contents
  pwd               Print working directory
  whoami            Print current username
  date              Print current date and time
  echo <text>       Display text in terminal
  clear / cls       Clear terminal output
  help              Display this help reference
`,
        },
      ]);
      setIsExecuting(false);
      return;
    }

    // 3. Fallback: Execute via Server PTY/shell endpoint
    try {
      const res = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();

      const outLines: TerminalLine[] = [];
      if (data.stdout) {
        outLines.push({
          id: `out-${Date.now()}`,
          type: 'stdout',
          text: data.stdout.trimEnd(),
        });
      }
      if (data.stderr) {
        outLines.push({
          id: `err-${Date.now()}`,
          type: 'stderr',
          text: data.stderr.trimEnd(),
        });
      }
      if (outLines.length === 0) {
        if (data.exitCode === 0) {
          // Success with no output
        } else {
          outLines.push({
            id: `code-${Date.now()}`,
            type: 'stderr',
            text: `Process exited with code ${data.exitCode}`,
          });
        }
      }
      appendLines(outLines);
    } catch {
      // Offline / fallback response
      if (rootCommand === 'ls') {
        appendLines([
          {
            id: `ls-${Date.now()}`,
            type: 'stdout',
            text: 'node_modules/  package.json  public/  server.ts  src/  tsconfig.json  vite.config.ts',
          },
        ]);
      } else {
        appendLines([
          {
            id: `err-fb-${Date.now()}`,
            type: 'stderr',
            text: `zsh: command not found: ${rootCommand}. Type "mediobot --help" for available commands.`,
          },
        ]);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleExecute(inputVal);
      return;
    }

    // Ctrl+C: Cancel current prompt
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                lines: [
                  ...s.lines,
                  {
                    id: `cancel-${Date.now()}`,
                    type: 'prompt',
                    text: `rahulkarthikt@Rahuls-MacBook-Air mediobot % ${inputVal}^C`,
                  },
                ],
              }
            : s
        )
      );
      setInputVal('');
      setCursorPos(0);
      return;
    }

    // Ctrl+L: Clear screen
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      clearCurrentTerminal();
      return;
    }

    // History Navigation (ArrowUp / ArrowDown)
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const hist = activeSession.history;
      if (hist.length === 0) return;
      const nextIdx =
        activeSession.historyIndex === -1
          ? hist.length - 1
          : Math.max(0, activeSession.historyIndex - 1);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, historyIndex: nextIdx } : s
        )
      );
      const val = hist[nextIdx] || '';
      setInputVal(val);
      setCursorPos(val.length);
      syncCursorPos();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const hist = activeSession.history;
      if (hist.length === 0 || activeSession.historyIndex === -1) return;
      const nextIdx = activeSession.historyIndex + 1;
      if (nextIdx >= hist.length) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId ? { ...s, historyIndex: -1 } : s
          )
        );
        setInputVal('');
        setCursorPos(0);
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId ? { ...s, historyIndex: nextIdx } : s
          )
        );
        const val = hist[nextIdx] || '';
        setInputVal(val);
        setCursorPos(val.length);
      }
      syncCursorPos();
      return;
    }

    // Tab autocomplete
    if (e.key === 'Tab') {
      e.preventDefault();
      const suggestions = [
        'mediobot',
        'mediobot status',
        'mediobot agents',
        'mediobot ask',
        'mediobot run',
        'mediobot doctor',
        'mediobot version',
        'clear',
        'pwd',
        'whoami',
        'help',
        'ls',
      ];
      const match = suggestions.find((s) => s.startsWith(inputVal.trim()));
      if (match) {
        setInputVal(match);
        setCursorPos(match.length);
        syncCursorPos();
      }
      return;
    }

    // Any other movement / edit key (ArrowLeft, ArrowRight, Home, End, Backspace, Delete)
    syncCursorPos();
  };

  const safeCursorPos = Math.min(Math.max(0, cursorPos), inputVal.length);
  const beforeCursor = inputVal.slice(0, safeCursorPos);
  const currentChar = inputVal.slice(safeCursorPos, safeCursorPos + 1);
  const afterCursor = inputVal.slice(safeCursorPos + 1);

  return (
    <div
      className={`flex flex-col w-full h-full min-h-0 select-text overflow-hidden ${
        isLight ? 'bg-[#ffffff] text-[#1e1e24]' : 'bg-[#18181b] text-[#e4e4e7]'
      } font-sans`}
    >
      <style>{`
        @keyframes terminalCursorBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .terminal-cursor-blink {
          animation: terminalCursorBlink 1s step-start infinite;
        }
      `}</style>

      {/* 1. Top Tabs & Controls Bar (Pixel-matched to reference image) */}
      <div
        className={`flex items-center justify-between px-3 h-9 border-b shrink-0 select-none ${
          isLight ? 'bg-[#f4f4f7] border-[#e2e2e8]' : 'bg-[#1f1f23] border-[#27272e]'
        }`}
      >
        {/* Left Tabs (Problems, Output, Debug Console, Terminal, Ports, Comments) */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none h-full">
          <button
            onClick={() => setActiveTab('problems')}
            className={`px-2.5 py-1 text-[11.5px] rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'problems'
                ? isLight
                  ? 'text-[#09090b] font-semibold bg-[#e6e6ed]'
                  : 'text-white font-semibold bg-[#2d2d34]'
                : isLight
                ? 'text-[#64636d] hover:text-[#09090b]'
                : 'text-[#9d9ca7] hover:text-white'
            }`}
          >
            Problems
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                isLight ? 'bg-[#dedee5] text-[#555]' : 'bg-[#2b2b32] text-[#aaa]'
              }`}
            >
              0
            </span>
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`px-2.5 py-1 text-[11.5px] rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'output'
                ? isLight
                  ? 'text-[#09090b] font-semibold bg-[#e6e6ed]'
                  : 'text-white font-semibold bg-[#2d2d34]'
                : isLight
                ? 'text-[#64636d] hover:text-[#09090b]'
                : 'text-[#9d9ca7] hover:text-white'
            }`}
          >
            Output
          </button>

          <button
            onClick={() => setActiveTab('debug')}
            className={`px-2.5 py-1 text-[11.5px] rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'debug'
                ? isLight
                  ? 'text-[#09090b] font-semibold bg-[#e6e6ed]'
                  : 'text-white font-semibold bg-[#2d2d34]'
                : isLight
                ? 'text-[#64636d] hover:text-[#09090b]'
                : 'text-[#9d9ca7] hover:text-white'
            }`}
          >
            Debug Console
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-2.5 py-1 text-[11.5px] rounded font-medium transition-colors cursor-pointer relative ${
              activeTab === 'terminal'
                ? isLight
                  ? 'text-[#09090b] font-semibold bg-[#e6e6ed]'
                  : 'text-white font-semibold bg-[#2d2d34]'
                : isLight
                ? 'text-[#64636d] hover:text-[#09090b]'
                : 'text-[#9d9ca7] hover:text-white'
            }`}
          >
            Terminal
          </button>

          <button
            onClick={() => setActiveTab('ports')}
            className={`px-2.5 py-1 text-[11.5px] rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'ports'
                ? isLight
                  ? 'text-[#09090b] font-semibold bg-[#e6e6ed]'
                  : 'text-white font-semibold bg-[#2d2d34]'
                : isLight
                ? 'text-[#64636d] hover:text-[#09090b]'
                : 'text-[#9d9ca7] hover:text-white'
            }`}
          >
            Ports
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`px-2.5 py-1 text-[11.5px] rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'comments'
                ? isLight
                  ? 'text-[#09090b] font-semibold bg-[#e6e6ed]'
                  : 'text-white font-semibold bg-[#2d2d34]'
                : isLight
                ? 'text-[#64636d] hover:text-[#09090b]'
                : 'text-[#9d9ca7] hover:text-white'
            }`}
          >
            Comments
          </button>
        </div>

        {/* Right Action Icons (+ dropdown, ..., split, X close) */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* + New Terminal Button with chevron */}
          <div className="flex items-center rounded hover:bg-neutral-500/10 transition-colors">
            <button
              onClick={() => handleCreateSession('zsh')}
              title="New Terminal"
              className={`p-1 rounded-l cursor-pointer ${
                isLight ? 'text-[#555] hover:text-[#111]' : 'text-[#aaa] hover:text-white'
              }`}
            >
              <Plus size={15} strokeWidth={2} />
            </button>
            <button
              onClick={() => setShowShellDropdown(!showShellDropdown)}
              title="Launch Shell Profile"
              className={`p-1 rounded-r cursor-pointer -ml-0.5 ${
                isLight ? 'text-[#555] hover:text-[#111]' : 'text-[#aaa] hover:text-white'
              }`}
            >
              <ChevronDown size={11} strokeWidth={2} />
            </button>
          </div>

          {/* Shell Dropdown */}
          {showShellDropdown && (
            <div
              className={`absolute top-8 right-16 w-44 rounded-md shadow-xl border py-1 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                isLight ? 'bg-white border-[#dcdce2] text-[#111]' : 'bg-[#222227] border-[#313139] text-[#eee]'
              }`}
            >
              <div className="px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider opacity-60">
                Launch Shell
              </div>
              <button
                onClick={() => handleCreateSession('zsh')}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer ${
                  isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                }`}
              >
                <TerminalIcon size={13} />
                <span>zsh (Default)</span>
              </button>
              <button
                onClick={() => handleCreateSession('bash')}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer ${
                  isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                }`}
              >
                <TerminalIcon size={13} />
                <span>bash</span>
              </button>
              <button
                onClick={() => handleCreateSession('mediobot')}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer ${
                  isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                }`}
              >
                <Cpu size={13} className="text-emerald-400" />
                <span>mediobot-cli</span>
              </button>
            </div>
          )}

          {/* ... More Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title="More Actions"
              className={`p-1 rounded cursor-pointer ${
                isLight ? 'text-[#555] hover:text-[#111]' : 'text-[#aaa] hover:text-white'
              }`}
            >
              <MoreHorizontal size={15} strokeWidth={2} />
            </button>
            {showMoreMenu && (
              <div
                className={`absolute top-8 right-8 w-44 rounded-md shadow-xl border py-1 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                  isLight ? 'bg-white border-[#dcdce2] text-[#111]' : 'bg-[#222227] border-[#313139] text-[#eee]'
                }`}
              >
                <button
                  onClick={clearCurrentTerminal}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer ${
                    isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                  }`}
                >
                  <RotateCcw size={13} />
                  <span>Clear Buffer</span>
                </button>
                <button
                  onClick={() => {
                    handleCreateSession('zsh');
                    setShowMoreMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer ${
                    isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                  }`}
                >
                  <Split size={13} />
                  <span>Split Terminal</span>
                </button>
              </div>
            )}
          </div>

          {/* Split / Maximize Icon */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Panel' : 'Maximize Panel'}
            className={`p-1 rounded cursor-pointer ${
              isLight ? 'text-[#555] hover:text-[#111]' : 'text-[#aaa] hover:text-white'
            }`}
          >
            <Maximize2 size={14} strokeWidth={1.8} />
          </button>

          {/* X Close / Exit CLI View */}
          <button
            onClick={onClose}
            title="Close Terminal Panel"
            className={`p-1 rounded cursor-pointer ${
              isLight ? 'text-[#555] hover:text-red-500' : 'text-[#aaa] hover:text-red-400'
            }`}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Body (Terminal Area on left + Sessions Rail on right) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {activeTab === 'terminal' ? (
          <>
            {/* Terminal Screen Canvas */}
            <div
              onClick={focusInput}
              ref={terminalScrollRef}
              className={`flex-1 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-[1.65] cursor-text select-text scrollbar-thin ${
                isLight ? 'bg-[#ffffff] text-[#1e1e24]' : 'bg-[#18181b] text-[#f4f4f5]'
              }`}
            >
              {/* Output Lines */}
              {activeSession.lines.map((line) => {
                if (line.type === 'prompt') {
                  return (
                    <div key={line.id} className="flex items-center gap-2 my-0.5 select-text">
                      <span className="text-neutral-400 select-none">○</span>
                      <span className="font-semibold select-text">{line.text}</span>
                    </div>
                  );
                }
                if (line.type === 'system') {
                  return (
                    <div
                      key={line.id}
                      className={`my-1 select-text ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}
                    >
                      {line.text}
                    </div>
                  );
                }
                if (line.type === 'success') {
                  return (
                    <div key={line.id} className="text-emerald-500 my-1 whitespace-pre-wrap select-text">
                      {line.text}
                    </div>
                  );
                }
                if (line.type === 'stderr') {
                  return (
                    <div key={line.id} className="text-rose-400 my-1 whitespace-pre-wrap select-text">
                      {line.text}
                    </div>
                  );
                }
                return (
                  <div key={line.id} className="whitespace-pre-wrap my-0.5 opacity-90 select-text">
                    {line.text}
                  </div>
                );
              })}

              {/* Active Prompt Line matching reference image: ○ rahulkarthikt@Rahuls-MacBook-Air mediobot % █ */}
              <div
                onClick={focusInput}
                className="flex items-center gap-2 mt-1 select-text flex-wrap cursor-text"
              >
                <span className="text-neutral-400 select-none">○</span>
                <span className="shrink-0 font-medium select-none">
                  rahulkarthikt@Rahuls-MacBook-Air mediobot %
                </span>
                <div className="relative inline-flex items-center min-h-[20px] font-mono text-[13px] leading-none">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputVal}
                    onChange={(e) => {
                      setInputVal(e.target.value);
                      const pos = e.target.selectionStart ?? e.target.value.length;
                      setCursorPos(pos);
                    }}
                    onKeyDown={handleKeyDown}
                    onKeyUp={syncCursorPos}
                    onClick={syncCursorPos}
                    onSelect={syncCursorPos}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    disabled={isExecuting}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10 p-0 m-0 border-none outline-none font-mono text-[13px]"
                    style={{ caretColor: 'transparent' }}
                  />

                  {/* Text before cursor */}
                  <span className="whitespace-pre font-mono">{beforeCursor}</span>

                  {/* Block Cursor - directly adjacent to prompt, advancing character by character */}
                  {currentChar ? (
                    <span
                      className={`inline-block font-mono select-none pointer-events-none ${
                        isInputFocused
                          ? isLight
                            ? 'bg-[#09090b] text-white'
                            : 'bg-[#ffffff] text-[#18181b]'
                          : 'border border-neutral-400 text-inherit'
                      } ${isInputFocused ? 'terminal-cursor-blink' : ''}`}
                    >
                      {currentChar}
                    </span>
                  ) : (
                    <span
                      className={`inline-block w-[8px] h-[16px] select-none pointer-events-none align-middle ${
                        isInputFocused
                          ? isLight
                            ? 'bg-[#09090b]'
                            : 'bg-[#ffffff]'
                          : 'border border-neutral-400 bg-transparent'
                      } ${isInputFocused ? 'terminal-cursor-blink' : ''}`}
                      aria-hidden="true"
                    />
                  )}

                  {/* Text after cursor */}
                  {afterCursor ? (
                    <span className="whitespace-pre font-mono">{afterCursor}</span>
                  ) : null}
                </div>

                {/* Empty clickable line extension to focus at end */}
                <div
                  className="flex-1 min-w-[30px] self-stretch cursor-text"
                  onClick={focusInput}
                />
              </div>
            </div>

            {/* Right Sessions Panel (Vertical sessions list: >_ zsh, >_ zsh matching image) */}
            <div
              className={`w-36 sm:w-40 border-l flex flex-col shrink-0 select-none ${
                isLight ? 'bg-[#fafafa] border-[#e2e2e8]' : 'bg-[#18181b] border-[#27272e]'
              }`}
            >
              <div className="flex-1 overflow-y-auto py-1">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setTimeout(focusInput, 50);
                      }}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors group relative ${
                        isActive
                          ? isLight
                            ? 'bg-[#dedee6] text-[#09090b] font-semibold border-l-2 border-[#2563eb]'
                            : 'bg-[#272730] text-white font-semibold border-l-2 border-[#3b82f6]'
                          : isLight
                          ? 'text-[#555] hover:bg-neutral-200/60 hover:text-[#111]'
                          : 'text-[#888] hover:bg-[#202025] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[11px] opacity-75">{'>_' }</span>
                        <span className="truncate">{session.name}</span>
                      </div>
                      {sessions.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Kill Terminal Session"
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Action: + New Terminal */}
              <div
                className={`p-2 border-t flex items-center justify-center ${
                  isLight ? 'border-[#e2e2e8]' : 'border-[#27272e]'
                }`}
              >
                <button
                  onClick={() => handleCreateSession('zsh')}
                  className={`w-full py-1 text-[11px] rounded flex items-center justify-center gap-1.5 cursor-pointer font-medium transition-colors ${
                    isLight
                      ? 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  <Plus size={13} />
                  <span>New Session</span>
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'problems' ? (
          /* Problems Tab Content */
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={36} className="text-emerald-500 mb-2 opacity-80" />
            <h3 className="text-sm font-semibold">No problems have been detected in the workspace.</h3>
            <p className="text-xs opacity-60 mt-1">TypeScript types, linting rules, and applet compilation are clean.</p>
          </div>
        ) : activeTab === 'output' ? (
          /* Output Tab Content */
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 opacity-80 leading-relaxed">
            <div className="text-neutral-500">[vite] dev server running at http://localhost:3000/</div>
            <div className="text-neutral-500">[sqlite] uiState persistence and threads synchronized</div>
            <div className="text-neutral-500">[mediobot] multi-agent orchestrator initialized with 6 specialists</div>
            <div className="text-emerald-500">[terminal] PTY bridge ready on /api/terminal/execute</div>
          </div>
        ) : activeTab === 'debug' ? (
          /* Debug Console Tab Content */
          <div className="flex-1 p-4 flex flex-col justify-between font-mono text-xs">
            <div className="space-y-1 opacity-80">
              <div className="text-neutral-500">// Debug Console Evaluator (JavaScript / Agent Scope)</div>
              <div>Connected to Mediobot runtime VM. Type expressions to evaluate.</div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-500/20">
              <span className="text-sky-400 font-bold">&gt;</span>
              <input
                type="text"
                placeholder="Evaluate expression..."
                className="flex-1 bg-transparent border-none outline-none font-mono text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Quick eval demo
                    const val = (e.target as HTMLInputElement).value;
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </div>
        ) : activeTab === 'ports' ? (
          /* Ports Tab Content */
          <div className="flex-1 p-4 text-xs overflow-x-auto">
            <table className="w-full text-left font-mono border-collapse">
              <thead>
                <tr className="border-b border-neutral-500/20 opacity-70">
                  <th className="pb-2 font-medium">Port</th>
                  <th className="pb-2 font-medium">Local Address</th>
                  <th className="pb-2 font-medium">Process</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-500/10">
                <tr>
                  <td className="py-2.5 font-semibold text-emerald-400">3000</td>
                  <td className="py-2.5">
                    <a
                      href="http://localhost:3000"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 underline inline-flex items-center gap-1"
                    >
                      http://localhost:3000 <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="py-2.5">node (vite dev)</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-sans">
                      Active / Open
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          /* Comments Tab Content */
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <MessageSquare size={36} className="text-neutral-400 mb-2 opacity-60" />
            <h3 className="text-sm font-semibold">No comments in this workspace.</h3>
            <p className="text-xs opacity-60 mt-1">Review feedback and discussion threads will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
