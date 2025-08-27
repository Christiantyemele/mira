import * as vscode from 'vscode';
import { ChatViewProvider } from './chat/ChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const chatProvider = new ChatViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mira.chat', chatProvider)
  );

  const connectCmd = vscode.commands.registerCommand('mira.connect', async () => {
    vscode.window.setStatusBarMessage('Mira: Connecting (stub)...', 1500);
    await new Promise((r) => setTimeout(r, 300));
    vscode.window.showInformationMessage('Mira connected (stub).');
  });

  const listToolsCmd = vscode.commands.registerCommand('mira.listTools', async () => {
    // In a later iteration this will call services/mcp Client.
    vscode.window.showInformationMessage('Tools (stub): files/read, files/write, exec/run');
  });

  const executePromptCmd = vscode.commands.registerCommand('mira.executePrompt', async () => {
    const prompt = await vscode.window.showInputBox({ prompt: 'Enter your prompt for Mira' });
    if (prompt) {
      chatProvider.postAssistantMessage(`You said: ${prompt}. (LLM stub response)`);
    }
  });

  const openChatViewCmd = vscode.commands.registerCommand('mira.openChatView', async () => {
    await vscode.commands.executeCommand('workbench.view.explorer');
    // Focus the chat view if available
    vscode.commands.executeCommand('mira.chat.focus');
  });

  context.subscriptions.push(connectCmd, listToolsCmd, executePromptCmd, openChatViewCmd);
}

export function deactivate() {
  // noop for now
}
