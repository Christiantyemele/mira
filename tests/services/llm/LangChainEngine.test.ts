import { LangChainEngine } from '../../../services/llm/LangChainEngine';

describe('LangChainEngine', () => {
  it('runChatChain assembles prompt with system, role, context, and history; returns text', async () => {
    const invoke = jest.fn(async (prompt: string) => ({ content: `ECHO:${prompt}` }));
    const fakeModel = { invoke };
    const engine = new LangChainEngine(fakeModel);

    const res = await engine.runChatChain({
      systemPrompt: 'SYS',
      role: 'Developer',
      extraContext: 'CTX',
      messages: [
        { role: 'system', content: 'S1', timestamp: 1 },
        { role: 'user', content: 'Hi', timestamp: 2 },
        { role: 'assistant', content: 'Hello!', timestamp: 3 },
        { role: 'user', content: 'How are you?', timestamp: 4 }
      ]
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    const passed = (invoke.mock.calls[0][0]) as string;
    expect(passed).toContain('SYS');
    expect(passed).toContain('Role: Developer');
    expect(passed).toContain('Context: CTX');
    expect(passed).toContain('[SYSTEM] S1');
    expect(passed).toContain('[USER] Hi');
    expect(passed).toContain('[ASSISTANT] Hello!');
    expect(passed).toContain('[USER] How are you?');

    expect(res.text).toContain('ECHO:');
  });

  it('runPlanningChain returns outline string based on project state and context', async () => {
    const invoke = jest.fn(async (prompt: string) => ({ content: `PLAN:${prompt}` }));
    const fakeModel = { invoke };
    const engine = new LangChainEngine(fakeModel);

    const res = await engine.runPlanningChain({
      projectState: { title: 'Feature X', summary: 'Do X', goals: ['g1', 'g2'] },
      role: 'Architect',
      extraContext: 'Additional context'
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    const passed = (invoke.mock.calls[0][0]) as string;
    expect(passed).toContain('Project: Feature X');
    expect(passed).toContain('Summary: Do X');
    expect(passed).toContain('Goals: g1; g2');
    expect(passed).toContain('Role: Architect');
    expect(passed).toContain('Context: Additional context');
    expect(res.outline).toContain('PLAN:');
  });
});
