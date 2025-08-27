import * as vscode from 'vscode';

export interface PlannerTask {
  id: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  assignee_role: string;
}

export class PlannerViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private tasks: PlannerTask[] = [];

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    const webview = webviewView.webview;
    webview.options = { enableScripts: true };
    webview.html = this.getHtml(webview);

    webview.onDidReceiveMessage((msg) => {
      if (msg?.type === 'toggle') {
        this.toggleTask(msg.id);
      }
      if (msg?.type === 'createPlan') {
        this.createPlanStub();
      }
    });

    this.refresh();
  }

  createPlanStub() {
    const id = Date.now().toString();
    this.tasks = [
      { id: id + '-1', description: 'Analyze request and propose plan', status: 'todo', assignee_role: 'Architect' },
      { id: id + '-2', description: 'Implement minimal changes', status: 'todo', assignee_role: 'Developer' },
      { id: id + '-3', description: 'Run tests in terminal', status: 'todo', assignee_role: 'Debugger' }
    ];
    this.refresh();
  }

  updateTask(id: string, patch: Partial<PlannerTask>) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx >= 0) {
      this.tasks[idx] = { ...this.tasks[idx], ...patch };
      this.refresh();
    }
  }

  private toggleTask(id: string) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    const next = t.status === 'todo' ? 'in_progress' : t.status === 'in_progress' ? 'done' : 'todo';
    this.updateTask(id, { status: next });
  }

  private refresh() {
    this._view?.webview.postMessage({ type: 'tasks', tasks: this.tasks });
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
            #toolbar { padding:8px; border-bottom: 1px solid #333; }
            #list { padding:8px; }
            .task { display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid #333; }
            .status { width: 10px; height: 10px; border-radius: 50%; }
            .s-todo { background:#999; }
            .s-in_progress { background:#f6c343; }
            .s-done { background:#2ea043; }
            .s-blocked { background:#d73a49; }
            .desc { flex:1; }
            .role { opacity:0.8; }
            button { font-size: 12px; }
          </style>
        </head>
        <body>
          <div id="container">
            <div id="toolbar"><button id="create">Create Plan</button></div>
            <div id="list"></div>
          </div>
          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            const list = document.getElementById('list');
            document.getElementById('create').addEventListener('click', () => vscode.postMessage({ type: 'createPlan' }));
            window.addEventListener('message', (event) => {
              const m = event.data;
              if (m?.type === 'tasks') render(m.tasks);
            });
            function render(tasks){
              list.innerHTML='';
              for (const t of tasks){
                const row = document.createElement('div'); row.className='task';
                const dot = document.createElement('div'); dot.className='status s-' + t.status;
                const desc = document.createElement('div'); desc.className='desc'; desc.textContent = t.description;
                const role = document.createElement('div'); role.className='role'; role.textContent = t.assignee_role;
                const btn = document.createElement('button'); btn.textContent='Toggle'; btn.addEventListener('click',()=>vscode.postMessage({ type:'toggle', id: t.id }));
                row.appendChild(dot); row.appendChild(desc); row.appendChild(role); row.appendChild(btn); list.appendChild(row);
              }
            }
          </script>
        </body>
      </html>
    `;
  }
}
