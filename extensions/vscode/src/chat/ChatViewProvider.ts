import * as vscode from 'vscode';

// Import orchestrator and dependencies
import LLMOrchestrator, { OrchestratorContext } from '../../../../services/orchestrator/LLMOrchestrator';
import { LiteLLMClient } from '../../../../services/llm/LiteLLMClient';
import { MemoryStore } from '../../../../storage/memory/MemoryStore';

// Singleton orchestrator for the extension session
let orchestrator: LLMOrchestrator | undefined;

function getOrchestrator(): LLMOrchestrator {
  if (!orchestrator) {
    // In a real extension, these would be shared singletons
    const memory = new MemoryStore();
    const client = new LiteLLMClient({ mode: 'mock', embedDim: 16 });
    orchestrator = new LLMOrchestrator(client, memory);
  }
  return orchestrator;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private sessionId: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    // Use a persistent sessionId for the user/workspace
    this.sessionId = context.globalState.get<string>('mira.chat.sessionId') || String(Date.now());
    context.globalState.update('mira.chat.sessionId', this.sessionId);
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === 'user') {
        const userText = msg.text;
        // Optionally, show a loading indicator in the UI
        this.postAssistantMessage('...');
        try {
          const orchestrator = getOrchestrator();
          const context: OrchestratorContext = { sessionId: this.sessionId };
          const result = await orchestrator.orchestrateChat(userText, context);
          // Remove the loading indicator and show the real reply
          this.postAssistantMessage(result.reply);
        } catch (err: any) {
          this.postAssistantMessage('Error: ' + (err?.message || String(err)));
        }
      }
    });
  }

  postAssistantMessage(text: string) {
    this._view?.webview.postMessage({ type: 'assistant', text });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = String(Date.now());
    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Mira Chat</title>
          <style>
            body {
              font-family: var(--vscode-font-family);
              padding: 0;
              margin: 0;
              background: var(--vscode-sideBar-background, #1e1e1e);
            }
            #container {
              display: flex;
              flex-direction: column;
              height: 100vh;
              background: linear-gradient(180deg, var(--vscode-sideBar-background, #1e1e1e) 60%, var(--vscode-editor-background, #23272e) 100%);
            }
            #messages {
              flex: 1;
              overflow: auto;
              padding: 16px 12px 8px 12px;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .msg-row {
              display: flex;
              align-items: flex-end;
              gap: 8px;
            }
            .msg-row.user {
              flex-direction: row-reverse;
            }
            .avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              background: var(--vscode-editorWidget-background, #252526);
              box-shadow: 0 1px 4px 0 rgba(0,0,0,0.10);
              border: 1.5px solid var(--vscode-editorWidget-border, #333);
              margin-bottom: 2px;
              flex-shrink: 0;
            }
            .msg {
              max-width: 70%;
              padding: 10px 14px;
              border-radius: 16px;
              font-size: 1.05em;
              box-shadow: 0 2px 8px 0 rgba(0,0,0,0.08);
              word-break: break-word;
              line-height: 1.6;
              border: 1px solid transparent;
              transition: background 0.2s;
            }
            .msg.user {
              background: var(--vscode-editor-inactiveSelectionBackground, #2a2d2e);
              color: var(--vscode-editor-foreground, #fff);
              border-top-right-radius: 4px;
              border-bottom-right-radius: 18px;
              border-top-left-radius: 18px;
              border-bottom-left-radius: 18px;
              border-color: var(--vscode-editorWidget-border, #333);
              margin-left: 32px;
            }
            .msg.assistant {
              background: var(--vscode-editor-selectionBackground, #3a3d41);
              color: var(--vscode-editor-foreground, #fff);
              border-top-left-radius: 4px;
              border-bottom-left-radius: 18px;
              border-top-right-radius: 18px;
              border-bottom-right-radius: 18px;
              border-color: var(--vscode-editorWidget-border, #333);
              margin-right: 32px;
            }
            #inputRow {
              display: flex;
              gap: 8px;
              padding: 12px;
              border-top: 1.5px solid var(--vscode-editorWidget-border, #333);
              background: var(--vscode-editorWidget-background, #23272e);
              box-shadow: 0 -2px 8px 0 rgba(0,0,0,0.04);
            }
            #prompt {
              flex: 1;
              font-size: 1em;
              padding: 8px 12px;
              border-radius: 8px;
              border: 1.5px solid var(--vscode-editorWidget-border, #333);
              background: var(--vscode-input-background, #23272e);
              color: var(--vscode-input-foreground, #fff);
              outline: none;
              transition: border 0.2s;
            }
            #prompt:focus {
              border-color: var(--vscode-editor-selectionHighlightBackground, #0078d4);
            }
            #send {
              font-size: 1em;
              padding: 8px 18px;
              border-radius: 8px;
              border: none;
              background: var(--vscode-button-background, #0078d4);
              color: var(--vscode-button-foreground, #fff);
              cursor: pointer;
              transition: background 0.2s;
              font-weight: 600;
              box-shadow: 0 1px 4px 0 rgba(0,0,0,0.10);
            }
            #send:hover {
              background: var(--vscode-button-hoverBackground, #005fa3);
            }
            ::-webkit-scrollbar {
              width: 8px;
              background: transparent;
            }
            ::-webkit-scrollbar-thumb {
              background: var(--vscode-scrollbarSlider-background, #444);
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div id="container">
            <div id="messages"></div>
            <div id="inputRow">
              <input id="prompt" type="text" placeholder="Ask Mira..." autocomplete="off" />
              <button id="send">Send</button>
            </div>
          </div>
          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            const messages = document.getElementById('messages');
            const prompt = document.getElementById('prompt');
            const send = document.getElementById('send');

            send.addEventListener('click', () => {
              const text = prompt.value.trim();
              if (!text) return;
              addMsg('user', text);
              vscode.postMessage({ type: 'user', text });
              prompt.value = '';
            });

            prompt.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') send.click();
            });

            window.addEventListener('message', (event) => {
              const msg = event.data;
              if (msg?.type === 'assistant') {
                // Remove any previous loading indicator
                removeLoading();
                addMsg('assistant', msg.text);
              }
            });

            function addMsg(kind, text) {
              // Create row for avatar + bubble
              const row = document.createElement('div');
              row.className = 'msg-row ' + kind;
              // Avatar
              const avatar = document.createElement('div');
              avatar.className = 'avatar';
              if (kind === 'user') {
                avatar.textContent = '🧑';
                avatar.title = 'You';
              } else {
                avatar.textContent = '🤖';
                avatar.title = 'Mira';
              }
              // Bubble
              const el = document.createElement('div');
              el.className = 'msg ' + kind;
              el.textContent = text;
              // Compose
              if (kind === 'user') {
                row.appendChild(avatar);
                row.appendChild(el);
              } else {
                row.appendChild(avatar);
                row.appendChild(el);
              }
              messages.appendChild(row);
              messages.scrollTop = messages.scrollHeight;
            }

            function removeLoading() {
              // Remove any assistant message with just "..."
              const nodes = messages.querySelectorAll('.msg.assistant');
              for (let i = nodes.length - 1; i >= 0; --i) {
                if (nodes[i].textContent === '...') {
                  nodes[i].remove();
                  break;
                }
              }
            }
          </script>
        </body>
      </html>
    `;
  }
}
