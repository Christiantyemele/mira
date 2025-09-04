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
            body { font-family: var(--vscode-font-family); padding: 0; margin: 0; }
            #container { display: flex; flex-direction: column; height: 100vh; }
            #messages { flex: 1; overflow: auto; padding: 8px; }
            .msg { margin: 6px 0; padding: 6px 8px; border-radius: 6px; }
            .user { background: var(--vscode-editor-inactiveSelectionBackground); }
            .assistant { background: var(--vscode-editor-selectionBackground); }
            #inputRow { display: flex; gap: 6px; padding: 8px; border-top: 1px solid var(--vscode-editorWidget-border); }
            input { flex: 1; }
          </style>
        </head>
        <body>
          <div id="container">
            <div id="messages"></div>
            <div id="inputRow">
              <input id="prompt" type="text" placeholder="Ask Mira..." />
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
              const el = document.createElement('div');
              el.className = 'msg ' + kind;
              el.textContent = text;
              messages.appendChild(el);
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
