import React, { useState, useMemo } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { Copy, Check, Code2 } from 'lucide-react';
import { useApp } from '../../state/AppContext';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  showLineNumbers = true,
}) => {
  const { theme } = useApp();
  const isLight = theme === 'light';
  const [copied, setCopied] = useState(false);

  // Normalize language alias
  const normalizedLang = useMemo(() => {
    if (!language) return '';
    const clean = language.trim().toLowerCase();
    const aliasMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      sh: 'bash',
      shell: 'bash',
      zsh: 'bash',
      yml: 'yaml',
      golang: 'go',
      rs: 'rust',
      rb: 'ruby',
    };
    return aliasMap[clean] || clean;
  }, [language]);

  // Syntax highlighting via highlight.js
  const { highlightedHtml, detectedLang } = useMemo(() => {
    const trimmedCode = code.replace(/\n$/, '');
    try {
      if (normalizedLang && hljs.getLanguage(normalizedLang)) {
        const result = hljs.highlight(trimmedCode, {
          language: normalizedLang,
          ignoreIllegals: true,
        });
        return {
          highlightedHtml: result.value,
          detectedLang: normalizedLang,
        };
      }
      // Auto detect language
      const autoResult = hljs.highlightAuto(trimmedCode);
      return {
        highlightedHtml: autoResult.value,
        detectedLang: autoResult.language || 'text',
      };
    } catch {
      // Fallback to basic escaping
      return {
        highlightedHtml: trimmedCode
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;'),
        detectedLang: normalizedLang || 'text',
      };
    }
  }, [code, normalizedLang]);

  // Split lines for line numbering
  const lines = useMemo(() => {
    return highlightedHtml.split('\n');
  }, [highlightedHtml]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`my-2.5 rounded-xl border ${
      isLight ? 'border-black/[0.08] bg-[#f8f9fb]' : 'border-white/[0.08] bg-[#161619]'
    } overflow-hidden text-xs group`}>
      {/* Code Header Bar */}
      <div className={`flex items-center justify-between px-3.5 py-2 ${
        isLight ? 'bg-[#f2f3f6] border-b border-black/[0.06]' : 'bg-white/[0.025] border-b border-white/[0.06]'
      } select-none`}>
        <div className="flex items-center gap-2">
          <Code2 className={`w-3.5 h-3.5 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`} />
          <span className={`font-mono text-[11px] font-medium ${isLight ? 'text-neutral-800' : 'text-neutral-300'} uppercase tracking-wider`}>
            {detectedLang}
          </span>
          <span className={`text-[10.5px] tabular-nums ${isLight ? 'text-neutral-500' : 'text-neutral-500'} font-mono`}>
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied code' : 'Copy code to clipboard'}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
            copied
              ? isLight
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
              : isLight
              ? 'text-neutral-600 hover:text-neutral-900 bg-white hover:bg-black/[0.03] border border-black/[0.08]'
              : 'text-neutral-400 hover:text-neutral-100 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className={`w-3 h-3 ${isLight ? 'text-neutral-500 group-hover:text-neutral-900' : 'text-neutral-400 group-hover:text-neutral-100'}`} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content Container */}
      <div className={`p-3.5 overflow-x-auto text-[12.5px] font-mono leading-relaxed select-text ${
        isLight ? 'bg-white' : ''
      } scrollbar-thin`}>
        {showLineNumbers && lines.length > 1 ? (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((lineHtml, idx) => (
                <tr key={idx} className={`${isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.02]'} transition-colors`}>
                  <td className={`w-8 select-none text-right pr-4 tabular-nums ${isLight ? 'text-neutral-400' : 'text-neutral-600'} text-[11px] font-mono align-top py-0.5`}>
                    {idx + 1}
                  </td>
                  <td
                    className="py-0.5 whitespace-pre hljs"
                    style={{ background: 'transparent' }}
                    dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="hljs m-0 p-0" style={{ background: 'transparent' }}>
            <code
              className={`hljs language-${detectedLang}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        )}
      </div>
    </div>
  );
};
