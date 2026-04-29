import { dirname, fileURLToPath, join } from "./imports.js";

export const MODEL = 'gpt-oss:120b-cloud';

export const CURR_DIR 				= dirname(fileURLToPath(import.meta.url));
export const BASE_DIR 				= process.cwd().toString();
export const SLUG_CACHE_PATH     = join(CURR_DIR, 'slug_cache.json');
export const PROBLEMS_CACHE_PATH = join(CURR_DIR, 'problems_cache.json');
export const INSTRUCTIONS_PATH   = join(CURR_DIR, 'md', 'instructions.md');
export const TEMPLATES_PATH      = join(CURR_DIR, 'md', 'templates.md');
export const LEETCODE_URL    		= 'https://leetcode.com';
export const LEETCODE_GRAPHQL    = 'https://leetcode.com/graphql';
export const OLLAMA_API          = 'http://localhost:11434/api/generate';

export const LOG_DELAY 				 	  = 500;
export const INQUIRER_CLEAR_FIRST 	  = false;
export const PROBLEM_DESC_PREVIEW_LEN = 255;
export const PROBLEM_DESC_SEP 	 	  = '## Strategy';

export const LANG_CONFIG = {
	'C#': {
		classExt: '.cs',
	},
	'Python': {
		classExt: '.py',
	},
	'Typescript': {
		classExt: '.ts',
	},
};

export const STATUS = {
	descChanged:  'Problem description rejected: clipboard has changed.',
	descIsTitle:  'Problem description rejected: no valid description detected in clipboard.',
	descEmpty:    'Problem description rejected: clipboard is empty.',
	descAccepted: 'Problem description accepted.',
};

export const PROBLEM_DESC_PATTERNS = [
	/[\s\S]+Example 1:[\s\S]+(Example \d:[\s\S]+)*Constraints:[\s\S]+/gm,
	/Input:[\s\S]+Output:[\s\S]+(Explanation:[\s\S]+)*/gm,
];
