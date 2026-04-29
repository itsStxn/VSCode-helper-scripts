import { dirname, fileURLToPath, join } from "./imports.js";

export const LOG_DELAY = 1000;
export const CODE_PREVIEW_LEN = 255;

export const INQUIRER_CLEAR_FIRST = true;

export const CURR_DIR = dirname(fileURLToPath(import.meta.url));
export const BASE_DIR = getBase();

export const LANG_CONFIG = {
	'C#': {
		solution: 'Solution.cs',
		template: 'codingProblemCsharp.txt',
		classExt: '.cs',
	},
	'Python': {
		solution: 'solution.py',
		template: 'codingProblemPython.txt',
		classExt: '.py',
	},
	'Typescript': {
		solution: 'solution.ts',
		template: 'codingProblemTypescript.txt',
		classExt: '.ts',
	},
};

export const STATUS = {
	codeChanged:  'Code rejected: clipboard has changed.',
	unvalid:		  'Code rejected: no valid code detected in clipboard.',
	codeEmpty:    'Code rejected: clipboard is empty.',
	codeAccepted: 'Code accepted.',
};

export const TITLE_PATTERNS = [
	/^[A-Za-z0-9 \-,'\.!?()\/:]+$/,
	/^[^\n\r\t]+$/,
	/^[A-Za-z0-9]/,
];

// * ─── Args ─────────────────────────────────────────────────────────────────

function hasCurrentBaseFlag() {
	return process.argv.includes('--currentBase');
}

function getBase() {
	return hasCurrentBaseFlag()
	? process.cwd().toString()
	: join(process.env.HOME || process.env.USERPROFILE, 'Dev/coding_problems');
}
