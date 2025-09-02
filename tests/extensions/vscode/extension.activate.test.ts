import * as vscode from 'vscode';

// Use CommonJS require to avoid hoisting issues with jest mocks
const importActivate = async () => {
// DEBUG: Print current directory and attempted import path
console.log('DEBUG: __dirname', __dirname);
console.log('DEBUG: Attempting import:', require('path').resolve(__dirname, '../../../extensions/vscode/src/extension'));
  const mod = await import('../../../extensions/vscode/src/extension');
  return mod as unknown as { activate: (ctx: vscode.ExtensionContext) => void };
};

describe('VS Code extension activate()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers core commands: mira.connect, mira.chat, mira.openPlanner', async () => {
    const { activate } = await importActivate();
    const context: vscode.ExtensionContext = { subscriptions: [] } as any;

    activate(context);

    const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls).toEqual(expect.arrayContaining(['mira.connect', 'mira.chat', 'mira.openPlanner']));
  });
});
