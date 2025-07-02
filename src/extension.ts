// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


function getWebviewContent(): string {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>VoxCube</title>
	  <style>
        input { width: 60px; margin-right: 4px; }
        label { margin-right: 10px; }
        body { font-family: sans-serif; padding: 16px; }
      </style>
    </head>
    <body>
      <h2>VoxCube Viewer</h2>
      <button id="selectRaw">📂 Загрузить .raw файл</button>
      <p id="filePath"></p>

	    <div>
        <label>Размеры:</label>
        X <input id="dimX" type="number" value="256">
        Y <input id="dimY" type="number" value="256">
        Z <input id="dimZ" type="number" value="256">
      </div>

      <div>
        <label>Тип данных:</label>
        <select id="dtype">
          <option value="uint8">uint8 (1 байт)</option>
          <option value="int16">int16 (2 байта)</option>
          <option value="float32">float32 (4 байта)</option>
        </select>
      </div>

      <button id="checkSize">✅ Проверить размер</button>
      <p id="checkResult"></p>

      <script>
        const vscode = acquireVsCodeApi();
        let filePath = null;

        function checkSize() {
          const dimX = parseInt(document.getElementById("dimX").value);
          const dimY = parseInt(document.getElementById("dimY").value);
          const dimZ = parseInt(document.getElementById("dimZ").value);
          const dtype = document.getElementById("dtype").value;

          if (!filePath) {
            document.getElementById("checkResult").textContent = "Сначала выберите файл.";
            return;
          }

          vscode.postMessage({
            command: "checkRawSize",
            path: filePath,
            dims: [dimX, dimY, dimZ],
            dtype: dtype
          });
        }

        document.getElementById("selectRaw").addEventListener("click", () => {
          vscode.postMessage({ command: "selectRawFile" });
        });
        document.getElementById("checkSize").addEventListener("click", () => {
          checkSize();
        });
        document.getElementById("dimX").addEventListener("input", checkSize);
        document.getElementById("dimY").addEventListener("input", checkSize);
        document.getElementById("dimZ").addEventListener("input", checkSize);
        document.getElementById("dtype").addEventListener("change", checkSize);

        window.addEventListener("message", (event) => {
          const message = event.data;

          if (message.command === "selectedFile") {
            filePath = message.path;
            document.getElementById("filePath").textContent = "Выбран файл: " + message.path;
            checkSize(); // запускаем проверку сразу
          }

          if (message.command === "checkResult") {
            document.getElementById("checkResult").textContent = message.result;
          }
        });
      </script>
    </body>
    </html>
  `;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed



export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "voxcube-viewer" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('voxcube-viewer.showWelcome', () => {
    const panel = vscode.window.createWebviewPanel(
      'voxcubeWelcome',
      'VoxCube Viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );

    panel.webview.html = getWebviewContent();

    // Обработка сообщений от WebView
    panel.webview.onDidReceiveMessage(
      async message => {
        if (message.command === 'selectRawFile') {
          const uri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Выбрать .raw файл',
            filters: {
              'Raw files': ['raw'],
              'All files': ['*']
            }
          });

          if (uri && uri.length > 0) {
            panel.webview.postMessage({
              command: 'selectedFile',
              path: uri[0].fsPath
            });
          }
        } else if (message.command === 'checkRawSize') {
          const fs = require('fs');
          const { path, dims, dtype } = message;
          const [x, y, z] = dims.map(Number);

          let bytesPerVoxel = 1;
          if (dtype === 'int16') bytesPerVoxel = 2;
          else if (dtype === 'float32') bytesPerVoxel = 4;

          const expectedSize = x * y * z * bytesPerVoxel;

          try {
            const stat = fs.statSync(path);
            const actualSize = stat.size;

            const ok = actualSize === expectedSize;
            panel.webview.postMessage({
            command: 'checkResult',
            result: ok
              ? `✅ Размер совпадает (${actualSize} байт)`
              : `❌ Несовпадение. Ожидалось ${expectedSize} байт, а в файле ${actualSize}`
            });
          } catch (e: unknown) {
            const err = e as Error;
            panel.webview.postMessage({
            command: 'checkResult',
            result: `⚠️ Ошибка чтения файла: ${err.message}`
            });
          }
        }
      },
      undefined,
      context.subscriptions
    );
  });

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
