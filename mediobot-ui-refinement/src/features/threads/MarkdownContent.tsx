import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CodeBlock } from './CodeBlock';
import { useApp } from '../../state/AppContext';

export interface MarkdownContentProps {
  content: string;
  textColor?: string;
  animateTyping?: boolean;
  cursorColor?: string;
  onTypingComplete?: () => void;
}

// Auto-close unclosed formatting tags when string is partially sliced during typing
function autoCloseMarkdown(text: string): string {
  if (!text) return '';
  let result = text;

  // Handle open fenced code block ```
  const codeBlockMatches = result.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    result += '\n```';
  }

  // Handle open bold **
  const boldMatches = result.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 !== 0) {
    result += '**';
  }

  // Handle open inline code `
  const backtickMatches = result.match(/(?<!`)`(?!`)/g);
  if (backtickMatches && backtickMatches.length % 2 !== 0) {
    result += '`';
  }

  return result;
}

const FILE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|md|css|scss|html|py|rs|go|sh|sql|toml)$/i;

function isNavigableFilePath(raw: string): boolean {
  const token = raw.trim();
  if (!token || token.length > 140) return false;
  // Reject URLs, HTTP methods ("POST /api/datasets"), spaces, commands, or flags
  if (/\s/.test(token)) return false;
  if (/^https?:\/\//i.test(token)) return false;
  if (token.startsWith('--') || token.startsWith('-')) return false;
  if (token.includes('/') && !token.startsWith('/api/')) return true;
  return FILE_EXT_RE.test(token);
}

type TextSection =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'hr' }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'table'; headers: string[]; alignments: Array<'left' | 'center' | 'right'>; rows: string[][] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'paragraph'; text: string };

function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function parseAlignments(separatorLine: string): Array<'left' | 'center' | 'right'> {
  return splitTableRow(separatorLine).map((cell) => {
    const startsColon = cell.startsWith(':');
    const endsColon = cell.endsWith(':');
    if (startsColon && endsColon) return 'center';
    if (endsColon) return 'right';
    return 'left';
  });
}

function parseTextSections(rawText: string): TextSection[] {
  const lines = rawText.split('\n');
  const sections: TextSection[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      sections.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading (# .. ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      sections.push({
        type: 'heading',
        level: headingMatch[1]!.length as 1 | 2 | 3 | 4,
        text: headingMatch[2]!.trim(),
      });
      i++;
      continue;
    }

    // GFM Table: header row with pipes followed by separator row
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparatorLine(lines[i + 1]!)
    ) {
      const headers = splitTableRow(trimmed);
      const alignments = parseAlignments(lines[i + 1]!);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length) {
        const rowLine = lines[i]!.trim();
        if (!rowLine || !rowLine.includes('|')) break;
        rows.push(splitTableRow(rowLine));
        i++;
      }
      sections.push({ type: 'table', headers, alignments, rows });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('>')) {
        quoteLines.push(lines[i]!.trim().replace(/^>\s?/, ''));
        i++;
      }
      sections.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    // Unordered list (* or -)
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const curr = lines[i]!.trim();
        if (/^[-*]\s+/.test(curr)) {
          items.push(curr.replace(/^[-*]\s+/, ''));
          i++;
        } else if (items.length > 0 && curr && !/^(#{1,4}\s+|>\s?|\d+\.\s+|[-*]{3,}$)/.test(curr) && !curr.includes('|')) {
          // Continuation line inside list item
          items[items.length - 1] = `${items[items.length - 1]!} ${curr}`;
          i++;
        } else {
          break;
        }
      }
      sections.push({ type: 'ul', items });
      continue;
    }

    // Ordered list (1. 2. ...)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const curr = lines[i]!.trim();
        if (/^\d+\.\s+/.test(curr)) {
          items.push(curr.replace(/^\d+\.\s+/, ''));
          i++;
        } else if (items.length > 0 && curr && !/^(#{1,4}\s+|>\s?|[-*]\s+|[-*]{3,}$)/.test(curr) && !curr.includes('|')) {
          items[items.length - 1] = `${items[items.length - 1]!} ${curr}`;
          i++;
        } else {
          break;
        }
      }
      sections.push({ type: 'ol', items });
      continue;
    }

    // Paragraph (collect consecutive plain lines until blank or special block)
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i]!;
      const nextTrimmed = next.trim();
      if (
        !nextTrimmed ||
        /^(#{1,4}\s+|[-*]\s+|\d+\.\s+|>\s?|(?:-{3,}|\*{3,}|_{3,})$)/.test(nextTrimmed) ||
        (nextTrimmed.includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1]!))
      ) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    sections.push({ type: 'paragraph', text: paraLines.join('\n').trim() });
  }

  return sections;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  textColor,
  animateTyping = false,
  cursorColor,
  onTypingComplete,
}) => {
  let theme: 'dark' | 'light' = 'dark';
  let openFileTab: ((path: string, name?: string) => void) | undefined;
  try {
    const app = useApp();
    theme = app.theme;
    openFileTab = app.openFileTab;
  } catch {
    theme = 'dark';
    openFileTab = undefined;
  }

  const isLight = theme === 'light';
  const effectiveTextColor = textColor || (isLight ? 'text-[#18181b]' : 'text-neutral-200');

  const [displayedLength, setDisplayedLength] = useState<number>(animateTyping ? 0 : content.length);
  const [isTyping, setIsTyping] = useState<boolean>(Boolean(animateTyping && content.length > 0));
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    if (!animateTyping || !content) {
      setDisplayedLength(content ? content.length : 0);
      setIsTyping(false);
      return;
    }

    // If already typed once, don't re-type
    if (hasFinishedRef.current) {
      setDisplayedLength(content.length);
      setIsTyping(false);
      return;
    }

    setDisplayedLength(0);
    setIsTyping(true);

    let current = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const tick = () => {
      if (isCancelled) return;

      if (current >= content.length) {
        setDisplayedLength(content.length);
        setIsTyping(false);
        hasFinishedRef.current = true;
        onTypingComplete?.();
        return;
      }

      // Smooth buttery speed with organic pacing
      const remaining = content.length - current;
      const step = remaining > 320 ? 4 : remaining > 140 ? 3 : remaining > 50 ? 2 : 1;
      current = Math.min(content.length, current + step);
      setDisplayedLength(current);

      if (current >= content.length) {
        timer = setTimeout(() => {
          if (!isCancelled) {
            setIsTyping(false);
            hasFinishedRef.current = true;
            onTypingComplete?.();
          }
        }, 80);
        return;
      }

      const nextChar = content[current - 1];
      const isMajorPause = nextChar === '.' || nextChar === '!' || nextChar === '?' || nextChar === '\n';
      const isMinorPause = nextChar === ',' || nextChar === ':' || nextChar === ';';
      const delay = isMajorPause ? 50 : isMinorPause ? 32 : 18;

      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 30);

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [content, animateTyping]);

  const activeContent = useMemo(() => {
    if (!isTyping) return content;
    return autoCloseMarkdown(content.slice(0, displayedLength));
  }, [content, displayedLength, isTyping]);

  // Parse markdown content into structured blocks (code blocks vs text blocks)
  const blocks = useMemo(() => {
    const result: Array<
      | { type: 'code'; code: string; language: string }
      | { type: 'text'; sections: TextSection[] }
    > = [];

    const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(activeContent)) !== null) {
      const precedingText = activeContent.slice(lastIndex, match.index);
      if (precedingText.trim()) {
        result.push({ type: 'text', sections: parseTextSections(precedingText) });
      }

      const language = match[1] ? match[1].trim() : '';
      const code = match[2];
      result.push({ type: 'code', code, language });

      lastIndex = match.index + match[0].length;
    }

    const remainingText = activeContent.slice(lastIndex);
    if (remainingText.trim()) {
      result.push({ type: 'text', sections: parseTextSections(remainingText) });
    }

    return result;
  }, [activeContent]);

  // Helper to format inline markdown (inline code, workspace file links, bold, links)
  const renderInlineFormatted = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const inner = part.slice(1, -1);
        const cleanFilePath = inner.replace(/^\.\//, '').replace(/^\/+/, '');
        const navigable = Boolean(openFileTab && isNavigableFilePath(inner));

        if (navigable && openFileTab) {
          return (
            <button
              key={pIdx}
              type="button"
              onClick={() => openFileTab(cleanFilePath)}
              title={`Open ${cleanFilePath} in editor`}
              className={`px-1.5 py-[1px] mx-0.5 rounded-[5px] border font-mono text-[12px] font-normal cursor-pointer transition-colors underline decoration-dotted underline-offset-2 ${
                isLight
                  ? 'bg-black/[0.045] border-black/[0.08] text-neutral-900 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700'
                  : 'bg-white/[0.07] border-white/[0.08] text-neutral-100 hover:bg-sky-950/50 hover:border-sky-500/40 hover:text-sky-300'
              }`}
            >
              {inner}
            </button>
          );
        }

        return (
          <code
            key={pIdx}
            className={`px-1.5 py-[1px] mx-0.5 rounded-[5px] ${
              isLight
                ? 'bg-black/[0.045] border-black/[0.08] text-neutral-800'
                : 'bg-white/[0.07] border-white/[0.08] text-neutral-200'
            } border font-mono text-[12px] font-normal select-all`}
          >
            {inner}
          </code>
        );
      }

      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          return (
            <strong key={`${pIdx}-${bIdx}`} className={`font-semibold ${isLight ? 'text-neutral-950' : 'text-white'}`}>
              {bPart.slice(2, -2)}
            </strong>
          );
        }
        return bPart;
      });
    });
  };

  const renderTypingCursor = () => (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full ml-1.5 align-middle animate-pulse shadow-sm shrink-0"
      style={{
        backgroundColor: cursorColor,
        boxShadow: `0 0 10px ${cursorColor}aa, 0 0 4px ${cursorColor}80`,
      }}
      aria-hidden="true"
    />
  );

  return (
    <div className={`space-y-3 leading-relaxed ${effectiveTextColor}`}>
      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1;

        if (block.type === 'code') {
          return (
            <div key={idx} className="relative">
              <CodeBlock
                code={block.code}
                language={block.language}
              />
              {isTyping && isLastBlock && cursorColor && renderTypingCursor()}
            </div>
          );
        }

        return (
          <div key={idx} className="space-y-2.5">
            {block.sections.map((section, sIdx) => {
              const isLastSection = isLastBlock && sIdx === block.sections.length - 1;

              if (section.type === 'hr') {
                return (
                  <hr
                    key={sIdx}
                    className={`border-0 border-t my-3 ${
                      isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'
                    }`}
                  />
                );
              }

              if (section.type === 'heading') {
                const headingClasses =
                  section.level <= 2
                    ? `text-[15.5px] font-semibold tracking-tight pt-1 ${isLight ? 'text-neutral-950' : 'text-neutral-50'}`
                    : section.level === 3
                    ? `text-[14.5px] font-semibold tracking-tight pt-0.5 ${isLight ? 'text-neutral-900' : 'text-neutral-100'}`
                    : `text-[13.5px] font-semibold tracking-tight ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`;
                return (
                  <div key={sIdx} role="heading" aria-level={section.level} className={headingClasses}>
                    {renderInlineFormatted(section.text)}
                    {isTyping && isLastSection && cursorColor && renderTypingCursor()}
                  </div>
                );
              }

              if (section.type === 'blockquote') {
                return (
                  <blockquote
                    key={sIdx}
                    className={`border-l-2 pl-3.5 py-0.5 text-[13.5px] italic ${
                      isLight
                        ? 'border-neutral-300 text-neutral-600'
                        : 'border-white/20 text-neutral-400'
                    }`}
                  >
                    {section.lines.map((qLine, qIdx) => (
                      <p key={qIdx} className="leading-relaxed">
                        {renderInlineFormatted(qLine)}
                      </p>
                    ))}
                    {isTyping && isLastSection && cursorColor && renderTypingCursor()}
                  </blockquote>
                );
              }

              if (section.type === 'table') {
                return (
                  <div
                    key={sIdx}
                    className={`my-2 rounded-lg border overflow-x-auto ${
                      isLight
                        ? 'border-black/[0.08] bg-white'
                        : 'border-white/[0.08] bg-[#161619]'
                    }`}
                  >
                    <table className="w-full border-collapse text-left text-[12.5px]">
                      <thead>
                        <tr
                          className={`border-b ${
                            isLight
                              ? 'bg-[#fafafa] border-black/[0.07] text-neutral-600'
                              : 'bg-white/[0.025] border-white/[0.07] text-neutral-400'
                          }`}
                        >
                          {section.headers.map((header, hIdx) => {
                            const align = section.alignments[hIdx] ?? 'left';
                            return (
                              <th
                                key={hIdx}
                                className={`px-3 py-2 font-medium whitespace-nowrap ${
                                  align === 'center'
                                    ? 'text-center'
                                    : align === 'right'
                                    ? 'text-right'
                                    : 'text-left'
                                }`}
                              >
                                {renderInlineFormatted(header)}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          isLight ? 'divide-black/[0.05]' : 'divide-white/[0.05]'
                        }`}
                      >
                        {section.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={`transition-colors ${
                              isLight ? 'hover:bg-black/[0.015]' : 'hover:bg-white/[0.015]'
                            }`}
                          >
                            {section.headers.map((_, cIdx) => {
                              const cell = row[cIdx] ?? '';
                              const align = section.alignments[cIdx] ?? 'left';
                              return (
                                <td
                                  key={cIdx}
                                  className={`px-3 py-2 align-top tabular-nums ${
                                    align === 'center'
                                      ? 'text-center'
                                      : align === 'right'
                                      ? 'text-right'
                                      : 'text-left'
                                  }`}
                                >
                                  {renderInlineFormatted(cell)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              if (section.type === 'ul') {
                return (
                  <ul key={sIdx} className={`space-y-1.5 my-1 pl-4 list-disc list-outside ${effectiveTextColor}`}>
                    {section.items.map((item, liIdx) => {
                      const isLastLi = isLastSection && liIdx === section.items.length - 1;
                      return (
                        <li key={liIdx} className="pl-1 leading-relaxed">
                          {renderInlineFormatted(item)}
                          {isTyping && isLastLi && cursorColor && renderTypingCursor()}
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              if (section.type === 'ol') {
                return (
                  <ol key={sIdx} className={`space-y-1.5 my-1 pl-5 list-decimal list-outside ${effectiveTextColor}`}>
                    {section.items.map((item, liIdx) => {
                      const isLastLi = isLastSection && liIdx === section.items.length - 1;
                      return (
                        <li key={liIdx} className="pl-1 leading-relaxed">
                          {renderInlineFormatted(item)}
                          {isTyping && isLastLi && cursorColor && renderTypingCursor()}
                        </li>
                      );
                    })}
                  </ol>
                );
              }

              return (
                <p key={sIdx} className="whitespace-pre-line leading-relaxed">
                  {renderInlineFormatted(section.text)}
                  {isTyping && isLastSection && cursorColor && renderTypingCursor()}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
