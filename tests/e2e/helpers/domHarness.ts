/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DOM Harness for React 19 and JSDOM Component Testing
 * Provides full window/document mocks, React 19 act() lifecycle wrapping,
 * keyboard/click event dispatchers, and accessible DOM query helpers.
 */

import { register } from 'node:module';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

// Register css-loader stub so any imported CSS in components does not crash Node ESM
try {
  register(new URL('../../css-loader.mjs', import.meta.url));
} catch {
  // Already registered in the current process
}

export interface JSDOMHarness {
  dom: JSDOM;
  window: Window & typeof globalThis;
  document: Document;
  cleanup: () => void;
}

export interface RenderResult {
  container: HTMLElement;
  root: Root;
  unmount: () => Promise<void>;
  rerender: (ui: React.ReactElement) => Promise<void>;
}

let activeDom: JSDOM | null = null;

/**
 * Initializes or resets the global JSDOM environment.
 */
export function setupJSDOM(html = '<!doctype html><html><body><div id="root"></div></body></html>'): JSDOMHarness {
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:3000',
    pretendToBeVisual: true,
  });

  activeDom = dom;

  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = dom.window as any;
  globalThis.document = dom.window.document;

  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });

  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
  globalThis.HTMLInputElement = dom.window.HTMLInputElement;
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  globalThis.HTMLDetailsElement = dom.window.HTMLDetailsElement;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.KeyboardEvent = dom.window.KeyboardEvent;
  globalThis.Event = dom.window.Event;
  globalThis.CustomEvent = dom.window.CustomEvent;

  // Polyfills for layout and observation
  dom.window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as any;

  dom.window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;

  dom.window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;

  dom.window.scrollTo = () => {};
  (dom.window.HTMLElement.prototype as any).scrollIntoView = () => {};
  (dom.window.HTMLElement.prototype as any).scrollTo = () => {};

  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as any;
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  dom.window.requestAnimationFrame = globalThis.requestAnimationFrame;
  dom.window.cancelAnimationFrame = globalThis.cancelAnimationFrame;

  // Cleanup helper
  const cleanup = () => {
    dom.window.localStorage.clear();
    dom.window.sessionStorage.clear();
    dom.window.document.body.innerHTML = '<div id="root"></div>';
  };

  return {
    dom,
    window: dom.window as any,
    document: dom.window.document,
    cleanup,
  };
}

/**
 * Mounts a React component into the JSDOM container wrapped in React 19 act().
 */
export async function render(ui: React.ReactElement, parentContainer?: HTMLElement): Promise<RenderResult> {
  if (!activeDom || !globalThis.document) {
    setupJSDOM();
  }

  const container = parentContainer ?? globalThis.document.createElement('div');
  if (!parentContainer) {
    globalThis.document.body.appendChild(container);
  }

  const root = createRoot(container);

  await act(async () => {
    root.render(ui);
  });

  const unmount = async () => {
    await act(async () => {
      root.unmount();
    });
    if (!parentContainer && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  const rerender = async (nextUi: React.ReactElement) => {
    await act(async () => {
      root.render(nextUi);
    });
  };

  return {
    container,
    root,
    unmount,
    rerender,
  };
}

/**
 * DOM event dispatch helpers
 */
export const fireEvent = {
  click: async (element: Element) => {
    await act(async () => {
      element.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
  },

  change: async (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    await act(async () => {
      const proto = Object.getPrototypeOf(element);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc?.set) {
        desc.set.call(element, value);
      } else {
        element.value = value;
      }
      const propsKey = Object.keys(element).find((k) => k.startsWith('__reactProps$'));
      if (propsKey && (element as any)[propsKey]?.onChange) {
        (element as any)[propsKey].onChange({ target: { value } });
      }
      element.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
      element.dispatchEvent(new globalThis.Event('change', { bubbles: true }));
    });
  },

  keyDown: async (element: Element, options: { key: string; code?: string; keyCode?: number }) => {
    await act(async () => {
      element.dispatchEvent(
        new globalThis.KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: options.key,
          code: options.code ?? options.key,
          keyCode: options.keyCode ?? (options.key === 'Enter' ? 13 : options.key === ' ' ? 32 : 0),
        })
      );
    });
  },

  keyUp: async (element: Element, options: { key: string; code?: string; keyCode?: number }) => {
    await act(async () => {
      element.dispatchEvent(
        new globalThis.KeyboardEvent('keyup', {
          bubbles: true,
          cancelable: true,
          key: options.key,
          code: options.code ?? options.key,
        })
      );
    });
  },
};

/**
 * Query helpers
 */
export function getByText(container: Element, textOrRegex: string | RegExp): HTMLElement {
  const all = Array.from(container.querySelectorAll('*')) as HTMLElement[];
  const match = all.find((el) => {
    const text = el.textContent || '';
    if (typeof textOrRegex === 'string') {
      return text.includes(textOrRegex);
    }
    return textOrRegex.test(text);
  });
  if (!match) {
    throw new Error(`Unable to find element with text matching: ${textOrRegex}`);
  }
  return match;
}

export function queryByText(container: Element, textOrRegex: string | RegExp): HTMLElement | null {
  const all = Array.from(container.querySelectorAll('*')) as HTMLElement[];
  return (
    all.find((el) => {
      const text = el.textContent || '';
      if (typeof textOrRegex === 'string') {
        return text.includes(textOrRegex);
      }
      return textOrRegex.test(text);
    }) || null
  );
}

export function getByRole(container: Element, role: string, options?: { name?: string | RegExp }): HTMLElement {
  const all = Array.from(container.querySelectorAll(`[role="${role}"]`)) as HTMLElement[];
  if (!options?.name) {
    if (all.length === 0) throw new Error(`Unable to find element with role="${role}"`);
    return all[0];
  }
  const match = all.find((el) => {
    const text = el.getAttribute('aria-label') || el.textContent || '';
    if (typeof options.name === 'string') {
      return text.includes(options.name);
    }
    return options.name!.test(text);
  });
  if (!match) {
    throw new Error(`Unable to find element with role="${role}" and name matching: ${options.name}`);
  }
  return match;
}

export function queryAllByRole(container: Element, role: string): HTMLElement[] {
  return Array.from(container.querySelectorAll(`[role="${role}"]`));
}
