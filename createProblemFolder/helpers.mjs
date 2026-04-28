import {
	writeFileSync,
	readFileSync,
	existsSync,
	execSync,
	spawn,
	join,
	dirname,
	inquirer,
	readline,
	readdirSync,
	statSync,
} from './imports.mjs';
import * as $ from './constants.mjs';

// * ─── Terminal ─────────────────────────────────────────────────────────────────

/**
 * Clears the console screen by moving the cursor to the top-left corner
 * and clearing all content from the cursor position downward.
 */
export function clear() {
	readline.cursorTo(process.stdout, 0, 0);
	readline.clearScreenDown(process.stdout);
}

/**
 * Pauses execution for a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs a message to the console with a prefix and applies a delay.
 * @async
 * @param {string} msg - The message to log
 * @returns {Promise<void>}
 */
export async function log(msg) {
	console.log(`>> ${msg}`);
	await sleep($.LOG_DELAY);
}

/**
 * Returns the inquirer instance, optionally clearing the console first.
 * @returns {Object} The inquirer instance
 */
export function ask() {
	if ( $.INQUIRER_CLEAR_FIRST) clear();
	return inquirer;
}

// * ─── Clipboard ────────────────────────────────────────────────────────────────

/**
 * Retrieves the current clipboard content using the `wl-paste` command.
 * @returns {string} The clipboard content trimmed of whitespace, or an empty string if nothing is copied.
 * @throws {Error} Throws an error if an unexpected clipboard error occurs.
 */
function getClipboard() {
	try {
		return execSync('wl-paste').toString().trim();
	} catch(err) {
		if (err.message.includes('Nothing is copied')) return '';
		throw new Error(`Unexpected clipboard error: ${err.message}`);
	}
}

/**
 * Clears the system clipboard by executing the `wl-copy` command with no input.
 * @async
 * @function emptyClipboard
 * @returns {Promise<void>} A promise that resolves after the clipboard is cleared and logged.
 * @throws {Error} If the `wl-copy` command is not available or fails to execute.
 */
export async function emptyClipboard() {
	execSync('wl-copy', { stdio: 'ignore' });
	await log('Cleared clipboard.');
}

// * ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates whether a string qualifies as a valid title based on predefined patterns and length constraints.
 * @param {string} text - The text to validate as a title.
 * @param {number} [minLength=0] - The minimum required length of the title.
 * @param {number} [maxLength=Number.MAX_SAFE_INTEGER] - The maximum allowed length of the title.
 * @returns {boolean} True if the text matches all title patterns and falls within the specified length range, false otherwise.
 */
function isTitle(text, minLength = 0, maxLength = Number.MAX_SAFE_INTEGER) {
	const lengthPattern = new RegExp(`^.{${minLength},${maxLength}}$`);
	return [...$.TITLE_PATTERNS, lengthPattern].every(pattern => pattern.test(text));
}

/**
 * Retrieves a title from the clipboard if it meets the specified length requirements.
 * @param {number} minLength - The minimum required length for the title.
 * @param {number} maxLength - The maximum allowed length for the title.
 * @returns {string} The clipboard text if it is a valid title, otherwise an empty string.
 */
export function getTitle(minLength, maxLength) {
	const text = getClipboard().trim();
	return isTitle(text, minLength, maxLength) ? text : '';
}

// * ─── Utilities ──────────────────────────────────────────────────────────────────

/**
 * Creates an object with two methods, `ok` and `bad`, which log a message and exit the process.
 *
 * @param {string} msg - The message to log before exiting.
 * @returns {{ ok: function(): Promise<void>, bad: function(): Promise<void> }} 
 *   An object with `ok` and `bad` methods. 
 *   - `ok`: Logs the message and exits the process with code 0 (success).
 *   - `bad`: Logs the message and exits the process with code 1 (failure).
 */
export function exit(msg) {
	return {
		ok: () => log(msg).then(process.exit(0)),
		bad: () => log(msg).then(process.exit(1))
	}
}

/**
 * Prompts the user with a binary yes/no question.
 * @async
 * @param {string} message - The question or message to display to the user
 * @param {boolean} [inverted=false] - Whether to invert the order of choices (No first, then Yes)
 * @returns {Promise<boolean>} - Resolves to true if user selects 'Yes', false if 'No'
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
 * Extracts and validates code from the clipboard with user confirmation.
 * @async
 * @returns {Promise<string>} The validated code from the clipboard
 * @throws Will continue prompting until valid code is confirmed
 * @description
 * Repeatedly prompts the user to confirm code from the clipboard.
 * Validates that:
 * - The code hasn't changed since retrieval
 * - The code is not empty
 * - The code is not just a title
 * Logs appropriate status messages for each validation failure and retries.
 * Upon successful validation, clears the clipboard and returns the code.
 */
async function extractCode() {
	const max = $.CODE_PREVIEW_LEN;
	const truncate = text =>
		text.length > max ? `${text.slice(0, $.CODE_PREVIEW_LEN)}...` : text;

	while (true) {
		const text = getClipboard();
		const { ok } = await ask().prompt([
			{
				type: 'confirm',
				name: 'ok',
				message: `(Press Enter to confirm) Code from clipboard:\n${truncate(text)}`,
				default: true,
			},
		]);

		if (!ok) continue;

		if (text !== getClipboard())  { await log($.STATUS.codeChanged);  continue; }
		if (text.length === 0)        { await log($.STATUS.codeEmpty);    continue; }
		if (isTitle(text))            { await log($.STATUS.codeIsTitle);  continue; }

		await log($.STATUS.codeAccepted);
		await emptyClipboard();
		clear();
		return text;
	}
}

// * ─── File System ──────────────────────────────────────────────────────────────

/**
 * Prompts the user to input details for a coding problem, including title, category, difficulty, and language.
 * 
 * @param {string} detectedTitle - The default title to pre-fill in the prompt input, if available.
 * @returns {Promise<Object>} A promise that resolves to an object containing the user's responses:
 *   - {string} title - The name of the coding problem.
 *   - {string} category - The selected category.
 *   - {string} difficulty - The selected difficulty ('easy', 'medium', or 'hard').
 *   - {string} language - The selected programming language.
 * @throws Will exit the process if no categories (directories) are found in the base directory.
 */
export function navigate(detectedTitle) {
	const categories = readdirSync($.BASE_DIR).filter(
		entry => !entry.startsWith('.') && statSync(join($.BASE_DIR, entry)).isDirectory()
	);

	if (categories.length === 0) {
		exit(`No directories were found at: ${categories}`).bad();
	} 
	
	return ask().prompt([
		{
			type: 'input',
			name: 'title',
			message: 'Coding problem name:',
			default: detectedTitle || null,
			validate: (input) => input.trim() !== '' || 'Name cannot be empty.',
		},
		{
			type: 'list',
			name: 'category',
			message: 'Category:',
			choices: categories,
		},
		{
			type: 'list',
			name: 'difficulty',
			message: 'Difficulty:',
			choices: ['easy', 'medium', 'hard'],
		},
		{
			type: 'list',
			name: 'language',
			message: 'Language:',
			choices: Object.keys($.LANG_CONFIG),
		},
	]);
}

/**
 * Retrieves a template for a given language and prepends it to clipboard content.
 * @param {string} language - The programming language identifier
 * @param {string} clipboard - The clipboard content to append after the template
 * @returns {string} The template content followed by the clipboard content
 */
function getTemplatePrepended(language, clipboard) {
	const templatePath = join($.CURR_DIR, 'templates', $.LANG_CONFIG[language].template);
	const template = existsSync(templatePath) ? readFileSync(templatePath, 'utf8') : '';
	return template + clipboard + '\n';
}

/**
 * Writes the solution content for a given programming language.
 * @async
 * @param {string} language - The programming language for which to generate solution content
 * @returns {Promise<string>} A promise that resolves to the solution content with template prepended
 */
async function writeSolutionContent(language) {
	const code = await extractCode();
	return getTemplatePrepended(language, code);
} 

/**
 * Creates a solution file with language-specific content.
 * @async
 * @param {string} solutionPath - The file path where the solution will be written.
 * @param {string} language - The programming language for which to generate the solution content.
 * @returns {Promise<void>}
*/
export async function createSolutionFile(solutionPath, language) {
	const code = await writeSolutionContent(language);
	writeFileSync(solutionPath, code, 'utf8');
}

/**
 * Executes a language-specific setup script in the given problem directory.
 * @param {string} language - The programming language identifier
 * @param {string} problemDir - The directory path where the setup script will be executed
 * @returns {string} The trimmed output from the setup script execution
 * @throws {Error} If the setup script is not found at the expected path
 */
export function runSetupScript(language, problemDir) {
	const scriptPath = join($.CURR_DIR, 'commands', $.LANG_CONFIG[language].script);
	if (!existsSync(scriptPath)) throw new Error(`Setup script not found: ${scriptPath}`);
	return execSync(`cd "${problemDir}" && "${scriptPath}"`).toString().trim();
}

// * ─── Inspection ───────────────────────────────────────────────────────────────

/**
 * Inspects a solution file by offering options to open it in VS Code and/or open its directory in a terminal.
 * @async
 * @param {string} solutionPath - The file path to the solution file to inspect
 * @returns {Promise<void>}
 */
export async function inspectSolutionFile(solutionPath) {
	if (await promptBinary(`Open solution's file:`)) {
		execSync(`code "${solutionPath}"`);
	}

	if (await promptBinary(`Open solution's directory:`, true)) {
		spawn('gnome-terminal', ['--', 'bash', '-c', `cd "${dirname(solutionPath)}"; exec bash`], {
			detached: true,
		});
	}
}

// * ─── Scripts ──────────────────────────────────────────────────────────────────

/**
 * Executes a bash script and returns a promise that resolves when the script completes successfully.
 * @param {string} cmd - The name of the command (script filename without .sh extension)
 * @param {string} cwd - The working directory in which to execute the command
 * @returns {Promise<void>} A promise that resolves if the command exits with code 0, or rejects with an error if it exits with a non-zero code
 * @throws {Error} Rejects with an error containing the command name, exit code, and stderr output if the script fails
 */
function runCommand(cmd, cwd) {
	return new Promise((resolve, reject) => {
		const scriptPath = join($.CURR_DIR, 'commands', `${cmd}.sh`);
		const child = spawn('bash', [scriptPath], { cwd, stdio: ['inherit', 'inherit', 'pipe'] });

		let stderr = '';
		child.stderr.on('data', data => {
			process.stderr.write(data);
			stderr += data.toString();
		});

		child.on('close', code => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd}() exited with code ${code}\n${stderr}`));
		});
	});
}

/**
 * Prompts the user to optionally add a README.md file to the specified problem directory.
 * If the user confirms, executes the command to add the README.md.
 *
 * @async
 * @param {string} problemDir - The path to the problem directory where the README.md should be added.
 * @returns {Promise<void>} Resolves when the operation is complete.
 */
export async function addProblemReadme(problemDir) {
	if (await promptBinary('Add README.md:'))
		runCommand('addProblemReadme', problemDir) 
}

/**
 * Prompts the user to add a new problem class and executes the add command if confirmed.
 * @async
 * @param {string} languageDir - The directory path where the problem class will be added
 * @returns {Promise<boolean>} - Returns true if at least one class was added, false otherwise
 */
export async function addProblemClass(languageDir) {
	let added = false;
	while (await promptBinary('Add new class:', true)) {
		added = true;
		await runCommand('addProblemClass', languageDir);
	}

	return added;
}
