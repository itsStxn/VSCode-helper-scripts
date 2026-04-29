import { join, dirname, fileURLToPath } from './imports.js';

export const LOG_DELAY			= 1000;
export const TITLE_MIN_LEN		= 3;
export const TITLE_MAX_LEN		= 100;
export const CODE_PREVIEW_LEN = 255;

export const INQUIRER_CLEAR_FIRST = true;

export const CURR_DIR = dirname(fileURLToPath(import.meta.url));
export const BASE_DIR = join(process.env.HOME || process.env.USERPROFILE, 'Dev/coding_problems');

export const LANG_CONFIG = {
	'C#': {
		script:   'createCsharpFolder.sh',
		solution: 'Solution.cs',
		template: 'codingProblemCsharp.txt',
	},
	'Python': {
		script:   'createPythonFolder.sh',
		solution: 'solution.py',
		template: 'codingProblemPython.txt',
	},
	'Typescript': {
		script:   'createTypescriptFolder.sh',
		solution: 'solution.ts',
		template: 'codingProblemTypescript.txt',
	},
};

export const STATUS = {
	codeChanged:  'Code rejected: clipboard has changed.',
	codeIsTitle:  'Code rejected: no valid code detected in clipboard.',
	codeEmpty:    'Code rejected: clipboard is empty.',
	codeAccepted: 'Code accepted.',
};

export const TITLE_PATTERNS = [
	/^[A-Za-z0-9 \-,'\.!?()\/:]+$/,
	/^[^\n\r\t]+$/,
	/^[A-Za-z0-9]/,
];
