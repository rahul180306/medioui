import { describe, it, expect } from 'bun:test';
import {
  MOCK_THREADS,
  MOCK_DEFINITIONS,
  MOCK_TERMINAL_SESSIONS_BY_TEAM,
  getTerminalSessionsForTeam,
} from '../../src/runtime/mockData';
import fs from 'node:fs';
import path from 'node:path';

describe('Mediobot UI Design Prototype - 5 Preloaded Conversations & Complete UI State', () => {
  describe('Requirement 1: Absence of Prototype Floating Selector', () => {
    it('verifies PrototypeScenarioSelector is completely removed from App.tsx', () => {
      const appPath = path.resolve(__dirname, '../../src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf8');
      expect(content).not.toContain('PrototypeScenarioSelector');
      expect(content).not.toContain('floating');
    });

    it('verifies PrototypeScenarioSelector component file does not exist', () => {
      const compPath = path.resolve(__dirname, '../../src/components/PrototypeScenarioSelector.tsx');
      expect(fs.existsSync(compPath)).toBe(false);
    });
  });

  describe('Requirement 2 & 3: Five Complete, Preloaded Conversations in History', () => {
    const mainThreads = MOCK_THREADS.filter((t) => t.threadType === 'team');

    it('contains all 5 canonical main team conversations', () => {
      expect(mainThreads.length).toBe(5);
      const titles = mainThreads.map((t) => t.title);
      expect(titles).toContain('Getting Started with Mediobot');
      expect(titles).toContain('Build a Calculator Application');
      expect(titles).toContain('Research AI Agent Frameworks');
      expect(titles).toContain('Develop a Full-Stack Dashboard');
      expect(titles).toContain('Debug a Failing Application');
    });

    it('Conversation 1: Getting Started with Mediobot is strictly conversational without specialists or tools', () => {
      const c1 = mainThreads.find((t) => t.title === 'Getting Started with Mediobot');
      expect(c1).toBeDefined();
      expect(c1?.assignedSpecialists).toEqual([]);
      expect(c1?.turns.length).toBe(3);

      // Verifies conversational user messages and maestro responses
      const prompts = c1!.turns.map((t) => t.prompt);
      expect(prompts).toContain('Hi');
      expect(prompts).toContain('What can you do?');
      expect(prompts).toContain('Explain how your specialist teams work.');

      // Zero tool calls, zero code diffs
      const allItems = c1!.turns.flatMap((t) => t.items);
      const toolItems = allItems.filter((i) => i.type === 'tool_execution');
      const diffItems = allItems.filter((i) => i.type === 'diff');
      expect(toolItems.length).toBe(0);
      expect(diffItems.length).toBe(0);
    });

    it('Conversation 2: Build a Calculator Application has Maestro orchestration and Cody, Tester, Doc specialists', () => {
      const c2 = mainThreads.find((t) => t.title === 'Build a Calculator Application');
      expect(c2).toBeDefined();
      expect(c2?.assignedSpecialists).toEqual(['cody', 'tester', 'doc']);

      // Main Team is multi-participant shared meeting room
      expect(c2?.ownerAgent).toBe('team');
      expect(c2?.threadType).toBe('team');
      const firstTurn = c2!.turns[0];
      expect(firstTurn.prompt).toBe('Build a calculator application with a frontend, backend, and automated tests.');
      const maestroMsg = firstTurn.items.find((i) => i.type === 'agent_message' && i.actor?.mediobotId === 'maestro');
      expect(maestroMsg).toBeDefined();

      // Independent specialist side chats exist for this team
      const teamThreads = MOCK_THREADS.filter((t) => t.teamId === 'team-calculator');
      const codyChat = teamThreads.find((t) => t.specialistId === 'cody');
      const testerChat = teamThreads.find((t) => t.specialistId === 'tester');
      const docChat = teamThreads.find((t) => t.specialistId === 'doc');

      expect(codyChat).toBeDefined();
      expect(testerChat).toBeDefined();
      expect(docChat).toBeDefined();

      // Cody has file inspection, diff, and handover
      const codyItems = codyChat!.turns.flatMap((t) => t.items);
      expect(codyItems.some((i) => i.type === 'diff' && i.diff?.filePath === 'src/calculator.js')).toBe(true);

      // Tester has independent test execution with proof badge
      const testerItems = testerChat!.turns.flatMap((t) => t.items);
      const testTool = testerItems.find((i) => i.tool?.toolName === 'terminal.run');
      expect(testTool?.tool?.exitCode).toBe(0);
      expect(testTool?.tool?.outcomeBadge).toContain('VERIFICATION PROOF: ACCEPTED');
    });

    it('Conversation 3: Research AI Agent Frameworks coordinates Research, Scraapy, and Doc', () => {
      const c3 = mainThreads.find((t) => t.title === 'Research AI Agent Frameworks');
      expect(c3).toBeDefined();
      expect(c3?.assignedSpecialists).toEqual(['research', 'scraapy', 'doc']);

      // Scraapy has web extraction event
      const teamThreads = MOCK_THREADS.filter((t) => t.teamId === 'team-research');
      const scraapyChat = teamThreads.find((t) => t.specialistId === 'scraapy');
      expect(scraapyChat).toBeDefined();
      const scraapyItems = scraapyChat!.turns.flatMap((t) => t.items);
      const crawlTool = scraapyItems.find((i) => i.tool?.toolName === 'scraapy.fetch');
      expect(crawlTool).toBeDefined();
      expect(crawlTool?.tool?.status).toBe('success');

      // Research has peer message handover to Scraapy
      const researchChat = teamThreads.find((t) => t.specialistId === 'research');
      const peerMsg = researchChat!.turns.flatMap((t) => t.items).find((i) => i.type === 'peer_message');
      expect(peerMsg?.peerMessage?.recipientId).toBe('scraapy');
    });

    it('Conversation 4: Develop a Full-Stack Dashboard demonstrates parallel execution across Cody, Tester, Research, Doc, Vision', () => {
      const c4 = mainThreads.find((t) => t.title === 'Develop a Full-Stack Dashboard');
      expect(c4).toBeDefined();
      expect(c4?.assignedSpecialists).toEqual(['cody', 'tester', 'research', 'doc', 'vision']);

      const teamThreads = MOCK_THREADS.filter((t) => t.teamId === 'team-dashboard');
      expect(teamThreads.length).toBe(7); // Main + Maestro direct + 5 specialists
    });

    it('verifies Maestro has its own direct chat distinct from Main Team shared room', () => {
      const maestroChats = MOCK_THREADS.filter((t) => t.specialistId === 'maestro' && t.threadType === 'mind');
      expect(maestroChats.length).toBe(5);
      maestroChats.forEach((m) => {
        expect(m.ownerAgent).toBe('maestro');
        expect(m.threadType).toBe('mind');
      });
    });

    it('Conversation 5: Debug a Failing Application demonstrates failure, hotfix, and unresolved blocker', () => {
      const c5 = mainThreads.find((t) => t.title === 'Debug a Failing Application');
      expect(c5).toBeDefined();
      expect(c5?.assignedSpecialists).toEqual(['cody', 'tester']);

      // Main Team explicitly highlights unresolved upstream blocker
      const m2 = c5!.turns[0].items.find(
        (i) => i.type === 'agent_message' && i.actor?.mediobotId === 'maestro' && i.text?.includes('Unresolved Blocker')
      );
      expect(m2).toBeDefined();
      expect(m2?.text).toContain('BLOCKED (External Dependency)');

      // Cody chat has real failure tool card with exit code 1
      const codyChat = MOCK_THREADS.find((t) => t.id === 'thread-debug-cody');
      expect(codyChat).toBeDefined();
      const items = codyChat!.turns.flatMap((t) => t.items);
      const failedTool = items.find((i) => i.tool?.exitCode === 1);
      expect(failedTool).toBeDefined();
      expect(failedTool?.tool?.status).toBe('failed');
      expect(failedTool?.tool?.error).toContain('TypeError');

      // Followed by hotfix diff and recovered retest
      const diffItem = items.find((i) => i.type === 'diff' && i.diff?.filePath === 'src/auth/session.ts');
      expect(diffItem).toBeDefined();
      const recoveredTool = items.find((i) => i.tool?.recoveredFromExecution === true);
      expect(recoveredTool?.tool?.exitCode).toBe(0);
    });
  });

  describe('Requirement 5: Integrated CLI / Terminal Multi-Session Mock Data', () => {
    it('provides distinct, realistic terminal sessions for each conversation', () => {
      const teams = ['team-getting-started', 'team-calculator', 'team-research', 'team-dashboard', 'team-debug'];
      for (const teamId of teams) {
        const sessions = getTerminalSessionsForTeam(teamId);
        expect(sessions.length).toBeGreaterThanOrEqual(2);
        sessions.forEach((s) => {
          expect(s.id).toBeDefined();
          expect(s.name).toBeDefined();
          expect(s.lines.length).toBeGreaterThan(0);
        });
      }
    });

    it('Calculator terminal sessions contain npm install, test, and vite dev', () => {
      const sessions = getTerminalSessionsForTeam('team-calculator');
      const names = sessions.map((s) => s.name);
      expect(names).toContain('npm: install');
      expect(names).toContain('npm: test');
      expect(names).toContain('vite: dev');

      const testSession = sessions.find((s) => s.name === 'npm: test');
      const lines = testSession!.lines.map((l) => l.text).join('\n');
      expect(lines).toContain('arithmetic operations');
      expect(lines).toContain('divide by zero guard');
    });

    it('Debug terminal sessions contain crash log with exit code 1 and upstream 503 blocked status', () => {
      const sessions = getTerminalSessionsForTeam('team-debug');
      const crashSession = sessions.find((s) => s.name === 'bash: crash-log');
      expect(crashSession).toBeDefined();
      const crashLines = crashSession!.lines.map((l) => l.text).join('\n');
      expect(crashLines).toContain('TypeError');
      expect(crashLines).toContain('exited with code 1');

      const upstreamSession = sessions.find((s) => s.name === 'bash: upstream-health');
      expect(upstreamSession).toBeDefined();
      const upstreamLines = upstreamSession!.lines.map((l) => l.text).join('\n');
      expect(upstreamLines).toContain('503 Service Unavailable');
      expect(upstreamLines).toContain('[STATUS: BLOCKED]');
    });
  });

  describe('Requirement 8: Strict Design-Only Isolation & Security', () => {
    it('ensures zero production API keys, personal user paths, or DB paths in mock data', () => {
      const serialized = JSON.stringify({ MOCK_THREADS, MOCK_TERMINAL_SESSIONS_BY_TEAM });
      expect(serialized).not.toContain('AIzaSy');
      expect(serialized).not.toContain('sk-proj');
      expect(serialized).not.toContain('ghp_');
      expect(serialized).not.toContain('mediobot.db');
    });
  });
});
