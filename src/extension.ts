// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { writeFileSync } from 'fs';
import path = require('path');
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "sharp-splitter" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let splitFileCommand = vscode.commands.registerCommand('sharp-splitter.split-file', () => {
		vscode.window.showInformationMessage('Splitting the file');
		let code = vscode.window.activeTextEditor?.document?.getText();
		if (code) { split(code); }
	});

	let splitSelectionCommand = vscode.commands.registerCommand('sharp-splitter.split-selection', () => {
		vscode.window.showInformationMessage('Splitting the selection');
		let editor = vscode.window.activeTextEditor;
		let selection = editor?.document.getText(editor?.selection);
		if (selection) { split(selection); }
	});

	context.subscriptions.push(splitFileCommand);
	context.subscriptions.push(splitSelectionCommand);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function split(code: string) {

	let document = vscode.window.activeTextEditor?.document;
	let filePath = document?.fileName;
	let folderPath = filePath?.substring(0, filePath.lastIndexOf("/") + 1); // TODO: Test on windows

	if (code) {
		let namespace = namespaceRe.exec(code)?.at(1);
		let entities = findAllEntities(code);
		let usings = getAllUsings(code);

		entities.forEach(entity => {
			let newFilePath = path.join(folderPath!, entity.name + '.cs');
			let fullCode = buildFullCode(namespace!, usings, entity.codeBlock.code);

			writeFileSync(newFilePath, fullCode);
			// vscode.window.activeTextEditor?.edit((eb) => {
			// console.log(entity.codeBlock);
			// let range = new vscode.Range(entity.codeBlock.start, entity.codeBlock.end);
			// eb.delete(range);
			// });
		});
	}

}

const entityRe = /public\s*(interface|struct|class)\s*(\S*)/g;
const namespaceRe = /namespace\s(\S*)/;
const usingRe = /using\s(\S*)/g;

function findAllEntities(code: string): any[] {
	let m;
	let entities = [];
	do {
		m = entityRe.exec(code);

		if (m) {
			entities.push(m);
		}
	} while (m);

	return entities.map(match => {

		let startIndex = match.index;
		let name = match[2];
		let codeBlock = selectCodeBlock(code, startIndex);

		return { name, codeBlock };
	});
}

function getAllUsings(code: string): any[] {
	let m;
	let entities = [];
	do {
		m = usingRe.exec(code);

		if (m) {
			entities.push(m[1]);
		}
	} while (m);

	return entities;
}

function selectCodeBlock(code: string, startingIndex: number) {

	let depth = 0;
	let braceEncountered = false;

	for (let index = startingIndex; index < code.length; index++) {
		const element = code[index];

		if (element === '{') { braceEncountered = true; }
		if (element === '{') { depth++; }
		if (element === '}') { depth--; }

		if (depth === 0 && braceEncountered) {
			return { code: code.substring(startingIndex, index + 1), start: startingIndex, end: index + 1 };
		}
	}

	return '';
}

function buildFullCode(namespace: string, usings: string[], code: string): string {
	let fullCode = '';

	usings.forEach(using => fullCode += `using ${using}\n`);
	fullCode += '\n';

	fullCode += `namespace ${namespace}`;
	fullCode += `\n{\n${code}\n}`;

	return reformatCode(fullCode);
}

function reformatCode(code: string): string {
	let lines = code.split('\n');
	let formattedCode = '';
	let depth = 0;

	lines.forEach(line => {
		line = line.trimStart();

		if (line.indexOf('}') === 0) { depth--; }
		let lineDepth = depth;
		if (line.indexOf('{') === 0) { depth++; }


		line = padWithTabs(line, lineDepth);
		formattedCode += line + '\n';
	});

	return formattedCode;
}

function padWithTabs(line: string, tabsCount: number): string {
	for (let i = 0; i < tabsCount; i++) {
		line = `\t${line}`;
	}
	return line;
}