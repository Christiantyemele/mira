import * as vscode from 'vscode';

export class TerminalViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    const webview = webviewView.webview;
    webview.options = { enableScripts: true };
    webview.html = this.getHtml(webview);

    webview.onDidReceiveMessage((msg) => {
      if (msg?.type === 'stdin') {
        this.appendLine(`$ ${msg.data}`);
      }
    });
  }

  show() {
    // noop; VS Code will reveal the view when focused
  }

  newSession() {
    this.post({ type: 'session', action: 'created', id: `${Date.now()}` });
    this.appendLine('[Session created]');
  }

  killSession() {
    this.post({ type: 'session', action: 'killed' });
    this.appendLine('[Session killed]');
  }

  reattachSession() {
    this.post({ type: 'session', action: 'reattached' });
    this.appendLine('[Session reattached]');
  }

  appendLine(text: string) {
    this.post({ type: 'log', text });
  }

  private post(payload: unknown) {
    this._view?.webview.postMessage(payload);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = String(Date.now());
    return /* html */ `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
          <style>
            body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin:0; }
            #container { display:flex; flex-direction:column; height:100vh; }
            #log { flex:1; overflow:auto; padding:8px; background: #1e1e1e; color: #d4d4d4; }
            #stdinRow { display:flex; gap:6px; padding:8px; border-top:1px solid #333; }
            input { flex:1; }
            .line { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
          </style>
        </head>
        <body>
          <div id="container">
            <div id="log"></div>
            <div id="stdinRow">
              <input id="stdin" type="text" placeholder="Type to send to stdin..." />
              <button id="send">Send</button>
            </div>
          </div>
          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            const log = document.getElementById('log');
            const input = document.getElementById('stdin');
            const send = document.getElementById('send');
            send.addEventListener('click', () => {
              const data = input.value; if (!data) return; input.value='';
              vscode.postMessage({ type: 'stdin', data });
            });
            window.addEventListener('message', (event) => {
              const m = event.data;
              if (m?.type === 'log') addLine(m.text);
              if (m?.type === 'session') addLine('[Session ' + m.action + ']');
            });
            function addLine(t){ const el = document.createElement('div'); el.className='line'; el.textContent=t; log.appendChild(el); log.scrollTop=log.scrollHeight; }
          </script>
        </body>
      </html>
    `;
  }
}
