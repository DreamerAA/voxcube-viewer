// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
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

    const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'index.html');
    const html = fs.readFileSync(htmlPath.fsPath, 'utf8');

    const viewerJsUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'viewer.js')
    );

    const htmlFinal = html.replace('./viewer.js', viewerJsUri.toString());
    panel.webview.html = htmlFinal;

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
        } else if (message.command === 'loadRawData') {
          
          const fs = require('fs');
          const path = message.path;
          const dims = message.dims.map(Number); // [x, y, z]

          console.log('[VoxCube] Загружаю .raw:', path, 'Размеры:', dims);

          try {
            const buffer = fs.readFileSync(path);
            const base64 = buffer.toString('base64');

            panel.webview.postMessage({
              command: 'rawDataLoaded',
              base64: base64,
              dims: dims,
            });
          } catch (e: unknown) {
            const err = e as Error;
            panel.webview.postMessage({
              command: 'checkResult',
              result: `❌ Ошибка чтения файла: ${err.message}`
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
