// Jest runtime mock for the 'vscode' module used by the extension during tests
// Keep surface minimal yet sufficient for activate() to run.

const disposable = () => ({ dispose: jest.fn() });

export const commands = {
  registerCommand: jest.fn(() => disposable()),
  executeCommand: jest.fn(() => Promise.resolve())
};

export const window = {
  registerWebviewViewProvider: jest.fn(() => disposable()),
  showInformationMessage: jest.fn(),
  setStatusBarMessage: jest.fn(),
  createOutputChannel: jest.fn((name: string) => ({
    name,
    appendLine: jest.fn(),
    dispose: jest.fn()
  }))
};

export const workspace = {
  getConfiguration: jest.fn((_section?: string) => ({
    get: <T>(_key: string, defaultValue?: T) => defaultValue as T
  }))
};

export type ExtensionContext = { subscriptions: Array<{ dispose: () => any } | any> };

export default {
  commands,
  window,
  workspace
};
