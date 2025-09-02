// Jest mock module for 'langchain' used by LangChainEngine
// Provides minimal ChatOpenAI and PromptTemplate implementations.

export class ChatOpenAI {
  public opts: any;
  public invoke = jest.fn(async (input: any) => {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    return { content: `MOCK:${text}` };
  });
  constructor(opts: any) {
    this.opts = opts;
  }
}

export class PromptTemplate {
  template: string;
  inputVariables: string[];
  constructor(opts: { template: string; inputVariables: string[] }) {
    this.template = opts.template;
    this.inputVariables = opts.inputVariables;
  }
  async format(vars: Record<string, any>): Promise<string> {
    let out = this.template;
    for (const k of Object.keys(vars)) {
      out = out.split(`{${k}}`).join(String(vars[k] ?? ''));
    }
    return out;
  }
}
