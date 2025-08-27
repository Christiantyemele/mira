import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg?.type === 'user') {
        vscode.window.showInformationMessage(`User said: ${msg.text}`);
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

            window.addEventListener('message', (event) => {
              const msg = event.data;
              if (msg?.type === 'assistant') {
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
          </script>
        </body>
      </html>
    `;
  }
}
