import {
	dirname,
	execSync,
	existsSync,
	inquirer,
	join,
	readdirSync,
	readFileSync,
	readline,
	spawn,
	statSync,
	writeFileSync,
} from './imports.mjs';
import * as $ from './constants.mjs';

// * ─── Process ──────────────────────────────────────────────────────────────────

/**
 * Creates an object with methods to exit the process with a success or failure status.
 * @param {string} msg - The message to log before exiting
 * @returns {Object} An object containing exit methods
 * @returns {Function} returns.ok - Logs the message and exits with status code 0
 * @returns {Function} returns.bad - Logs the message and exits with status code 1
 */
export function exit(msg) {
	return {
		ok:  () => log(msg).then(() => process.exit(0)),
		bad: () => log(msg).then(() => process.exit(1)),
	};
}

// * ─── Terminal ─────────────────────────────────────────────────────────────────

/**
 * Returns a Promise that resolves after the given number of milliseconds.
 * @param {number} ms - Duration to wait in milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs a prefixed message to stdout, then pauses for LOG_DELAY milliseconds.
 * @param {string} msg - The message to log
 * @returns {Promise<void>}
 */
export async function log(msg) {
	console.log(`>> ${msg}`);
	await sleep($.LOG_DELAY);
}

/**
 * Logs a prefixed warning to stderr, then pauses for LOG_DELAY milliseconds.
 * @param {string} msg - The warning message to log
 * @returns {Promise<void>}
 */
async function warn(msg) {
	console.warn(`>> ${msg}`);
	await sleep($.LOG_DELAY);
}

/**
 * Clears the terminal by moving the cursor to the top-left and erasing everything below.
 * @returns {void}
 */
export function clear() {
	readline.cursorTo(process.stdout, 0, 0);
	readline.clearScreenDown(process.stdout);
}

/**
 * Optionally clears the terminal, then returns the inquirer instance for chaining prompts.
 * @returns {typeof inquirer}
 */
export function ask() {
	if ($.INQUIRER_CLEAR_FIRST) clear();
	return inquirer;
}

// * ─── Clipboard ────────────────────────────────────────────────────────────────

/**
 * Reads and returns the current clipboard content using wl-paste.
 * Returns an empty string if the clipboard is empty.
 * @returns {string} The trimmed clipboard text
 * @throws {Error} If wl-paste fails for a reason other than an empty clipboard
 */
function getClipboard() {
	try {
		return execSync('wl-paste').toString().trim();
	} catch (err) {
		if (err.message.includes('Nothing is copied')) return '';
		throw new Error(`Unexpected clipboard error: ${err.message}`);
	}
}

/**
 * Clears the clipboard using wl-copy and logs confirmation.
 * @returns {Promise<void>}
 */
export async function emptyClipboard() {
	execSync('wl-copy', { stdio: 'ignore' });
	await log('Cleared clipboard.');
}

// * ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Returns true if the given text matches all title patterns, meaning it is
 * likely a title rather than code.
 * @param {string} text - The text to evaluate
 * @returns {boolean}
 */
function isNotCode(text) {
	const lengthPattern = new RegExp(`^.{0,${Number.MAX_SAFE_INTEGER}}$`);
	return [...$.TITLE_PATTERNS, lengthPattern].every((pattern) => pattern.test(text));
}

// * ─── Code Extraction ──────────────────────────────────────────────────────────

/**
 * Interactively prompts the user to confirm clipboard content as valid code.
 * Loops until the content passes all validation checks, then clears the clipboard and returns the code.
 * @param {number} previewLength - Maximum number of characters to show in the confirmation prompt
 * @returns {Promise<string>} The validated code string
 */
async function extractCode(previewLength) {
	const truncate = (text) =>
		text.length > previewLength ? `${text.slice(0, previewLength)}...` : text;

	while (true) {
		const text = getClipboard();
		const { ok } = await ask().prompt([
			{
			type: 'confirm',
			name: 'ok',
			message: `(Press Enter to confirm) Code in the clipboard:\n${truncate(text)}`,
			default: true,
			},
		]);

		if (!ok) continue;

		if (text !== getClipboard()) { await log($.STATUS.codeChanged);  continue; }
		if (text.length === 0)       { await log($.STATUS.codeEmpty);    continue; }
		if (isNotCode(text))         { await log($.STATUS.unvalid);      continue; }

		await log($.STATUS.codeAccepted);
		await emptyClipboard();
		clear();
		return text;
	}
}

/**
 * Prepends the language's template file (if it exists) to the given code string.
 * @param {string} language - The language key from LANG_CONFIG
 * @param {string} code - The code to append after the template
 * @returns {string} The combined template and code content
 */
function getTemplatePrepended(language, code) {
	const templatePath = join($.CURR_DIR, 'templates', $.LANG_CONFIG[language].template);
	const template = existsSync(templatePath) ? readFileSync(templatePath, 'utf8') : '';
	return template + code + '\n';
}

// * ─── Class Files ──────────────────────────────────────────────────────────────

/**
 * Prompts the user to confirm clipboard code, prepends the language template, and writes the result to disk.
 * @param {string} classPath - Absolute path to the class file to create or overwrite
 * @param {string} language - The language key from LANG_CONFIG
 * @returns {Promise<void>}
 */
export async function createClassFile(classPath, language) {
	const code = await extractCode($.CODE_PREVIEW_LEN);
	const content = getTemplatePrepended(language, code);
	writeFileSync(classPath, content, 'utf8');
}

/**
 * Prompts the user to optionally open the class file in VS Code
 * and/or open its parent directory in a new terminal window.
 * @param {string} classPath - Absolute path to the class file
 * @returns {Promise<void>}
 */
export async function inspectClassFile(classPath) {
	if (await promptBinary('Open class file:')) {
		execSync(`code "${classPath}"`);
	}

	if (await promptBinary(`Open class' directory:`, true)) {
		spawn('gnome-terminal', ['--', 'bash', '-c', `cd "${dirname(classPath)}"; exec bash`], {
			detached: true,
		});
	}
}

// * ─── File System ──────────────────────────────────────────────────────────────

/**
 * Returns all non-hidden subdirectories within the given path.
 * Exits the process with a failure code if none are found.
 * @param {string} dirPath - The directory to scan
 * @returns {string[]} List of subdirectory names
 */
function getDirs(dirPath) {
	const dirs = readdirSync(dirPath).filter(
		(entry) => !entry.startsWith('.') && statSync(join(dirPath, entry)).isDirectory()
	);

	if (dirs.length === 0) exit(`❌ No directories found in: ${dirPath}`).bad();

	return dirs;
}

/**
 * Filters a list of language folder names to only those recognised by LANG_CONFIG.
 * Warns about unrecognised entries and exits if none are valid.
 * @param {string[]} existingLangs - Language folder names to filter
 * @returns {string[]} The subset of languages present in LANG_CONFIG
 */
function getKnownLangs(existingLangs) {
	const unknown = existingLangs.filter((l) => !(l in $.LANG_CONFIG));
	if (unknown.length > 0) {
		warn(`⚠️ Skipping unrecognized language folders: ${unknown.join(', ')}`);
	}

	const known = existingLangs.filter((l) => l in $.LANG_CONFIG);
	if (known.length === 0) {
		exit(`❌ None of the existing language folders are supported by LANG_CONFIG: ${existingLangs.join(', ')}`).bad();
	}

	return known;
}

/**
 * Runs the addProblemReadme shell script in the given problem directory.
 * @param {string} problemDir - Absolute path to the problem directory
 * @returns {Promise<void>}
 * @throws {Error} If the script exits with a non-zero code
 */
export function addProblemReadme(problemDir) {
	return new Promise((resolve, reject) => {
		const scriptPath = join($.CURR_DIR, 'commands', 'addProblemReadme.sh');
		const child = spawn('bash', [scriptPath], { cwd: problemDir, stdio: 'inherit' });

		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`addProblemReadme() exited with code ${code}`));
		});
	});
}

// * ─── Prompts ──────────────────────────────────────────────────────────────────

/**
 * Presents a Yes/No list prompt and returns true if the user selects "Yes".
 * @param {string} message - The prompt message
 * @param {boolean} [inverted=false] - If true, shows "No" before "Yes"
 * @returns {Promise<boolean>}
 */
async function promptBinary(message, inverted = false) {
	const { choice } = await ask().prompt([
		{
			type: 'list',
			name: 'choice',
			message,
			choices: inverted ? ['No', 'Yes'] : ['Yes', 'No'],
		},
	]);
	return choice === 'Yes';
}

/**
 * Presents a list prompt of subdirectories within the given base path and returns the selected one.
 * @param {string} base - The directory to list subdirectories from
 * @param {string} message - The prompt label shown to the user
 * @param {((dirs: string[]) => string[]) | null} [filter=null] - Optional function to filter the directory list
 * @returns {Promise<string>} The selected directory name
 */
async function selectDir(base, message, filter = null) {
	const dirs = filter?.(getDirs(base)) ?? getDirs(base);
	const { dir } = await ask().prompt([
		{
			type: 'list',
			name: 'dir',
			message: `${message}:`,
			choices: dirs,
		},
	]);
	return dir;
}

/**
 * Prompts the user to enter a class file name and returns it with the correct extension appended.
 * @param {string} language - The language key from LANG_CONFIG
 * @returns {Promise<string>} The class filename including extension
 */
async function promptClassName(language) {
	const { className } = await ask().prompt([
		{
			type: 'input',
			name: 'className',
			message: 'Class file name (without extension):',
			validate: (input) => input.trim() !== '' || 'Class name cannot be empty.',
		},
	]);
	return className.trim() + $.LANG_CONFIG[language].classExt;
}

// * ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * Scans the segments of the given path from right to left and returns the first
 * segment that matches a key in LANG_CONFIG, or null if none is found.
 * @param {string} path - The file system path to inspect
 * @returns {string | null} The detected language key, or null
 */
function detectLangInPath(path) {
	const parts = path.split(/[\\/]/).filter(Boolean);
	for (let i = parts.length - 1; i >= 0; i--) {
		if (Object.hasOwn($.LANG_CONFIG, parts[i])) return parts[i];
	}
	return null;
}

/**
 * Resolves the language, problem directory, and class file path for the current session.
 * If a language is detected in BASE_DIR, it skips interactive category/difficulty/title
 * selection and derives the paths directly. Otherwise, the user is guided through
 * selecting each level of the directory hierarchy.
 * @returns {Promise<{ language: string, problemDir: string, classPath: string }>}
 */
export async function navigate() {
	const detectedLang = detectLangInPath($.BASE_DIR);

	if (detectedLang) {
		const problemDir = dirname($.BASE_DIR);
		const classPath  = join(problemDir, detectedLang, await promptClassName(detectedLang));
		return { language: detectedLang, problemDir, classPath };
	}

	const category   = await selectDir($.BASE_DIR, 'Category');
	const difficulty = await selectDir(join($.BASE_DIR, category), 'Difficulty');
	const title      = await selectDir(join($.BASE_DIR, category, difficulty), 'Coding problem');
	const language   = await selectDir(join($.BASE_DIR, category, difficulty, title), 'Language', getKnownLangs);

	const problemDir = join($.BASE_DIR, category, difficulty, title);
	const classPath  = join(problemDir, language, await promptClassName(language));
	return { language, problemDir, classPath };
}