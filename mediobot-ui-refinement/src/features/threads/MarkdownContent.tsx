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

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  textColor,
  animateTyping = false,
  cursorColor,
  onTypingComplete,
}) => {
  const { theme } = useApp();
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
    let timer: any = null;
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
      | { type: 'text'; content: string }
    > = [];

    const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(activeContent)) !== null) {
      const precedingText = activeContent.slice(lastIndex, match.index);
      if (precedingText) {
        result.push({ type: 'text', content: precedingText });
      }

      const language = match[1] ? match[1].trim() : '';
      const code = match[2];
      result.push({ type: 'code', code, language });

      lastIndex = match.index + match[0].length;
    }

    const remainingText = activeContent.slice(lastIndex);
    if (remainingText) {
      result.push({ type: 'text', content: remainingText });
    }

    return result;
  }, [activeContent]);

  // Helper to format inline markdown (inline code, bold, links)
  const renderInlineFormatted = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const inner = part.slice(1, -1);
        return (
          <code
            key={pIdx}
            className={`px-1.5 py-0.5 mx-0.5 rounded-md ${
              isLight
                ? 'bg-[#f1f2f5] border-[#dcdce2] text-[#0284c7]'
                : 'bg-[#222129] border-[#2e2d38] text-sky-300'
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
            <strong key={`${pIdx}-${bIdx}`} className={`font-bold ${textColor ? 'brightness-110' : isLight ? 'text-[#09090b]' : 'text-white'}`}>
              {bPart.slice(2, -2)}
            </strong>
          );
        }
        return bPart;
      });
    });
  };

  return (
    <div className={`space-y-3 leading-relaxed ${effectiveTextColor}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          const isLastBlock = idx === blocks.length - 1;
          return (
            <div key={idx} className="relative">
              <CodeBlock
                code={block.code}
                language={block.language}
              />
              {isTyping && isLastBlock && cursorColor && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full ml-1.5 mt-1 align-middle animate-pulse shadow-sm"
                  style={{
                    backgroundColor: cursorColor,
                    boxShadow: `0 0 10px ${cursorColor}aa, 0 0 4px ${cursorColor}80`,
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        }

        const paragraphs = block.content.split(/\n\n+/);

        return (
          <div key={idx} className="space-y-2">
            {paragraphs.map((p, pIdx) => {
              const trimmed = p.trim();
              if (!trimmed) return null;

              const isLastParagraph = idx === blocks.length - 1 && pIdx === paragraphs.length - 1;

              // Check if bullet point list
              if (trimmed.includes('\n* ') || trimmed.includes('\n- ') || trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                const listItems = trimmed.split(/\n[\*\-]\s+/);
                const firstIsItem = trimmed.startsWith('* ') || trimmed.startsWith('- ');
                
                return (
                  <ul key={pIdx} className={`space-y-1 my-1.5 pl-4 list-disc list-outside ${effectiveTextColor}`}>
                    {listItems.map((li, liIdx) => {
                      const cleanLi = liIdx === 0 && firstIsItem ? li.replace(/^[\*\-]\s+/, '') : li;
                      if (!cleanLi.trim()) return null;
                      const isLastLi = isLastParagraph && liIdx === listItems.length - 1;
                      return (
                        <li key={liIdx} className="pl-1 leading-relaxed">
                          {renderInlineFormatted(cleanLi)}
                          {isTyping && isLastLi && cursorColor && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full ml-1.5 align-middle animate-pulse shadow-sm shrink-0"
                              style={{
                                backgroundColor: cursorColor,
                                boxShadow: `0 0 10px ${cursorColor}aa, 0 0 4px ${cursorColor}80`,
                              }}
                              aria-hidden="true"
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              return (
                <p key={pIdx} className="whitespace-pre-line leading-relaxed">
                  {renderInlineFormatted(trimmed)}
                  {isTyping && isLastParagraph && cursorColor && (
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full ml-1.5 align-middle animate-pulse shadow-sm shrink-0"
                      style={{
                        backgroundColor: cursorColor,
                        boxShadow: `0 0 10px ${cursorColor}aa, 0 0 4px ${cursorColor}80`,
                      }}
                      aria-hidden="true"
                    />
                  )}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
