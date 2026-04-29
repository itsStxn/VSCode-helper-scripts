import {
	basename,
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
} from './imports.js';
import * as $ from './constants.js';
import * as T from './types.js';

// * ─── Process ──────────────────────────────────────────────────────────────────

/**
 * Creates an object with methods to exit the process with a success or failure status.
 *
 * - `ok`:  Logs the message and exits with code 0.
 * - `bad`: Logs the message and exits with code 1.
 */
function exit(msg: string): T.ExitHandle {
	return {
		ok:  () => log(msg).then(() => process.exit(0)),
		bad: () => log(msg).then(() => process.exit(1)),
	};
}

// * ─── Terminal ─────────────────────────────────────────────────────────────────

/**
 * Returns a Promise that resolves after the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs a prefixed message to stdout, then pauses for LOG_DELAY milliseconds.
 */
export async function log(msg: string): Promise<void> {
	console.log(`>> ${msg}`);
	await sleep($.LOG_DELAY);
}

/**
 * Logs a prefixed warning to stderr, then pauses for LOG_DELAY milliseconds.
 */
async function warn(msg: string): Promise<void> {
	console.warn(`>> ${msg}`);
	await sleep($.LOG_DELAY);
}

/**
 * Clears the terminal by moving the cursor to the top-left and erasing everything below.
 */
export function clear(): void {
	readline.cursorTo(process.stdout, 0, 0);
	readline.clearScreenDown(process.stdout);
}

/**
 * Displays an interactive prompt to the user and returns their responses.
 *
 * Optionally clears the console before rendering the prompt if the global
 * `$.INQUIRER_CLEAR_FIRST` flag is enabled.
 *
 * @param data - Inquirer prompt configuration object defining questions and
 * expected inputs.
 * @returns A promise resolving to an object containing the user's responses.
 */
function ask(data: Record<string, any>): Promise<Record<string, string>> {
	if ($.INQUIRER_CLEAR_FIRST) clear();
	return inquirer.prompt(data);
}

// * ─── Clipboard ────────────────────────────────────────────────────────────────

/**
 * Reads and returns the current clipboard content using `wl-paste`.
 * Returns an empty string if the clipboard is empty.
 *
 * @throws {Error} If `wl-paste` fails for a reason other than an empty clipboard.
 */
function getClipboard(): string {
	try {
		return execSync('wl-paste').toString().trim();
	} catch (err) {
		const error = err as Error;
		if (error.message.includes('Nothing is copied')) return '';
		throw new Error(`Unexpected clipboard error: ${error.message}`);
	}
}

/**
 * Clears the clipboard using `wl-copy` and logs confirmation.
 */
export async function emptyClipboard(): Promise<void> {
	execSync('wl-copy', { stdio: 'ignore' });
	await log('Cleared clipboard.');
}

// * ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Returns `true` if the given text matches all title patterns, meaning it is
 * likely a title rather than code.
 */
function isNotCode(text: string): boolean {
	const lengthPattern = new RegExp(`^.{0,${Number.MAX_SAFE_INTEGER}}$`);
	return [...$.TITLE_PATTERNS, lengthPattern].every((pattern) => pattern.test(text));
}

// * ─── Code Extraction ──────────────────────────────────────────────────────────

/**
 * Interactively prompts the user to confirm clipboard content as valid code.
 * Loops until the content passes all validation checks, then clears the clipboard
 * and returns the code.
 *
 * @param previewLength - Maximum number of characters to show in the confirmation prompt.
 */
async function extractCode(previewLength: number): Promise<string> {
	const truncate = (text: string): string =>
		text.length > previewLength ? `${text.slice(0, previewLength)}...` : text;

	while (true) {
		const text = getClipboard();
		const { ok } = await ask([
			{
				type: 'confirm',
				name: 'ok',
				message: `(Press Enter to confirm) Code in the clipboard:\n${truncate(text)}`,
				default: true,
			},
		]);

		if (!ok) continue;

		if (text !== getClipboard()) { await log($.STATUS.codeChanged); continue; }
		if (text.length === 0)       { await log($.STATUS.codeEmpty);   continue; }
		if (isNotCode(text))         { await log($.STATUS.unvalid);     continue; }

		await log($.STATUS.codeAccepted);
		await emptyClipboard();
		clear();
		return text;
	}
}

/**
 * Prepends the language's template file (if it exists) to the given code string.
 */
function getTemplatePrepended(language: string, code: string): string {
	const templatePath = join($.CURR_DIR, 'templates', $.LANG_CONFIG[language].template);
	const template = existsSync(templatePath) ? readFileSync(templatePath, 'utf8') : '';
	return template + code + '\n';
}

// * ─── Class Files ──────────────────────────────────────────────────────────────

/**
 * Prompts the user to confirm clipboard code, prepends the language template,
 * and writes the result to disk.
 */
async function createClassFile(classPath: string, language: string): Promise<void> {
	const code    = await extractCode($.CODE_PREVIEW_LEN);
	const content = getTemplatePrepended(language, code);
	writeFileSync(classPath, content, 'utf8');
}

/**
 * Prompts the user to optionally open the class file in VS Code and/or open
 * its parent directory in a new terminal window.
 */
async function inspectClassFile(classPath: string): Promise<void> {
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
 */
function getDirs(dirPath: string): string[] {
	const dirs = readdirSync(dirPath).filter(
		(entry) => !entry.startsWith('.') && statSync(join(dirPath, entry)).isDirectory(),
	);

	if (dirs.length === 0) exit(`❌ No directories found in: ${dirPath}`).bad();

	return dirs;
}

/**
 * Filters a list of language folder names to only those recognised by LANG_CONFIG.
 * Warns about unrecognised entries and exits if none are valid.
 */
function getKnownLangs(existingLangs: string[]): string[] {
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
 * Runs the `addProblemReadme` shell script in the given problem directory.
 *
 * @throws {Error} If the script exits with a non-zero code.
 */
function addProblemReadme(problemDir: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const scriptPath = join($.CURR_DIR, 'commands', 'addProblemReadme.sh');
		const child = spawn('bash', [scriptPath], { cwd: problemDir, stdio: 'inherit' });

		child.on('close', (code: number | null) => {
			if (code === 0) resolve();
			else reject(new Error(`addProblemReadme() exited with code ${code}`));
		});
	});
}

// * ─── Prompts ──────────────────────────────────────────────────────────────────

/**
 * Presents a Yes/No list prompt and returns `true` if the user selects "Yes".
 *
 * @param inverted - If `true`, shows "No" before "Yes".
 */
async function promptBinary(message: string, inverted: boolean = false): Promise<boolean> {
	const { choice } = await ask([
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
 * Presents a list prompt of subdirectories within the given base path and returns
 * the selected directory name.
 *
 * @param filter - Optional function to filter the list of directories before prompting.
 */
async function selectDir(
	base:    string,
	message: string,
	filter:  T.DirFilter | null = null,
): Promise<string> {
	const dirs = filter?.(getDirs(base)) ?? getDirs(base);
	const { dir } = await ask([
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
 * Prompts the user to enter a class file name and returns it with the correct
 * extension appended.
 */
async function promptClassName(language: string): Promise<string> {
	const { className } = await ask([
		{
			type: 'input',
			name: 'className',
			message: 'Class file name (without extension):',
			validate: (input: string) => input.trim() !== '' || 'Class name cannot be empty.',
		},
	]);
	return className.trim() + $.LANG_CONFIG[language].classExt;
}

// * ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * Scans the segments of the given path from right to left and returns the first
 * segment that matches a key in LANG_CONFIG, or `null` if none is found.
 */
function detectLangInPath(path: string): string | null {
	const parts = path.split(/[\\/]/).filter(Boolean);
	for (let i = parts.length - 1; i >= 0; i--) {
		if (Object.hasOwn($.LANG_CONFIG, parts[i])) return parts[i];
	}
	return null;
}

/**
 * Resolves the language, problem directory, and class file path for the current session.
 *
 * If a language is detected in BASE_DIR, it skips interactive category/difficulty/title
 * selection and derives the paths directly. Otherwise, the user is guided through
 * selecting each level of the directory hierarchy.
 */
export async function navigate(): Promise<T.NavigationResult> {
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

// * ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Handles the workflow when a class file already exists.
 * Prompts the user to decide whether to quit, update the class, or update the
 * class and regenerate the associated README file.
 *
 * Depending on the user's choice, the class file may be rewritten and the
 * README may be updated accordingly.
 *
 * @param classPath - Path to the existing class file.
 * @param language - Programming language used for the class implementation.
 * @param problemDir - Directory containing the problem and optional README.
 * @throws {Error} If class creation, inspection, or README generation fails.
 */
export async function handleExistingClass(
	classPath:  string,
	language:   string,
	problemDir: string,
): Promise<void> {
	const { choice } = await ask([
		{
			type: 'list',
			name: 'choice',
			message: `"${basename(classPath)}" already exists. What do you want to do?`,
			choices: ['Quit', 'Update class', 'Update class + regenerate README'],
		},
	]);

	if (choice === 'Quit') exit('No changes made.').ok();

	await createClassFile(classPath, language);
	await log(`✅ Class updated: ${classPath}`);
	await inspectClassFile(classPath);

	if (choice.includes('README')) await addProblemReadme(problemDir);
}

/**
 * Handles initialization of a new class file and optionally prompts the user
 * to generate or update the associated README after creation.
 *
 * After creating and inspecting the class file, the user is asked whether to
 * generate or update the README file for the problem.
 *
 * @param classPath - Path where the new class file will be created.
 * @param language - Programming language used for the class implementation.
 * @param problemDir - Directory containing the problem and README resources.
 * @throws {Error} If class creation, inspection, or README generation fails.
 */
export async function handleNewClass(
	classPath:  string,
	language:   string,
	problemDir: string,
): Promise<void> {
	await createClassFile(classPath, language);
	await log(`✅ Class created: ${classPath}`);
	await inspectClassFile(classPath);

	// ? Follow up
	const { choice } = await ask([
		{
			type: 'list',
			name: 'choice',
			message: 'What do you want to do next?',
			choices: ['Add / update README', 'Quit'],
		},
	]);

	if (choice === 'Add / update README') await addProblemReadme(problemDir);
	else await log('Done.');
}
