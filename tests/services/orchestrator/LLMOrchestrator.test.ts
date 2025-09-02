import { LLMOrchestrator } from '../../../services/orchestrator/LLMOrchestrator';
import { MemoryStore } from '../../../storage/memory/MemoryStore';
import { LiteLLMClient } from '../../../services/llm/LiteLLMClient';
import { ChainEngine } from '../../../services/llm/ChainEngine';

describe('LLMOrchestrator', () => {
  test('orchestrateChat persists history and returns assistant reply using injected engine', async () => {
    const memory = new MemoryStore();
    const client = new LiteLLMClient({ mode: 'mock' });

    const fakeEngine: ChainEngine = {
      runChatChain: jest.fn(async () => ({ text: 'Hi there!' })),
      runPlanningChain: jest.fn(async () => ({ outline: 'outline' }))
    };

    const orchestrator = new LLMOrchestrator(client, memory, fakeEngine);

    const sessionId = 'workspace-1';
    const res = await orchestrator.orchestrateChat('Hello, Mira', { sessionId, role: 'Developer' });

    expect(res.reply).toBe('Hi there!');
    const history = memory.getHistory(sessionId);
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('Hello, Mira');
    expect(history[1].role).toBe('assistant');
    expect(history[1].content).toBe('Hi there!');

    expect((fakeEngine.runChatChain as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  test('planTasks uses engine and returns a Plan structure', async () => {
    const memory = new MemoryStore();
    const client = new LiteLLMClient({ mode: 'mock' });

    const fakeEngine: ChainEngine = {
      runChatChain: jest.fn(async () => ({ text: 'reply' })),
      runPlanningChain: jest.fn(async () => ({ outline: 'sdk outline' }))
    };

    const orchestrator = new LLMOrchestrator(client, memory, fakeEngine);

    const projectState = { title: 'Add login feature', summary: 'Implement OAuth login', goals: ['Sign-in', 'Persist session'] };
    const plan = await orchestrator.planTasks(projectState, { sessionId: 'ws', role: 'Architect' });

    expect(plan.title).toBe('Add login feature');
    expect(Array.isArray(plan.tasks)).toBe(true);
    expect(plan.tasks.length).toBeGreaterThanOrEqual(4);
    expect(typeof plan.created_at).toBe('string');
    expect(typeof plan.updated_at).toBe('string');

    expect((fakeEngine.runPlanningChain as jest.Mock)).toHaveBeenCalledTimes(1);
  });
});
