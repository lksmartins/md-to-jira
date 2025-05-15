import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown to Jira extension is now active!');

    let disposable = vscode.commands.registerCommand('markdownToJira.convert', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const markdownContent = editor.document.getText();
        const jiraContent = convertMarkdownToJira(markdownContent);

        // Open a preview window with the converted content
        const panel = vscode.window.createWebviewPanel(
            'jiraPreview',
            'Markdown to Jira Preview',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
            }
        );

        // HTML content for the WebView
        panel.webview.html = getWebviewContent(jiraContent);

        // Listen for messages from the WebView
        panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'copy') {
                    try {
                        await vscode.env.clipboard.writeText(message.text);
                        vscode.window.showInformationMessage('Copied to clipboard!');
                    } catch (err: any) {
                        vscode.window.showErrorMessage(`Failed to copy: ${err.message}`);
                    }
                }
            },
            undefined,
            context.subscriptions
        );        
    });

    context.subscriptions.push(disposable);
}

function convertMarkdownToJira(markdown: string): string {
    return markdown
        .replace(/^#{1} (.*)$/gm, 'h1. $1')
        .replace(/^#{2} (.*)$/gm, 'h2. $1')
        .replace(/^#{3} (.*)$/gm, 'h3. $1')
        .replace(/^#{4} (.*)$/gm, 'h4. $1')
        .replace(/^#{5} (.*)$/gm, 'h5. $1')
        .replace(/^#{6} (.*)$/gm, 'h6. $1')
        .replace(/\<(.*?)\>/g, '[$1|$1]')         // link
        .replace(/```(\w*)\n([\s\S]*?)\n```/g, '{code:$1}\n$2\n{code}')
        .replace(/\*\*(.*?)\*\*/g, '*$1*')         // bold
        .replace(/\*(.*?)\*/g, '_$1_')             // italics
        .replace(/\[(.*?)\]\((.*?)\)/g, '[$1|$2]') // links
        .replace(/\`(.*?)\`/g, '{{$1}}')           // inline code
        .replace(/^\|[-\s|]+\|\r?\n/gm, '')         // table separator line
}

function getWebviewContent(jiraContent: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Markdown to Jira Preview</title>
            <style>
                body { 
                    font-family: sans-serif; 
                    padding: 20px; 
                    background-color: var(--vscode-editor-background, #1e1e1e); 
                    color: var(--vscode-editor-foreground, #d4d4d4);
                }
                textarea { 
                    width: 100%; 
                    height: 70dvh; 
                    background-color: var(--vscode-editor-background, #1e1e1e); 
                    color: var(--vscode-editor-foreground, #d4d4d4); 
                    border: 1px solid var(--vscode-editorGroup-border, #3c3c3c); 
                    padding: 10px; 
                    border-radius: 5px; 
                    font-family: monospace;
                    resize: vertical;
                }
                button { 
                    margin: 10px 0; 
                    padding: 5px 10px; 
                    background-color: var(--vscode-button-background, #007acc); 
                    color: var(--vscode-button-foreground, #ffffff); 
                    border: none; 
                    border-radius: 3px; 
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground, #005a9e);
                }
            </style>
        </head>
        <body>
            <h2>Converted Markdown to Jira Format</h2>
            <button onclick="copyToClipboard()">Copy to Clipboard</button>
            <textarea id="jiraContent">${jiraContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>

            <script>
                const vscode = acquireVsCodeApi();

                function copyToClipboard() {
                    const text = document.getElementById('jiraContent').value;
                    vscode.postMessage({ command: 'copy', text });
                }
            </script>
        </body>
        </html>
    `;
}

export function deactivate() {}
