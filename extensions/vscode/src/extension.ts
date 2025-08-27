import * as vscode from 'vscode';
import { ChatViewProvider } from './chat/ChatViewProvider';
import { TerminalViewProvider } from './terminal/TerminalViewProvider';
import { PlannerViewProvider } from './planner/PlannerViewProvider';

export function activate(context: vscode.ExtensionContext) {
  // Providers
  const chatProvider = new ChatViewProvider(context);
  const terminalProvider = new TerminalViewProvider();
  const plannerProvider = new PlannerViewProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mira.chat', chatProvider),
    vscode.window.registerWebviewViewProvider('mira.terminal', terminalProvider),
    vscode.window.registerWebviewViewProvider('mira.planner', plannerProvider)
  );

  // Core commands
  const connectCmd = vscode.commands.registerCommand('mira.connect', async () => {
    vscode.window.setStatusBarMessage('Mira: Connecting (stub)...', 1500);
    await new Promise((r) => setTimeout(r, 300));
    vscode.window.showInformationMessage('Mira connected (stub).');
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
    listToolsCmd,
    executePromptCmd,
    openChatViewCmd,
    openTerminalPanelCmd,
    terminalNewCmd,
    terminalKillCmd,
    terminalReattachCmd,
    openPlannerCmd,
    plannerCreateCmd,
    plannerUpdateTaskCmd
  );
}

export function deactivate() {
  // noop for now
}
