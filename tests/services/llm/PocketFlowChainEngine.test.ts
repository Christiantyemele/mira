import PocketFlow from 'pocketflow';
import PocketFlowChainEngine from '../../../services/llm/PocketFlowChainEngine';

// The jest moduleNameMapper maps 'pocketflow' to our mock class in tests/mocks/pocketflow.ts

describe('PocketFlowChainEngine', () => {
  it('delegates to PocketFlow.chat with correct parameters and returns { text }', async () => {
    const pf = new (PocketFlow as any)();
    const engine = new PocketFlowChainEngine(pf);

    (pf.chat as jest.Mock).mockResolvedValueOnce({ text: 'sdk reply' });

    const res = await engine.runChatChain({
      systemPrompt: 'sys',
      messages: [
        { role: 'system', content: 's', timestamp: 1 },
        { role: 'user', content: 'hello', timestamp: 2 }
      ],
      role: 'Developer',
      tools: [{ name: 'doThing', description: 'x' }],
      extraContext: 'ctx'
    });

    expect(pf.chat).toHaveBeenCalledTimes(1);
    expect(pf.chat).toHaveBeenCalledWith({
      systemPrompt: 'sys',
      messages: [
        { role: 'system', content: 's' },
        { role: 'user', content: 'hello' }
      ],
      role: 'Developer',
      tools: [{ name: 'doThing', description: 'x' }],
      context: { extraContext: 'ctx' }
    });
    expect(res).toEqual({ text: 'sdk reply' });
  });

  it('delegates to PocketFlow.plan with correct parameters and returns { outline }', async () => {
    const pf = new (PocketFlow as any)();
    const engine = new PocketFlowChainEngine(pf);

    (pf.plan as jest.Mock).mockResolvedValueOnce({ outline: 'sdk outline' });

    const res = await engine.runPlanningChain({
      projectState: { title: 'Build feature', summary: 'desc', goals: ['g1', 'g2'] },
      role: 'Architect',
      extraContext: 'ctx2'
    });

    expect(pf.plan).toHaveBeenCalledTimes(1);
    expect(pf.plan).toHaveBeenCalledWith({
      title: 'Build feature',
      summary: 'desc',
      goals: ['g1', 'g2'],
      context: { role: 'Architect', extraContext: 'ctx2' }
    });
    expect(res).toEqual({ outline: 'sdk outline' });
  });
});
