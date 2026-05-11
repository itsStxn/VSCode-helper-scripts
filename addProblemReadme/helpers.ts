import {
	readdirSync,
	readFileSync,
	statSync,
	inquirer,
	join,
	existsSync,
	writeFileSync,
	execSync,
	readline,
} from './imports.js';
import * as $ from './constants.js';
import * as T from './types.js';

// * ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Creates an object with methods to exit the process with a success or failure status.
 * @param msg - Message to log.
 * - `ok`:  Logs the message and exits with code 0.
 * - `bad`: Logs the message and exits with code 1.
 */
export function exit(msg: string): T.ExitHandle {
	return {
		ok:  () => log(msg).then(() => process.exit(0)),
		bad: () => log(msg).then(() => process.exit(1)),
	};
}

/**
 * Presents a Yes/No list prompt and returns `true` if the user selects "Yes".
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

// * ─── Terminal ─────────────────────────────────────────────────────────────────

/**
 * Clears the terminal screen and moves the cursor to the top-left position.
 */
export function clear(): void {
	readline.cursorTo(process.stdout, 0, 0);
	readline.clearScreenDown(process.stdout);
}

/**
 * Returns a Promise that resolves after the given number of milliseconds.
 * @param ms - Number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs a prefixed message to stdout, then pauses for LOG_DELAY milliseconds.
 * @param msg - Message to log.
 */
export async function log(msg: string): Promise<void> {
	console.log(`>> ${msg}`);
	await sleep($.LOG_DELAY);
}

/**
 * Logs a prefixed warning to stderr, then pauses for LOG_DELAY milliseconds.
 * @param msg - Message to log.
 */
async function warn(msg: string): Promise<void> {
	console.warn(`>> ${msg}`);
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

// * ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * Starts from BASE_DIR and presents an interactive prompt allowing the user to
 * select "This" to return the current directory, "Parent" to go up, or any
 * subdirectory to navigate into it. Hidden entries are excluded.
 *
 * @returns Promise containing a absolute path string of the selected directory.
 */
export async function navigate(): Promise<string> {
	let currentDir = $.BASE_DIR;

	while (true) {
		const subdirs = readdirSync(currentDir).filter(
			(entry) => !entry.startsWith('.') && statSync(join(currentDir, entry)).isDirectory(),
		);

		const { choice } = await ask([
			{
				type: 'list',
				name: 'choice',
				message: 'Select directory:',
				choices: ['This', 'Parent', ...subdirs],
			},
		]);

		if (choice === 'This') return currentDir;

		const next = choice === 'Parent' ? '..' : choice;
		currentDir = join(currentDir, next);
	}
}

// * ─── README Helpers ───────────────────────────────────────────────────────────

/**
 * Prompts the user to confirm whether to add or update a README file.
 * @returns Promise containing a boolean for to represent Yes or No.
*/
export function askProceed(): Promise<boolean> {
	return promptBinary('Add/update README:');
}

/**
 * Prompts the user to confirm whether to open the README file.
 * @returns Promise containing a boolean for to represent Yes or No.
 */
export function askOpenReadme(): Promise<boolean> {
	return promptBinary('Open README:');
}

/**
 * Opens a file in Visual Studio Code.
 * @param filePath - The path to the README.md file.
 * 
 */
export function openReadme(filePath: string): void {
	execSync(`code "${filePath}"`);
}

/**
 * Writes content to a README file at the given path and logs confirmation.
 * @param filePath - The path to the README.md file.
 * @param content - The content of the README.md file.
 */
export async function createReadme(filePath: string, content: string): Promise<void> {
	writeFileSync(filePath, content);
	await log(`✅ README created at: ${filePath}`);
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
 * Clears the clipboard using `wl-copy` and logs confirmation.
 */
export async function emptyClipboard(): Promise<void> {
	execSync('wl-copy', { stdio: 'ignore' });
	await log('Cleared clipboard.');
}

// * ─── Gathering Code ───────────────────────────────────────────────────────────

/**
 * Scans the given location for language subdirectories recognised by LANG_CONFIG,
 * then builds a markdown string of fenced code blocks grouped by language and file.
 *
 * @param location - The location for language subdirectories recognised by LANG_CONFIG.
 * @throws {Error} If a code file exists but is empty.
 * @returns A markdown-formatted string, or an empty string if no valid files are found.
 */
export function detectCode(location: string): string {
	const langs = readdirSync(location).filter(
		(entry) => entry in $.LANG_CONFIG && statSync(join(location, entry)).isDirectory(),
	);

	if (!langs.length) return '';

	const sections = langs.map((lang) => {
		const langDir = join(location, lang);
		const files   = readdirSync(langDir).filter((f) => f.endsWith($.LANG_CONFIG[lang].classExt));

		if (!files.length) return null;

		const langLabel  = lang.toLowerCase().replace('#', 'sharp');
		const codeBlocks = files.map((file) => {
			const filePath = join(langDir, file);
			const code     = readFileSync(filePath, 'utf-8').trim();
			if (!code) throw new Error(`${file} is empty at: ${filePath}`);
			return `### ${file}\n\n\`\`\`${langLabel}\n${code}\n\`\`\``;
		});

		return `## ${lang}\n\n${codeBlocks.join('\n\n')}`;
	});

	return sections.filter(Boolean).join('\n\n').trim();
}

// * ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Returns `true` if the given text matches all problem description patterns.
 * 
 * @param text - Input string.
 */
function isProblemDesc(text: string): boolean {
	return $.PROBLEM_DESC_PATTERNS.every((pattern) => pattern.test(text));
}

// * ─── Problem Description ──────────────────────────────────────────────────────

/**
 * Interactively prompts the user to confirm clipboard content as a valid problem description.
 * Loops until the content passes all validation checks, then clears the clipboard and returns it.
 * 
 * @returns Promise containing the problem description as a string from the clipboard.
 */
async function extractProblemDesc(): Promise<string> {
	const max      = $.PROBLEM_DESC_PREVIEW_LEN;
	const truncate = (text: string): string =>
		text.length > max ? `${text.slice(0, max)}...` : text;

	while (true) {
		const text = getClipboard();
		const { ok } = await ask([
			{
				type: 'confirm',
				name: 'ok',
				message: `(Press Enter to confirm) Description from clipboard:\n${truncate(text)}`,
				default: true,
			},
		]);

		if (!ok) continue;

		if (text !== getClipboard()) { await log($.STATUS.descChanged); continue; }
		if (text.length === 0)       { await log($.STATUS.descEmpty);   continue; }
		if (!isProblemDesc(text))    { await log($.STATUS.descIsTitle); continue; }

		await log($.STATUS.descAccepted);
		await emptyClipboard();
		clear();
		return text;
	}
}

/**
 * Reads a problem file, extracts the description section before the separator,
 * and returns it wrapped in a fenced HTML code block.
 *
 * @param filePath - The path to the README.md file.
 * @returns The formatted HTML block, or an empty string if the separator is absent.
 */
export function getProblemDescReadme(filePath: string): string {
	const content = readFileSync(filePath, 'utf-8').trim();
	if (!content?.includes($.PROBLEM_DESC_SEP)) return '';

	const desc = content.split($.PROBLEM_DESC_SEP)[0].trim();
	const page = `<html><body><p>${desc}</p></body></html>`;
	return `\`\`\`html\n${page}\n\`\`\``;
}

// * ─── References & Prompt ──────────────────────────────────────────────────────

/**
 * Reads and returns the trimmed contents of the instructions and templates files.
 * 
 * - `instructions`: String with md formatted instructions.
 * - `templates`: String with md formatted instruction templates.
 */
export function getReferences(): T.References {
	const instructions = readFileSync($.INSTRUCTIONS_PATH, 'utf-8').trim();
	const templates    = readFileSync($.TEMPLATES_PATH, 'utf-8').trim();
	return { instructions, templates };
}

/**
 * Builds a formatted prompt string combining instructions, templates,
 * problem description, and solution code.
 * 
 *	@param instructions - md formatted instructions,
 *	@param templates - md formatted instruction templates,
 *	@param problemDesc - Description text of the problem,
 *	@param code - Problem code,
 */
export function buildPrompt(
	instructions: string,
	templates:    string,
	problemDesc:  string,
	code:         string,
): string {
	return `
${instructions}

---

${templates}

---

# CODING PROBLEM

${problemDesc}

---

# SOLUTION

${code}
`.trim();
}

// * ─── LeetCode API ─────────────────────────────────────────────────────────────

/**
 * Fetches a mapping of LeetCode question titles (lowercased) to their title slugs
 * via the GraphQL API.
 * 
 * @returns Promise containing an object of string problem names mapped 
 * to their respective string slugs.
 */
async function fetchSlugMap(): Promise<T.SlugMap> {
	const res = await fetch($.LEETCODE_GRAPHQL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: `
			query {
				allQuestionsRaw {
					title
					titleSlug
				}
			}
			`,
		}),
	});

	const data: T.LeetCodeQuestionResponse = await res.json();

	return Object.fromEntries(
		data.data.allQuestionsRaw.map((q) => [q.title.toLowerCase(), q.titleSlug]),
	);
}

/**
 * Returns a cached slug map from disk if available and not stale.
 * Fetches and writes a fresh copy when the cache is missing, empty, or `forceRefresh` is `true`.
 *
 * @param forceRefresh - Boolean specifying whether to refresh the cache or not. 
 * @returns Promise containing an object of string problem names mapped 
 * to their respective string slugs.
 */
async function getSlugMapCached(forceRefresh: boolean): Promise<T.SlugMap> {
	if (!forceRefresh && existsSync($.SLUG_CACHE_PATH)) {
		try {
			const stats = statSync($.SLUG_CACHE_PATH);
			if (stats.size > 0) {
				const { value }: T.SlugCache = JSON.parse(readFileSync($.SLUG_CACHE_PATH, 'utf-8'));
				return value;
			}
		} catch (err) {
			await warn(`Slug cache read failed, regenerating: ${$.SLUG_CACHE_PATH}\n${(err as Error).message}`);
		}
	}

	const value = await fetchSlugMap();
	writeFileSync($.SLUG_CACHE_PATH, JSON.stringify({ value }, null, 2));
	return value;
}

/**
 * Converts a title string into a URL-friendly slug.
 *
 * - Normalises accents (é → e)
 * - Lowercases the result
 * - Removes apostrophes
 * - Replaces non-alphanumeric characters with hyphens
 * 
 * @param title - The problem name's title.
 * @returns The slug string.
 */
function slugify(title: string): string {
	return title
		.normalize('NFKD')
		.replaceAll(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replaceAll(/['']/g, '')
		.replaceAll(/[^a-z0-9]+/g, ' ')
		.trim()
		.replaceAll(/\s+/g, '-');
}

/**
 * Resolves a problem name to its LeetCode title slug using the cached slug map.
 * Falls back to `slugify` and logs a warning if no mapped slug is found.
 * 
 * @param problemName - Name of the problem. 
 * @param forceRefresh - Boolean specifying whether to refresh the cache or not. 
 * @returns Promise containing the string slug. 
 */
async function toSlug(problemName: string, forceRefresh: boolean): Promise<string> {
	const slugMap = await getSlugMapCached(forceRefresh);
	const key     = problemName.toLowerCase().trim();

	if (!Object.hasOwn(slugMap, key)) {
		const titleSlug = slugify(problemName);
		await warn(`No mapped slug found for "${problemName}" (searched as: ${key}). Using "${titleSlug}" instead.`);
		return titleSlug;
	}

	return slugMap[key];
}

/**
 * Fetches the content of a LeetCode problem by its title slug via the GraphQL API.
 *
 * @param titleSlug - Slug of the problem. 
 * @throws {Error} If the problem is not found for the given slug.
 */
async function fetchProblemDesc(titleSlug: string): Promise<{ content: string }> {
	const res = await fetch($.LEETCODE_GRAPHQL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Referer: $.LEETCODE_URL,
		},
		body: JSON.stringify({
			query: `
			query getQuestion($titleSlug: String!) {
				question(titleSlug: $titleSlug) {
					content
				}
			}
			`,
			variables: { titleSlug },
		}),
	});

	const data: T.LeetCodeProblemResponse = await res.json();

	if (!data?.data?.question) {
		throw new Error(`Problem not found for slug: "${titleSlug}".`);
	}

	return data.data.question;
}

/**
 * Wraps a problem's title and content into a fenced HTML markdown block.
 *
 * param `{ title, content }` - Object containing the string title and string problem description. 
 * @returns The formatted HTML block, or an empty string if content is falsy.
 */
function buildProblemHTML({ title, content }: T.ProblemData): string {
	if (!content) return '';
	const body = content.startsWith('<p>') ? content : `<p>${content}</p>`;
	const page = `<html><body><h1>${title}</h1>${body}</body></html>`;
	return `\`\`\`html\n${page}\n\`\`\``;
}

/**
 * Fetches problem data for the given slug, falling back to manual clipboard
 * extraction if the API request fails.
 * 
 * @param problemName - Name of the problem. 
 * @param titleSlug - Slug of the problem. 
 * @returns `{ title, content }` - Object containing the string title and string problem description. 
 */
async function getProblemData(problemName: string, titleSlug: string): Promise<T.ProblemData> {
	try {
		const res = await fetchProblemDesc(titleSlug);
		return { title: problemName, content: res.content };
	} catch (err) {
		await warn((err as Error).message);
		await log(`Copy the problem's description.`);
		const fallbackContent = await extractProblemDesc();
		return { title: problemName, content: fallbackContent };
	}
}

/**
 * Returns the HTML description of a problem, reading from the problems cache when
 * available. Prompts the user about forcing a cache refresh. If the slug is absent
 * from the cache, fetches and updates it. Falls back to rebuilding the entire cache
 * if reading fails.
 * 
 * @param problemName - Name of the problem. 
 * @returns Promise containing the string problem descripiton. 
 */
export async function getProblemDescCached(problemName: string): Promise<string> {
	const forceRefresh = await promptBinary('Rebuild cache:', true);
	const titleSlug    = await toSlug(problemName, forceRefresh);

	if (!forceRefresh && existsSync($.PROBLEMS_CACHE_PATH)) {
		try {
			const stats = statSync($.PROBLEMS_CACHE_PATH);
			if (stats.size > 0) {
				const { value: cachedMap }: T.ProblemsCache = JSON.parse(
					readFileSync($.PROBLEMS_CACHE_PATH, 'utf-8'),
				);

				if (!Object.hasOwn(cachedMap, titleSlug)) {
					cachedMap[titleSlug] = await getProblemData(problemName, titleSlug);
					writeFileSync($.PROBLEMS_CACHE_PATH, JSON.stringify({ value: cachedMap }, null, 2));
				}

				return buildProblemHTML(cachedMap[titleSlug]);
			}
		} catch (err) {
			await warn(`Problems cache read failed, regenerating: ${$.PROBLEMS_CACHE_PATH}\n${(err as Error).message}`);
		}
	}

	const problem = await getProblemData(problemName, titleSlug);
	writeFileSync($.PROBLEMS_CACHE_PATH, JSON.stringify({ value: { [titleSlug]: problem } }, null, 2));
	return buildProblemHTML(problem);
}

// * ─── Ollama ───────────────────────────────────────────────────────────────────

/**
 * Sends a prompt to the Ollama API using the specified model and returns the response text.
 *
 * @param model - Name of the model.
 * @param prompt - Prompt message.
 * @throws {Error} If the API request fails or returns a non-OK status.
 * @returns The response string from the model.
 */
export async function runOllama(model: string, prompt: string): Promise<string> {
	const res = await fetch($.OLLAMA_API, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ model, prompt, stream: false }),
	});

	if (!res.ok) {
		throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
	}

	const data = await res.json();
	return data.response;
}
