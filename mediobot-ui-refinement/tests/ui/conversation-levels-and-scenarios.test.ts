import { describe, it, expect } from 'bun:test';
import {
  MOCK_SCENARIOS,
  PROTOTYPE_ORGANIZATION_AGENTS,
} from '../../src/mock/mockScenarios';
import type { Thread, TurnItem, Turn } from '../../src/types';

describe('Mediobot UI Prototype - 5-Level Conversation Architecture & Scenarios', () => {
  describe('Level 1: Organization & Persistent Mediobot Identities', () => {
    it('provides persistent identities, capabilities, and configurations for all core Mediobots', () => {
      expect(PROTOTYPE_ORGANIZATION_AGENTS.length).toBeGreaterThanOrEqual(6);
      const ids = PROTOTYPE_ORGANIZATION_AGENTS.map((a) => a.id);
      expect(ids).toContain('maestro');
      expect(ids).toContain('cody');
      expect(ids).toContain('tester');
      expect(ids).toContain('research');
      expect(ids).toContain('doc');
      expect(ids).toContain('scraapy');
      expect(ids).toContain('vision');

      // Maestro is orchestrator
      const maestro = PROTOTYPE_ORGANIZATION_AGENTS.find((a) => a.id === 'maestro');
      expect(maestro?.group).toBe('orchestrator');
      expect(maestro?.directConversationAvailable).toBe(true);

      // Vision is marked as development prototype
      const vision = PROTOTYPE_ORGANIZATION_AGENTS.find((a) => a.id === 'vision');
      expect(vision?.status).toBe('development');
    });
  });

  describe('Level 2: Team Workspace Isolation', () => {
    it('isolates team workspace identities and ensures distinct teamId across scenarios', () => {
      const teamIds = new Set(MOCK_SCENARIOS.map((s) => s.activeTeamId));
      expect(teamIds.size).toBeGreaterThanOrEqual(5);

      // Scenario 1 represents a fresh new team workspace with 0 assigned specialists
      const s1 = MOCK_SCENARIOS.find((s) => s.id === 'scenario-1');
      expect(s1).toBeDefined();
      expect(s1?.conversationLevel).toBe('LEVEL 2 - TEAM WORKSPACE');
      const s1Thread = s1?.relevantThreads[0];
      expect(s1Thread?.assignedSpecialists).toEqual([]);
      expect(s1Thread?.threadType).toBe('team');
      expect(s1Thread?.mode).toBe('connected_main');
    });
  });

  describe('Level 3: Main Team Conversations within Active Team', () => {
    it('supports multiple independent Main Team conversations sharing the same teamId', () => {
      const s2 = MOCK_SCENARIOS.find((s) => s.id === 'scenario-2');
      expect(s2).toBeDefined();
      expect(s2?.conversationLevel).toBe('LEVEL 3 - MAIN TEAM');
      expect(s2?.relevantThreads.length).toBeGreaterThanOrEqual(2);

      const [threadA, threadB] = s2!.relevantThreads;
      expect(threadA.teamId).toBe(threadB.teamId);
      expect(threadA.id).not.toBe(threadB.id);
      expect(threadA.threadType).toBe('team');
      expect(threadB.threadType).toBe('team');
      expect(threadA.ownerAgent).toBe('maestro');
      expect(threadB.ownerAgent).toBe('maestro');
    });
  });

  describe('Level 4: Specialist Conversations & Side Chats', () => {
    it('maintains independent specialist side-chat sessions linked to the team workspace', () => {
      const s3 = MOCK_SCENARIOS.find((s) => s.id === 'scenario-3');
      expect(s3).toBeDefined();
      expect(s3?.conversationLevel).toBe('LEVEL 4 - SPECIALISTS');

      const sideChat = s3!.relevantThreads.find((t) => t.mode === 'standalone_specialist' || t.ownerAgent === 'cody');
      expect(sideChat).toBeDefined();
      expect(sideChat?.ownerAgent).toBe('cody');
      expect(sideChat?.specialistId).toBe('cody');
      expect(sideChat?.teamId).toBe('team-apollo-s2');

      // The specialist side chat has dedicated Cody turns
      const codyItem = sideChat?.turns?.[0]?.items?.find(
        (it) => it.type === 'agent_message' && it.actor?.mediobotId === 'cody'
      );
      expect(codyItem).toBeDefined();
    });
  });

  describe('Level 5: Execution, Collaboration, and Verification', () => {
    it('verifies concurrent specialist task assignments and model attribution', () => {
      const s4 = MOCK_SCENARIOS.find((s) => s.id === 'scenario-4');
      expect(s4).toBeDefined();
      expect(s4?.conversationLevel).toBe('LEVEL 5 - COLLABORATION');
      const thread = s4!.relevantThreads[0];
      expect(thread.assignedSpecialists).toContain('cody');
      expect(thread.assignedSpecialists).toContain('tester');
    });

    it('verifies peer messaging and collaboration stream data structure', () => {
      const s10 = MOCK_SCENARIOS.find((s) => s.id === 'scenario-10');
      expect(s10).toBeDefined();
      expect(s10?.conversationLevel).toBe('LEVEL 5 - COLLABORATION');
      const thread = s10!.relevantThreads[0];
      const peerMessages = thread.turns
        ?.flatMap((t) => t.items || [])
        .filter((i) => i.type === 'peer_message');
      expect(peerMessages?.length).toBeGreaterThanOrEqual(2);
      expect(peerMessages?.[0].actor?.mediobotId).toBe('research');
      expect(peerMessages?.[0].peerMessage?.recipientId).toBe('doc');
    });

    it('verifies tool execution progress, logs, and structured outcome', () => {
      const s11 = MOCK_SCENARIOS.find((s) => s.id === 'scenario-11');
      expect(s11).toBeDefined();
      const thread = s11!.relevantThreads[0];
      const toolExecutions = thread.turns
        ?.flatMap((t) => t.items || [])
        .filter((i) => i.type === 'tool_execution');
      expect(toolExecutions?.length).toBeGreaterThanOrEqual(1);
      const tool = toolExecutions?.[0]?.tool;
      expect(tool?.toolName).toBe('terminal.run');
      expect(tool?.exitCode).toBe(0);
      expect(tool?.outputLog).toContain('PASS');
    });

    it('verifies failure diagnostic and self-recovery pattern', () => {
      const s12 = MOCK_SCENARIOS.find((s) => s.id === 'scenario-12');
      expect(s12).toBeDefined();
      const thread = s12!.relevantThreads[0];
      const items = thread.turns?.flatMap((t) => t.items || []) || [];
      const failTool = items.find((i) => i.tool?.exitCode === 1);
      expect(failTool).toBeDefined();
      expect(failTool?.tool?.error).toContain('ENOENT');

      // Subsequent agent message diagnoses and adapts
      const recoveryMsg = items.find(
        (i) => i.type === 'agent_message' && i.text?.includes('Recovering from missing file error')
      );
      expect(recoveryMsg).toBeDefined();

      const recoveredTool = items.find((i) => i.tool?.recoveredFromExecution === true);
      expect(recoveredTool).toBeDefined();
      expect(recoveredTool?.tool?.exitCode).toBe(0);
    });

    it('verifies independent tester verification proof badge', () => {
      const s13 = MOCK_SCENARIOS.find((s) => s.id === 'scenario-13');
      expect(s13).toBeDefined();
      const thread = s13!.relevantThreads[0];
      const items = thread.turns?.flatMap((t) => t.items || []) || [];
      const verifiedProof = items.find(
        (i) => i.tool?.isVerification === true && i.tool?.outcomeBadge?.includes('VERIFICATION PROOF: ACCEPTED')
      );
      expect(verifiedProof).toBeDefined();
    });
  });

  describe('Isolation and Security Guardrails', () => {
    it('confirms all 15 prototype scenarios are defined with typed realistic data', () => {
      expect(MOCK_SCENARIOS.length).toBe(15);
      MOCK_SCENARIOS.forEach((s) => {
        expect(s.id).toBeDefined();
        expect(s.name.length).toBeGreaterThan(0);
        expect(s.relevantThreads.length).toBeGreaterThan(0);
        expect(s.activeTeamId).toBeDefined();
      });
    });

    it('verifies mock scenarios contain zero committed API keys, tokens, or live production paths', () => {
      const serialized = JSON.stringify(MOCK_SCENARIOS);
      expect(serialized).not.toContain('AIzaSy'); // Google API key prefix
      expect(serialized).not.toContain('sk-proj'); // OpenAI project key prefix
      expect(serialized).not.toContain('ghp_'); // GitHub PAT prefix
      expect(serialized).not.toContain('/Users/'); // Local absolute paths
      expect(serialized).not.toContain('mediobot.db'); // Production SQLite DB
    });
  });
});
