import * as vscode from "vscode";
import fetch from "node-fetch";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "visualmate.generate",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const doc = editor.document;
      const selection = editor.selection;
      const line = doc.lineAt(selection.start.line);
      const promptText = line.text.trim();

      if (!promptText.startsWith("// vm:") && !promptText.startsWith("# vm:")) {
        vscode.window.showInformationMessage(
          'Use "// vm: your prompt" to generate code'
        );
        return;
      }

      const prompt =
        promptText.replace(/\/\/\s*vm:|#\s*vm:/, "").trim() +
        ". Respond with only the complete code block as if it were written in a code editor. Do not include any explanations outside the code block. If additional information is necessary, include it as comments inside the code. No markdown formatting or extra prose — just clean, ready-to-use code.";

      const generatedCode = await callGroq(prompt);

      editor.edit((editBuilder) => {
        editBuilder.insert(line.range.end.translate(1), `\n${generatedCode}`);
      });
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192", // or "mixtral-8x7b-32768"
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  console.log("Groq Response:", JSON.stringify(data, null, 2));

  if (data.error) {
    return `[Groq Error] ${data.error.message}`;
  }

  return (
    data.choices?.[0]?.message?.content?.trim() ?? "[No response from Groq]"
  );
}
