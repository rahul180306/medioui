/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fixture Storage & Reload Persistence Test Suite (Task D)
 * Verifies that saving files in fixture mode persists strictly to isolated storage,
 * computes explicit simulated-isolated hashes, survives page reloads,
 * and leaves host filesystem completely untouched via node:fs.
 */

import { register } from 'node:module';
register(new URL('./css-loader.mjs', import.meta.url));

import { test, describe, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  OfflineFixtureRuntime,
  FIXTURE_ISOLATED_FILES_KEY,
} from '../mediobot-ui-refinement/src/runtime/offlineFixture.js';

let CodeEditorView: any;
let AppProvider: any;
let useApp: any;

function setupJSDOM() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
    }
  );

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
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.Window = dom.window.Window;

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

  return dom;
}

describe('Fixture Storage & Reload Persistence (Task D)', () => {
  let dom: JSDOM;
  let container: HTMLElement;
  let root: Root;

  before(async () => {
    dom = setupJSDOM();
    container = dom.window.document.getElementById('root')!;

    const editorModule = await import('../mediobot-ui-refinement/src/features/editor/CodeEditorView.js');
    CodeEditorView = editorModule.CodeEditorView;

    const appStateModule = await import('../mediobot-ui-refinement/src/state/AppContext.js');
    AppProvider = appStateModule.AppProvider;
    useApp = appStateModule.useApp;
  });

  beforeEach(() => {
    // Clear fixture isolated storage between tests
    if (globalThis.localStorage) {
      globalThis.localStorage.removeItem(FIXTURE_ISOLATED_FILES_KEY);
    }
    container.innerHTML = '';
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (globalThis.localStorage) {
      globalThis.localStorage.removeItem(FIXTURE_ISOLATED_FILES_KEY);
    }
  });

  // --------------------------------------------------------------------------
  // 1. Isolated Fixture Storage & Simulated Hash Verification
  // --------------------------------------------------------------------------
  test('1. saveFile persists to isolated storage and returns explicit simulated-isolated hash', async () => {
    const runtime = new OfflineFixtureRuntime();
    const projectId = 'fixture-project-offline';
    const filePath = 'src/calculator.ts';

    // 1. Initial read returns default fixture content
    const initial = await runtime.readFileVersioned(projectId, filePath);
    assert.match(initial.content, /Division by zero guard/);
    assert.match(initial.hash, /^simulated-isolated-sha256-[0-9a-f]{8}$/);

    // 2. Save modified content to isolated fixture storage
    const updatedContent = '// Controlled isolated modification\nexport function calculate(): number { return 100; }\n';
    const returnedHash = await runtime.saveFile(projectId, filePath, updatedContent, initial.hash);

    // Assert hash explicitly declares simulated-isolated nature
    assert.match(
      returnedHash,
      /^simulated-isolated-sha256-[0-9a-f]{8}$/,
      'Returned hash must start with simulated-isolated-sha256- to disclose simulated isolated storage'
    );
    assert.doesNotMatch(returnedHash, /^demo-sha256/, 'Must NOT use deceptive raw demo-sha256 hash');

    // 3. Subsequent reads must retrieve the updated content from isolated storage
    const updated = await runtime.readFileVersioned(projectId, filePath);
    assert.equal(updated.content, updatedContent, 'readFileVersioned must read from isolated storage');
    assert.equal(updated.hash, returnedHash, 'Hash must match returned simulated hash');

    const rawContent = await runtime.readFile(projectId, filePath);
    assert.equal(rawContent, updatedContent, 'readFile must return updated isolated content');

    // 4. simulatedFileStore getter alias verification
    assert.ok(runtime.simulatedFileStore instanceof Map, 'simulatedFileStore must expose Map');
    assert.equal(
      runtime.simulatedFileStore.get(`${projectId}:${filePath}`),
      updatedContent,
      'simulatedFileStore must alias isolatedFiles and contain updated content'
    );

    // Verify direct modifications to simulatedFileStore are immediately returned by readFile
    const directContent = '// Injected into simulatedFileStore\nexport const injected = true;\n';
    runtime.simulatedFileStore.set(`${projectId}:src/direct.ts`, directContent);
    const readDirect = await runtime.readFile(projectId, 'src/direct.ts');
    assert.equal(readDirect, directContent, 'readFile must check simulatedFileStore directly');

    // 5. Path normalization round-trip: leading slash vs relative path
    const normalizedContent = '// Path normalization content\nexport const normalized = true;\n';
    await runtime.saveFile(projectId, '/src/calculator.ts', normalizedContent);
    const readWithSlash = await runtime.readFile(projectId, '/src/calculator.ts');
    const readWithoutSlash = await runtime.readFile(projectId, 'src/calculator.ts');
    assert.equal(readWithSlash, normalizedContent, 'readFile with leading slash returns edited content');
    assert.equal(readWithoutSlash, normalizedContent, 'readFile without leading slash returns edited content');
  });

  // --------------------------------------------------------------------------
  // 2. Reload Persistence Across Runtime Instances (Simulated Page Refresh)
  // --------------------------------------------------------------------------
  test('2. Isolated fixture storage survives simulated page reload across separate runtime instances', async () => {
    const projectId = 'fixture-project-offline';
    const filePath = 'src/calculator.ts';
    const savedContent = '// Reload persistence test content\nexport const persistenceVerified = true;\n';

    // Instance 1: Save content
    const runtime1 = new OfflineFixtureRuntime();
    const savedHash = await runtime1.saveFile(projectId, filePath, savedContent, 'initial-hash');

    // Verify localStorage has persisted envelope
    const rawStorage = globalThis.localStorage.getItem(FIXTURE_ISOLATED_FILES_KEY);
    assert.ok(rawStorage, 'localStorage must contain isolated fixture files key');
    const parsed = JSON.parse(rawStorage);
    assert.equal(parsed.files[`${projectId}:${filePath}`], savedContent);

    // Instance 2: Create a completely separate runtime instance (simulating page reload)
    const runtime2 = new OfflineFixtureRuntime();
    const reloaded = await runtime2.readFileVersioned(projectId, filePath);

    assert.equal(
      reloaded.content,
      savedContent,
      'Reloaded runtime instance must restore saved file content from isolated storage'
    );
    assert.equal(reloaded.hash, savedHash, 'Reloaded hash must match saved simulated hash');
    assert.equal(
      runtime2.simulatedFileStore.get(`${projectId}:${filePath}`),
      savedContent,
      'Reloaded simulatedFileStore must contain persisted content'
    );
  });

  // --------------------------------------------------------------------------
  // 3. Dynamic File Operations in Isolated Fixture Storage
  // --------------------------------------------------------------------------
  test('3. Dynamic file operations (create, rename, delete) update isolated storage and survive reloads', async () => {
    const projectId = 'fixture-project-offline';
    const runtime = new OfflineFixtureRuntime();

    // 1. Create a new file entry
    await runtime.createFileEntry(projectId, 'src', 'isolated-helper.ts', 'file');
    const helperContent = 'export function helper() { return "isolated"; }\n';
    await runtime.saveFile(projectId, 'src/isolated-helper.ts', helperContent, '');

    const readHelper = await runtime.readFile(projectId, 'src/isolated-helper.ts');
    assert.equal(readHelper, helperContent);

    const list1 = await runtime.listFiles(projectId);
    assert.ok(list1.some((n) => n.path === 'src/isolated-helper.ts'), 'File list must include created file');

    // 2. Rename file entry
    await runtime.renameFileEntry(projectId, 'src/isolated-helper.ts', 'renamed-helper.ts');
    const readRenamed = await runtime.readFile(projectId, 'src/renamed-helper.ts');
    assert.equal(readRenamed, helperContent, 'Renamed file must preserve content');

    const list2 = await runtime.listFiles(projectId);
    assert.ok(list2.some((n) => n.path === 'src/renamed-helper.ts'), 'List must include renamed file');
    assert.ok(!list2.some((n) => n.path === 'src/isolated-helper.ts'), 'List must NOT include old path');

    // 3. Delete file entry
    await runtime.deleteFileEntry(projectId, 'src/renamed-helper.ts');
    await assert.rejects(
      async () => {
        await runtime.readFile(projectId, 'src/renamed-helper.ts');
      },
      /File not found/,
      'Deleted file must throw not found error'
    );

    const list3 = await runtime.listFiles(projectId);
    assert.ok(!list3.some((n) => n.path === 'src/renamed-helper.ts'), 'Deleted file must not be listed');

    // 4. Verify reload persistence of dynamic operations
    const reloadedRuntime = new OfflineFixtureRuntime();
    await assert.rejects(
      async () => {
        await reloadedRuntime.readFile(projectId, 'src/renamed-helper.ts');
      },
      /File not found/,
      'Deletion must persist across reloaded instances'
    );
  });

  // --------------------------------------------------------------------------
  // 4. Host Filesystem Immutability Verification via node:fs
  // --------------------------------------------------------------------------
  test('4. Host filesystem immutability: zero files are written, modified, or deleted on host OS disk', async () => {
    // Check non-existence of simulated file paths on host operating system
    const hostCheckPaths = [
      path.resolve(process.cwd(), 'src/calculator.ts'),
      path.resolve(process.cwd(), 'src/isolated-helper.ts'),
      path.resolve(process.cwd(), 'src/renamed-helper.ts'),
      '/controlled-demo/mediobot-workspace',
      '/controlled-demo/mediobot-workspace/src/calculator.ts',
    ];

    // Assert before operations that simulated paths do not exist on host
    for (const p of hostCheckPaths) {
      assert.equal(fs.existsSync(p), false, `Host path ${p} must not exist before operations`);
    }

    // Capture mtimes of medioui directory to assert no unexpected host modifications
    const targetDir = path.resolve(process.cwd(), 'mediobot-ui-refinement/src');
    const beforeStats = fs.statSync(targetDir);

    // Execute heavy fixture operations
    const runtime = new OfflineFixtureRuntime();
    const projectId = 'fixture-project-offline';
    await runtime.saveFile(projectId, 'src/calculator.ts', '// Massive change', 'old');
    await runtime.createFileEntry(projectId, 'src', 'should-never-touch-disk.ts', 'file');
    await runtime.saveFile(projectId, 'src/should-never-touch-disk.ts', '// Disk untouched', '');
    await runtime.deleteFileEntry(projectId, 'src/should-never-touch-disk.ts');

    // Assert after operations that zero host files were created or modified
    for (const p of hostCheckPaths) {
      assert.equal(fs.existsSync(p), false, `Host path ${p} must NOT exist on host disk after operations`);
    }
    assert.equal(
      fs.existsSync(path.resolve(process.cwd(), 'src/should-never-touch-disk.ts')),
      false,
      'Dynamic fixture file must NEVER be created on host filesystem'
    );

    const afterStats = fs.statSync(targetDir);
    assert.equal(beforeStats.mtimeMs, afterStats.mtimeMs, 'Host directory must remain completely untouched');
  });

  // --------------------------------------------------------------------------
  // 5. CodeEditorView: Save Status Discloses "Saved (Isolated Fixture)" & Untouched Host
  // --------------------------------------------------------------------------
  test('5. CodeEditorView: Discloses "Saved (Isolated Fixture)" and host files untouched', async () => {
    const EditorTestHarness: React.FC = () => {
      const { openFileTab, activeTabPath } = useApp();
      React.useEffect(() => {
        if (!activeTabPath) {
          openFileTab('src/calculator.ts');
        }
      }, [openFileTab, activeTabPath]);

      return React.createElement(CodeEditorView);
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(EditorTestHarness)
        )
      );
    });

    // Allow async load to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const saveStatusEl = container.querySelector('[data-testid="editor-save-status"]');
    assert.ok(saveStatusEl, 'Save status element must exist in editor status bar');
    assert.match(
      saveStatusEl.textContent || '',
      /Saved \(Isolated Fixture\)/,
      'Editor must display "Saved (Isolated Fixture)"'
    );

    const hostUntouchedEl = container.querySelector('[data-testid="editor-host-files-untouched"]');
    assert.ok(hostUntouchedEl, 'Host files untouched disclosure must exist');
    assert.match(
      hostUntouchedEl.textContent || '',
      /Host files remain untouched/,
      'Must disclose that host files remain untouched'
    );
  });

  // --------------------------------------------------------------------------
  // 6. Persistence Failure States & Host Isolation Error Propagation
  // --------------------------------------------------------------------------
  test('6. Persistence failure: localStorage failure causes saveFile rejection and surfaces error state in UI', async () => {
    const runtime = new OfflineFixtureRuntime();
    const projectId = 'fixture-project-offline';
    const filePath = 'src/calculator.ts';

    // 1. Establish baseline in isolated memory
    const baselineContent = '// Baseline content\nexport const baseline = 1;\n';
    await runtime.saveFile(projectId, filePath, baselineContent);
    assert.equal(await runtime.readFile(projectId, filePath), baselineContent);

    // 2. Simulate QuotaExceededError in localStorage.setItem
    const storageProto = Object.getPrototypeOf(globalThis.localStorage);
    const originalSetItem = storageProto.setItem;
    try {
      storageProto.setItem = function () {
        const error = new Error('The quota has been exceeded.');
        error.name = 'QuotaExceededError';
        throw error;
      };

      // saveFile MUST reject cleanly when storage persistence throws
      await assert.rejects(
        async () => {
          await runtime.saveFile(projectId, filePath, '// Should fail to persist');
        },
        (err: any) => {
          assert.equal(err.name, 'QuotaExceededError');
          return true;
        },
        'saveFile must reject cleanly when storage persistence throws'
      );

      // In-memory store must have reverted to baseline content rather than falsely claiming success
      const contentAfterFailure = await runtime.readFile(projectId, filePath);
      assert.equal(
        contentAfterFailure,
        baselineContent,
        'In-memory content must revert to previous content when persistence fails'
      );
      assert.equal(
        runtime.simulatedFileStore.get(`${projectId}:${filePath}`),
        baselineContent,
        'simulatedFileStore must revert to previous content'
      );
    } finally {
      storageProto.setItem = originalSetItem;
    }

    // 3. UI Level Verification: Mount CodeEditorView and verify error state surfaces
    const EditorTestHarness: React.FC = () => {
      const { openFileTab, activeTabPath } = useApp();
      React.useEffect(() => {
        if (!activeTabPath) {
          openFileTab('src/calculator.ts');
        }
      }, [openFileTab, activeTabPath]);

      return React.createElement(CodeEditorView);
    };

    await act(async () => {
      root.render(
        React.createElement(AppProvider, null,
          React.createElement(EditorTestHarness)
        )
      );
    });

    // Allow initial async load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // Obtain CodeMirror view and dispatch an edit
    const cmEditor = container.querySelector('.cm-editor') as any;
    assert.ok(cmEditor, 'CodeMirror editor DOM element must exist');
    const editorContainer = container.querySelector('.relative.flex-1.overflow-hidden') as any;
    const cmView = cmEditor.cmView?.view || editorContainer?.__cmView;
    assert.ok(cmView, 'CodeMirror EditorView instance must exist');

    await act(async () => {
      cmView.dispatch({
        changes: { from: 0, to: 0, insert: '// Unpersisted UI edit\n' },
      });
    });

    // Verify editor is now dirty and save button is enabled
    const saveButton = container.querySelector('button[title="Save file (⌘/Ctrl+S)"]') as HTMLButtonElement;
    assert.ok(saveButton, 'Save button must exist');
    assert.equal(saveButton.disabled, false, 'Save button must be enabled when editor is dirty');

    // Simulate localStorage quota exhaustion during UI save on prototype
    const targetStorage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : globalThis.localStorage;
    const proto = Object.getPrototypeOf(targetStorage);
    const origProtoSetItem = proto.setItem;
    proto.setItem = function () {
      const error = new Error('The quota has been exceeded.');
      error.name = 'QuotaExceededError';
      throw error;
    };

    try {
      // Trigger save by clicking save button
      await act(async () => {
        saveButton.click();
        await new Promise((r) => setTimeout(r, 100));
      });

      // Verify that editor surfaces "Error" in save status and renders alert banner
      const saveStatusEl = container.querySelector('[data-testid="editor-save-status"]');
      assert.ok(saveStatusEl, 'Save status element must exist');
      assert.equal(saveStatusEl.textContent?.trim(), 'Error', 'Status must display Error on persistence failure');

      const alertBanner = container.querySelector('[role="alert"]');
      assert.ok(alertBanner, 'Error alert banner must be displayed');
      assert.match(
        alertBanner.textContent || '',
        /The quota has been exceeded/,
        'Alert banner must contain quota exceeded error message'
      );
    } finally {
      proto.setItem = origProtoSetItem;
    }

    // Now restore localStorage and save again - verify recovery
    await act(async () => {
      const retryButton = container.querySelector('button[title="Save file (⌘/Ctrl+S)"]') as HTMLButtonElement;
      retryButton?.click();
      await new Promise((r) => setTimeout(r, 200));
    });

    const recoveredStatusEl = container.querySelector('[data-testid="editor-save-status"]');
    assert.match(
      recoveredStatusEl?.textContent || '',
      /Saved \(Isolated Fixture\)/,
      'Status must recover to Saved (Isolated Fixture) after successful retry'
    );
  });

  // --------------------------------------------------------------------------
  // 7. Corrupted Storage Recovery
  // --------------------------------------------------------------------------
  test('7. Corrupted storage recovery: loadIsolatedStorage backs up invalid JSON and safely defaults', async () => {
    // Write invalid JSON into FIXTURE_ISOLATED_FILES_KEY
    const corruptedData = '{"files": INVALID_JSON_BODY...';
    globalThis.localStorage.setItem(FIXTURE_ISOLATED_FILES_KEY, corruptedData);

    // Initializing runtime must NOT throw
    const runtime = new OfflineFixtureRuntime();
    assert.ok(runtime, 'Runtime must initialize gracefully despite corrupted storage');

    // Default template should be returned cleanly
    const content = await runtime.readFile('fixture-project-offline', 'src/calculator.ts');
    assert.match(content, /Division by zero guard/);

    // Corrupted backup must be preserved in localStorage
    const allKeys = Object.keys(dom.window.localStorage);
    const backupKey = allKeys.find((k) => k.startsWith(`${FIXTURE_ISOLATED_FILES_KEY}_corrupted_backup_`));
    assert.ok(backupKey, 'A corrupted backup key must be stored in localStorage');
    assert.equal(globalThis.localStorage.getItem(backupKey!), corruptedData);
  });
});
