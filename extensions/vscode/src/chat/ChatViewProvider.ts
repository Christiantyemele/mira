import * as vscode from 'vscode';

// Import types only to avoid runtime path issues; implement dynamic requires at runtime
import type { OrchestratorContext } from '../../../../services/orchestrator/LLMOrchestrator';
import * as path from 'path';

// Singleton orchestrator for the extension session
let orchestrator: any | undefined;

/**
 * Loads the orchestrator and its dependencies using robust path resolution.
 * Uses context.asAbsolutePath to resolve paths from the extension root.
 * Provides clear error handling and user feedback if modules are missing.
 */
function getOrchestrator(context: vscode.ExtensionContext, postError?: (msg: string) => void): any {
  if (!orchestrator) {
    try {
      // Use context.asAbsolutePath to resolve from extension root
      const LLMPath = context.asAbsolutePath('out/services/orchestrator/LLMOrchestrator.js');
      const LiteLLMClientPath = context.asAbsolutePath('out/services/llm/LiteLLMClient.js');
      const MemoryStorePath = context.asAbsolutePath('out/storage/memory/MemoryStore.js');

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const LLM = require(LLMPath);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LiteLLMClient } = require(LiteLLMClientPath);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MemoryStore } = require(MemoryStorePath);

      const memory = new MemoryStore();
      const client = new LiteLLMClient({ mode: 'mock', embedDim: 16 });
      orchestrator = new LLM.default(client, memory);
    } catch (err: any) {
      const msg =
        'Mira failed to load required modules. ' +
        'Please ensure the extension is built correctly. ' +
        'Error: ' + (err?.message || String(err));
      if (postError) postError(msg);
      // Also log to VS Code output for diagnostics
      console.error('[Mira Chat] Module load error:', err);
      orchestrator = undefined;
    }
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
        // Start streaming the assistant's response
        try {
          const orchestrator = getOrchestrator(
            this.context,
            (errMsg) => this._view?.webview.postMessage({ type: 'assistant', text: errMsg })
          );
          if (!orchestrator) {
            this._view?.webview.postMessage({ type: 'assistant-done' });
            return;
          }
          const context: OrchestratorContext = { sessionId: this.sessionId };
          let hadChunk = false;
          let errorOccurred = false;
          // Remove any previous loading indicator
          this._view?.webview.postMessage({ type: 'assistant-stream-start' });
          for await (const chunk of orchestrator.orchestrateChatStream(userText, context)) {
            hadChunk = true;
            this._view?.webview.postMessage({ type: 'assistant-stream', text: chunk });
          }
          this._view?.webview.postMessage({ type: 'assistant-done' });
        } catch (err: any) {
          this._view?.webview.postMessage({ type: 'assistant-done' });
          this._view?.webview.postMessage({ type: 'assistant', text: 'Error: ' + (err?.message || String(err)) });
        }
      }
      if (msg?.type === 'greeting') {
        try {
          const orchestrator = getOrchestrator(
            this.context,
            (errMsg) => this._view?.webview.postMessage({ type: 'greeting', text: errMsg })
          );
          if (!orchestrator) {
            this._view?.webview.postMessage({ type: 'greeting-done' });
            return;
          }
          const context: OrchestratorContext = { sessionId: this.sessionId };
          let greeting = '';
          for await (const chunk of orchestrator.orchestrateChatStream('Say hello and introduce yourself as Mira, the AI assistant for VS Code.', context)) {
            greeting += chunk;
            this._view?.webview.postMessage({ type: 'greeting-stream', text: chunk });
          }
          this._view?.webview.postMessage({ type: 'greeting-done' });
        } catch (err: any) {
          this._view?.webview.postMessage({ type: 'greeting-done' });
          this._view?.webview.postMessage({ type: 'greeting', text: 'Hello! (AI error)' });
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
            html, body {
              height: 100%;
              width: 100%;
              padding: 0;
              margin: 0;
              font-family: var(--vscode-font-family);
              background: var(--vscode-sideBar-background, #1e1e1e);
            }
            #container {
              display: flex;
              flex-direction: column;
              height: 100%;
              width: 100%;
              min-height: 0;
              min-width: 0;
              background: linear-gradient(180deg, var(--vscode-sideBar-background, #1e1e1e) 60%, var(--vscode-editor-background, #23272e) 100%);
            }
            #messages {
              flex: 1 1 0%;
              min-height: 0;
              min-width: 0;
              overflow-y: auto;
              padding: 16px 12px 8px 12px;
              display: flex;
              flex-direction: column;
              gap: 10px;
              background: transparent;
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
              position: sticky;
              bottom: 0;
              z-index: 2;
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

            // Initial greeting (once per load)
            if (!messages.dataset.greeted) {
              vscode.postMessage({ type: 'greeting' });
              messages.dataset.greeted = '1';
            }

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
              if (msg?.type === 'assistant-stream-start') {
                removeLoading();
                startStreamingAssistantMsg();
              }
              if (msg?.type === 'assistant-stream') {
                appendStreamingAssistantMsg(msg.text);
              }
              if (msg?.type === 'assistant-done') {
                finalizeStreamingAssistantMsg();
              }
              if (msg?.type === 'greeting-stream') {
                appendStreamingGreetingMsg(msg.text);
              }
              if (msg?.type === 'greeting-done') {
                finalizeStreamingGreetingMsg();
              }
              if (msg?.type === 'greeting') {
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
              row.appendChild(avatar);
              row.appendChild(el);
              messages.appendChild(row);
              messages.scrollTop = messages.scrollHeight;
            }

            // Streaming assistant message helpers
            let streamingAssistantRow = null;
            let streamingAssistantBubble = null;
            function startStreamingAssistantMsg() {
              streamingAssistantRow = document.createElement('div');
              streamingAssistantRow.className = 'msg-row assistant';
              const avatar = document.createElement('div');
              avatar.className = 'avatar';
              avatar.textContent = '🤖';
              avatar.title = 'Mira';
              streamingAssistantBubble = document.createElement('div');
              streamingAssistantBubble.className = 'msg assistant';
              streamingAssistantBubble.textContent = '';
              streamingAssistantRow.appendChild(avatar);
              streamingAssistantRow.appendChild(streamingAssistantBubble);
              messages.appendChild(streamingAssistantRow);
              messages.scrollTop = messages.scrollHeight;
            }
            function appendStreamingAssistantMsg(chunk) {
              if (streamingAssistantBubble) {
                streamingAssistantBubble.textContent += chunk;
                messages.scrollTop = messages.scrollHeight;
              }
            }
            function finalizeStreamingAssistantMsg() {
              streamingAssistantRow = null;
              streamingAssistantBubble = null;
            }

            // Streaming greeting message helpers
            let streamingGreetingRow = null;
            let streamingGreetingBubble = null;
            function startStreamingGreetingMsg() {
              streamingGreetingRow = document.createElement('div');
              streamingGreetingRow.className = 'msg-row assistant';
              const avatar = document.createElement('div');
              avatar.className = 'avatar';
              avatar.textContent = '🤖';
              avatar.title = 'Mira';
              streamingGreetingBubble = document.createElement('div');
              streamingGreetingBubble.className = 'msg assistant';
              streamingGreetingBubble.textContent = '';
              streamingGreetingRow.appendChild(avatar);
              streamingGreetingRow.appendChild(streamingGreetingBubble);
              messages.appendChild(streamingGreetingRow);
              messages.scrollTop = messages.scrollHeight;
            }
            function appendStreamingGreetingMsg(chunk) {
              if (!streamingGreetingBubble) {
                startStreamingGreetingMsg();
              }
              streamingGreetingBubble.textContent += chunk;
              messages.scrollTop = messages.scrollHeight;
            }
            function finalizeStreamingGreetingMsg() {
              streamingGreetingRow = null;
              streamingGreetingBubble = null;
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
