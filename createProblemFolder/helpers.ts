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
	mkdirSync,
	basename,
} from './imports.js';
import * as $ from './constants.js';
import * as T from './types.js';

// * ─── Terminal ─────────────────────────────────────────────────────────────────

/**
 * Clears the console screen by moving the cursor to the top-left corner
 * and clearing all content from the cursor position downward.
 */
export function clear(): void {
	readline.cursorTo(process.stdout, 0, 0);
	readline.clearScreenDown(process.stdout);
}

/**
 * Pauses execution for a specified number of milliseconds.
 * 
 * @param ms - Number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs a message to the console with a prefix and applies a delay.
 * 
 * @param msg - Message to log.
 */
export async function log(msg: string): Promise<void> {
	console.log(`>> ${msg}`);
	await sleep($.LOG_DELAY);
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
 * Retrieves the current clipboard content using the `wl-paste` command.
 *
 * @returns The clipboard content as a string.
 * @throws {Error} If an unexpected clipboard error occurs.
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
 * Clears the system clipboard by executing the `wl-copy` command with no input.
 *
 * @throws {Error} If `wl-copy` is not available or fails to execute.
 */
export async function emptyClipboard(): Promise<void> {
	execSync('wl-copy', { stdio: 'ignore' });
	await log('Cleared clipboard.');
}

// * ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates whether a string qualifies as a valid title based on predefined
 * patterns and length constraints.
 * 
 * @param text - Text to validate.
 * @param minLength - The minimum length for a valid title. Defaulted to 0.
 * @param maxLength - The maximum length for a valid title. Defaulted to Number.MAX_SAFE_INTIGER.
 * @returns A boolean answering whether the text is valid or not.
*/
function isTitle(
	text: string,
	minLength: number = 0,
	maxLength: number = Number.MAX_SAFE_INTEGER,
): boolean {
	const lengthPattern = new RegExp(`^.{${minLength},${maxLength}}$`);
	return [...$.TITLE_PATTERNS, lengthPattern].every((pattern) => pattern.test(text));
}

/**
 * Retrieves a title from the clipboard if it meets the specified length requirements.
 * 
 * @param minLength - The minimum length for a valid title.
 * @param maxLength - The maximum length for a valid title.
 * @returns The valid title retrieved from the clipboard as a string.
 */
export function getTitle(minLength: number, maxLength: number): string {
	const text = getClipboard().trim();
	return isTitle(text, minLength, maxLength) ? text : '';
}

// * ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Capitalizes the first letter of a string.
 *
 * @param word - Input string.
 * @returns String with first letter capitalized, or empty string if input is empty.
 */
function capitalize(word: string): string {
	if (!word) return '';
	return word[0].toUpperCase() + word.slice(1);
}

/**
 * Creates an object with `ok` and `bad` methods that log a message and exit the process.
 * 
 * @param msg - Message to log.
 * - `ok`: Exits with code 0 (success).
 * - `bad`: Exits with code 1 (failure).
 */
function exit(msg: string): T.ExitHandle {
	return {
		ok:  () => log(msg).then(() => process.exit(0)),
		bad: () => log(msg).then(() => process.exit(1)),
	};
}

/**
 * Prompts the user with a binary yes/no question.
 *
 * @param message - The prompt's message.
 * @param inverted - When true, shows "No" before "Yes".
 * @returns `true` if the user selects "Yes", `false` otherwise.
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
 * Extracts and validates code from the clipboard with user confirmation.
 *
 * Repeatedly prompts the user until valid code is confirmed. Validates that:
 * - The code hasn't changed since retrieval.
 * - The code is not empty.
 * - The code is not just a title.
 *
 * @returns The code, then clears the clipboard.
 */
async function extractCode(): Promise<string> {
	const truncate = (text: string): string =>
		text.length > $.CODE_PREVIEW_LEN
			? `${text.slice(0, $.CODE_PREVIEW_LEN)}...`
			: text;

	while (true) {
		const text = getClipboard();
		const { ok } = await ask([
			{
				type: 'confirm',
				name: 'ok',
				message: `(Press Enter to confirm) Code from clipboard:\n${truncate(text)}`,
				default: true,
			},
		]);

		if (!ok) continue;

		if (text !== getClipboard()) { await log($.STATUS.codeChanged);  continue; }
		if (text.length === 0)       { await log($.STATUS.codeEmpty);    continue; }
		if (isTitle(text))           { await log($.STATUS.codeIsTitle);  continue; }

		await log($.STATUS.codeAccepted);
		await emptyClipboard();
		clear();
		return text;
	}
}

// * ─── File System ──────────────────────────────────────────────────────────────

/**
 * Prompts the user to input details for a coding problem: title, category,
 * difficulty, and language.
 *
 * @param detectedTitle - A pre-filled default title, if available.
 * @throws Will exit the process if no category directories are found in the base directory.
 */
export async function navigate(detectedTitle: string): Promise<Record<string, string>> {
	const categories = readdirSync($.BASE_DIR).filter(
		(entry) => !entry.startsWith('.') && statSync(join($.BASE_DIR, entry)).isDirectory(),
	);

	if (categories.length === 0) {
		exit(`No directories were found at: ${categories}`).bad();
	}

	return ask([
		{
			type: 'input',
			name: 'title',
			message: 'Coding problem name:',
			default: detectedTitle || null,
			validate: (input: string) => input.trim() !== '' || 'Name cannot be empty.',
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
 * Retrieves a language template and prepends it to the given clipboard content.
 * 
 * @param language - The coding language.
 * @param clipboard - The text from the clipboard.
 */
function getTemplatePrepended(language: string, clipboard: string): string {
	const templatePath = join($.CURR_DIR, 'templates', $.LANG_CONFIG[language].template);
	const template = existsSync(templatePath) ? readFileSync(templatePath, 'utf8') : '';
	return template + clipboard + '\n';
}

/**
 * Extracts code from the clipboard and prepends the language-specific template. 
 * Then tries to insert the prorlem name to the content.
 * 
 * @param problemDir - The problem's diractory path.
 * @param language - The coding language.
 * @returns A promise containg the content of the solution file.
*/
async function writeSolutionContent(problemDir: string, language: string): Promise<string> {
	const code = await extractCode();
	let content = getTemplatePrepended(language, code);
	const problemName = problemDir.replaceAll(' ', '_');
	
	return content.replaceAll('$problemName', problemName);
}

/**
 * Creates a solution file at the given path with language-specific content.
 * 
 * @param solutionPath - The solution file's path.
 * @param language - The coding language.
*/
async function createSolutionFile(solutionPath: string, language: string): Promise<void> {
	const problemName = basename(dirname(dirname(solutionPath)));
	const code = await writeSolutionContent(problemName, language);
	writeFileSync(solutionPath, code, 'utf8');
}

/**
 * Executes a language-specific setup script in the given problem directory.
 * 
 * @param problemDir - The problem's diractory path.
 * @param language - The coding language.
 * @returns The trimmed stdout output from the setup script.
 * @throws {Error} If the setup script is not found at the expected path.
 */
function runSetupScript(language: string, problemDir: string): string {
	const scriptPath = join($.CURR_DIR, 'commands', $.LANG_CONFIG[language].script);
	if (!existsSync(scriptPath)) throw new Error(`Setup script not found: ${scriptPath}`);
	return execSync(`cd "${problemDir}" && "${scriptPath}"`).toString().trim();
}

// * ─── Inspection ───────────────────────────────────────────────────────────────

/**
 * Inspects a solution file by offering to open it in VS Code and/or its directory in a terminal.
 * 
 * @param solutionPath - The solution file's path.
 */
async function inspectSolutionFile(solutionPath: string): Promise<void> {
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
 * Executes a bash script and returns a promise that resolves when the script
 * completes successfully.
 *
 * @param cmd - The command name (script filename without `.sh` extension).
 * @param cwd - The working directory in which to run the script.
 * @throws {Error} If the script exits with a non-zero code.
 */
function runCommand(cmd: string, cwd: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const scriptPath = join($.CURR_DIR, 'commands', `${cmd}.sh`);
		const child = spawn('bash', [scriptPath], { cwd, stdio: ['inherit', 'inherit', 'pipe'] });

		let stderr = '';
		child.stderr.on('data', (data: Buffer) => {
			process.stderr.write(data);
			stderr += data.toString();
		});

		child.on('close', (code: number | null) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd}() exited with code ${code}\n${stderr}`));
		});
	});
}

/**
 * Prompts the user to optionally add a `README.md` to the given problem directory.
 * 
 * @param problemDir - The problem's diractory path.
*/
async function addProblemReadme(problemDir: string): Promise<void> {
	if (await promptBinary('Add README.md:'))
		await runCommand('addProblemReadme', problemDir);
}

/**
 * Prompts the user to repeatedly add new problem classes until they decline.
 * 
 * @param languageDir - Directory containing language-specific project files.
 * @returns `true` if at least one class was added, `false` otherwise.
 */
async function addProblemClass(languageDir: string): Promise<boolean> {
	let added = false;

	while (await promptBinary('Add new class:', true)) {
		added = true;
		await runCommand('addProblemClass', languageDir);
	}

	return added;
}

// * ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Handles the workflow when a project already exists in the target location.
 * Prompts the user to either quit or update the existing solution, and if
 * confirmed, regenerates the solution file and re-runs post-generation steps.
 *
 * @param languageDir - Directory containing language-specific project files.
 * @param solutionPath - Path to the solution file to be created or updated.
 * @param problemDir - Directory containing the problem setup.
 * @param language - Programming language used for the project.
 * @throws {Error} If solution generation or inspection fails.
 */
export async function handleExistingProject(
	languageDir:  string,
	solutionPath: string,
	problemDir:   string,
	language:     string,
): Promise<void> {
	const { choice } = await ask([
		{
			type: 'list',
			name: 'choice',
			message: `A ${language} project already exists here. What do you want to do?`,
			choices: ['Quit', 'Update solution'],
		},
	]);

	if (choice === 'Quit') exit('No changes made.').ok();

	await createSolutionFile(solutionPath, language);
	await log(`✅ Solution updated: ${solutionPath}`);
	await inspectSolutionFile(solutionPath);
	await addClassOrReadme(languageDir, problemDir);
}

/**
 * Initializes a new project by running the setup script and generating the
 * initial solution file and supporting project structure.
 *
 * Ensures that the expected language directory is created and validates the
 * setup script output before proceeding.
 *
 * @param problemDir - Directory where the problem setup will be created.
 * @param languageDir - Expected directory created by the setup script.
 * @param solutionPath - Path where the solution file should be generated.
 * @param language - Programming language used for the project.
 * @throws {Error} If the setup script fails, produces no output, or does not
 * create the expected directory.
 */
export async function handleNewProject(
	problemDir:   string,
	languageDir:  string,
	solutionPath: string,
	language:     string,
): Promise<void> {
	mkdirSync(problemDir, { recursive: true });
	const output = runSetupScript(language, problemDir);

	if (!existsSync(languageDir)) {
		exit(`Setup script ran, but expected directory was not created: ${languageDir}`).bad();
	}

	if (output.length === 0) {
		exit(`Setup script ran, but its output is unknown. Check: ${languageDir}`).bad();
	}
	
	await log(output);
	await createSolutionFile(solutionPath, language);
	await inspectSolutionFile(solutionPath);
	await addClassOrReadme(languageDir, problemDir);
}

/**
 * Prompts the user to either add new problem classes or add a `README.md` to the given problem directory.
 * 
 * @param languageDir - Expected directory created by the setup script.
 * @param problemDir - Directory where the problem setup will be created.
 */
export async function addClassOrReadme(languageDir: string, problemDir: string): Promise<void> {
	const added = await addProblemClass(languageDir);
	if (!added) await addProblemReadme(problemDir);
}

// * ─── Category README Helpers ───────────────────────────────────────────────────────────

/**
 * Updates the problem category cache by adding a new problem title under the
 * specified difficulty level.
 *
 * If the cache file does not exist, it is created with default difficulty
 * sections (easy, medium, hard). Duplicate titles are ignored to prevent
 * redundant entries.
 *
 * Persists the updated cache to disk and logs the update status.
 *
 * @param category - The problem category folder name.
 * @param difficulty - Difficulty level ("easy", "medium", or "hard").
 * @param title - Problem title to add to the cache.
 * @returns The updated problem category cache.
 */
export async function updateProblemCategoryCache(category: string, difficulty: string, title: string) : Promise<T.ProblemCategory> {
	const categoryDir = join($.BASE_DIR, category);
	const filename = 'problem_category_cache.json';
	const filePath = join(categoryDir, filename);

	let cache: T.ProblemCategory = {
		easy: [] as string[],	
		medium: [] as string[],	
		hard: [] as string[]	
	};

	if (existsSync(filePath)) {
		const fileContent = readFileSync(filePath, 'utf8');
		if (fileContent) cache = JSON.parse(fileContent);
	}

	if (cache[difficulty].includes(title)) {
		await log(`${category}/ already has ${title}, no changes were made`);
		return cache;
	}

	cache[difficulty].push(title);
	writeFileSync(filePath, JSON.stringify(cache, null, 2), 'utf8');
	await log(`✅ ${category}/ cache updated: ${filePath}`);

	return cache;
}

/**
 * Validates that a category README.md file exists and contains the required
 * structure for problem documentation.
 *
 * Specifically ensures that the README includes a "## Difficulties" section
 * and does not incorrectly omit required structural sections such as
 * "## Patterns".
 *
 * @param category - The problem category folder name.
 * @throws Terminates execution if the README file is missing or invalid.
 */
export function checkProblemCategoryReadme(category: string) : void {
	const categoryDir = join($.BASE_DIR, category);
	const readmeFile = join(categoryDir, 'README.md');
	
	if (!existsSync(readmeFile))
		exit(`'${category}/ does not contain README.md: ${categoryDir}'`).bad();
	
	const content = readFileSync(readmeFile, 'utf-8');

	if (content.includes('## Difficulties\n') && !content.includes('## Patterns\n'))
		exit(`${category}/README.md must have "## Difficulties" and "## Patterns" subtitles: ${readmeFile}`).bad();
}

/**
 * Builds a formatted markdown string representing the problem list grouped
 * by difficulty.
 *
 * Only includes difficulty sections that contain at least one problem.
 * Each section is rendered as a markdown header followed by a bullet list
 * of problem titles.
 *
 * @param cache - Problem category cache containing grouped problem titles.
 * @returns A formatted markdown string representing the grouped problem list.
 */
function buildProblemList(cache: T.ProblemCategory): string {
	return Object.entries(cache)
		.filter(([, titles]) => titles.length > 0)
		.map(([difficulty, titles]) => {
			const header = `### ${capitalize(difficulty)}`;
			const items = titles.map(title => `- ${title}`).join('\n');
			return `${header}\n\n${items}`;
		})
		.join('\n\n')
		.trim();
}

/**
 * Updates the README.md file of a problem category by injecting or replacing
 * the problem list section with the latest cached data.
 *
 * Detects the existing problem list block using a predefined regex pattern
 * and replaces it with a freshly generated markdown list. If no existing
 * block is found, the function appends a new "## Difficulties" section.
 *
 * Ensures the README remains synchronized with the current cache state.
 *
 * @param category - The problem category folder name.
 * @param cache - The current problem category cache.
 * @throws Terminates execution if multiple or ambiguous problem list
 * sections are detected.
 */
export async function updateProblemCategoryReadme(category: string, cache: T.ProblemCategory) : Promise<void> {
	const categoryDir = join($.BASE_DIR, category);
	const readmeFile = join(categoryDir, 'README.md');
	const content = readFileSync(readmeFile, 'utf-8');
	
	const matches = new RegExp($.CATEGORY_README_PATTERN).exec(content) || [];
	let newProblemList = '';
	let oldProblemList = '';
	
	if (matches.length == 0) {
		oldProblemList = '## Difficulties';
		newProblemList = '## Difficulties\n\n' + buildProblemList(cache);
	}
	else if (matches.length == 1) {
		oldProblemList = matches[0].trim();
		newProblemList = buildProblemList(cache);
	}
	else
		exit(`Ambiguous problem list in ${category}/: ${readmeFile}`).bad();
	
	const newContent = content.replace(oldProblemList, newProblemList);

	writeFileSync(readmeFile, newContent, 'utf8');
	await log(`✅ ${category}/README.md updated: ${readmeFile}`);
}
