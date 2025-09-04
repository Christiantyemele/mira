import * as vscode from 'vscode';
import { ChatViewProvider } from './chat/ChatViewProvider';
import { TerminalViewProvider } from './terminal/TerminalViewProvider';
import { PlannerViewProvider } from './planner/PlannerViewProvider';

// Minimal transport stubs to reflect MCP transport selection without external deps
interface NoopTransport {
  send(json: string): void | Promise<void>;
  onMessage(cb: (msg: string) => void): void;
}
class StdioTransport implements NoopTransport {
  private _cb: ((msg: string) => void) | undefined;
  constructor(public readonly command: string) {}
  send(_json: string) { /* noop */ }
  onMessage(cb: (msg: string) => void) { this._cb = cb; }
}
class HttpTransport implements NoopTransport {
  private _cb: ((msg: string) => void) | undefined;
  constructor(public readonly baseUrl: string) {}
  send(_json: string) { /* noop */ }
  onMessage(cb: (msg: string) => void) { this._cb = cb; }
}

export function activate(context: vscode.ExtensionContext) {
  // Select MCP transport based on workspace configuration
  const cfg = vscode.workspace.getConfiguration('mira');
  const transportType = (cfg.get<'stdio' | 'http'>('transport', 'stdio'));
  let selectedTransport: NoopTransport;
  let transportInfo = '';
  if (transportType === 'http') {
    const baseUrl = cfg.get<string>('http.baseUrl', 'http://localhost:3000');
    selectedTransport = new HttpTransport(baseUrl);
    transportInfo = `http:${baseUrl}`;
  } else {
    const command = cfg.get<string>('stdio.command', 'mira-mcp');
    selectedTransport = new StdioTransport(command);
    transportInfo = `stdio:${command}`;
  }
  const output = vscode.window.createOutputChannel('Mira');
  context.subscriptions.push(output);
  output.appendLine(`MCP transport selected: ${transportInfo}`);

  // Providers
  const chatProvider = new ChatViewProvider(context);
  const terminalProvider = new TerminalViewProvider();
  const plannerProvider = new PlannerViewProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('miraChatView', chatProvider),
    vscode.window.registerWebviewViewProvider('mira.terminal', terminalProvider),
    vscode.window.registerWebviewViewProvider('mira.planner', plannerProvider)
  );

  // Core commands
  const connectCmd = vscode.commands.registerCommand('mira.connect', async () => {
    vscode.window.setStatusBarMessage('Mira: Connecting (stub)...', 1500);
    await new Promise((r) => setTimeout(r, 300));
    vscode.window.showInformationMessage('Mira connected (stub).');
  });

  // Alias command to focus/open the chat view as required by prior spec
  const chatCmd = vscode.commands.registerCommand('mira.chat', async () => {
    await vscode.commands.executeCommand('workbench.view.explorer');
    vscode.commands.executeCommand('mira.chat.focus');
  });

  const listToolsCmd = vscode.commands.registerCommand('mira.listTools', async () => {
    vscode.window.showInformationMessage('Tools (stub): files/read, files/write, exec/run, terminals/*, planner/*');
  });

  const executePromptCmd = vscode.commands.registerCommand('mira.executePrompt', async () => {
    const prompt = await vscode.window.showInputBox({ prompt: 'Enter your prompt for Mira' });
    if (prompt) {
      chatProvider.postAssistantMessage(`You said: ${prompt}. (LLM stub response)`);
    }
  });

  const openChatViewCmd = vscode.commands.registerCommand('mira.openChatView', async () => {
    await vscode.commands.executeCommand('workbench.view.explorer');
    vscode.commands.executeCommand('mira.chat.focus');
  });

  // Terminal commands
  const openTerminalPanelCmd = vscode.commands.registerCommand('mira.openTerminalPanel', async () => {
    await vscode.commands.executeCommand('workbench.view.explorer');
    vscode.commands.executeCommand('mira.terminal.focus');
  });
  const terminalNewCmd = vscode.commands.registerCommand('mira.terminal.newSession', async () => {
    terminalProvider.newSession();
  });
  const terminalKillCmd = vscode.commands.registerCommand('mira.terminal.killSession', async () => {
    terminalProvider.killSession();
  });
  const terminalReattachCmd = vscode.commands.registerCommand('mira.terminal.reattachSession', async () => {
    terminalProvider.reattachSession();
  });

  // Planner commands
  const openPlannerCmd = vscode.commands.registerCommand('mira.openPlannerView', async () => {
    await vscode.commands.executeCommand('workbench.view.explorer');
    vscode.commands.executeCommand('mira.planner.focus');
  });
  // Alias command as required by prior spec
  const openPlannerAliasCmd = vscode.commands.registerCommand('mira.openPlanner', async () => {
    await vscode.commands.executeCommand('workbench.view.explorer');
    vscode.commands.executeCommand('mira.planner.focus');
  });

  const plannerCreateCmd = vscode.commands.registerCommand('mira.planner.createPlan', async () => {
    plannerProvider.createPlanStub();
    vscode.window.showInformationMessage('Planner: created a sample plan (stub).');
  });
  const plannerUpdateTaskCmd = vscode.commands.registerCommand('mira.planner.updateTask', async () => {
    const id = await vscode.window.showInputBox({ prompt: 'Enter Task ID to toggle status' });
    if (id) plannerProvider['updateTask']?.(id, {});
  });

  context.subscriptions.push(
    connectCmd,
    chatCmd,
    listToolsCmd,
    executePromptCmd,
    openChatViewCmd,
    openTerminalPanelCmd,
    terminalNewCmd,
    terminalKillCmd,
    terminalReattachCmd,
    openPlannerCmd,
    openPlannerAliasCmd,
    plannerCreateCmd,
    plannerUpdateTaskCmd
  );
}

export function deactivate() {
  // noop for now
}
