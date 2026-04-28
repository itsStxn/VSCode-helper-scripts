import {
	readdirSync,
	readFileSync,
	statSync,
	inquirer,
	join,
	existsSync,
	writeFileSync,
	execSync,
	readline
} from './imports.mjs';
import * as $ from './constants.mjs';

// * ─── Utilities ────────────────────────────────────────────────────────────────

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
 * @param {string} message - The question to display to the user.
 * @param {boolean} [inverted=false] - If true, displays 'No' first and 'Yes' second; otherwise displays 'Yes' first and 'No' second.
 * @returns {Promise<boolean>} A promise that resolves to true if the user selects 'Yes', false if 'No'.
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

// * ─── Terminal ─────────────────────────────────────────────────────────────────

/**
 * Clears the terminal screen and moves the cursor to the top-left position.
 * @returns {void}
 */
export function clear() {
	readline.cursorTo(process.stdout, 0, 0);
	readline.clearScreenDown(process.stdout);
}

/**
 * Pauses execution for a specified duration.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logs a message to the console with a prefix and applies a delay.
 * @param {string} msg - The message to log
 * @returns {Promise<void>} A promise that resolves after the log delay
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
 * Returns the inquirer instance, optionally clearing the console first.
 * @returns {Object} The inquirer instance
 */
export function ask() {
	if ($.INQUIRER_CLEAR_FIRST) clear();
	return inquirer;
}

// * ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * Navigates through directories interactively, allowing the user to select subdirectories
 * or move to parent directories until they choose to stop.
 *
 * @async
 * @function navigate
 * @returns {Promise<string>} The absolute path of the selected directory
 * @throws {Error} If directory reading fails or user interaction is interrupted
 *
 * @description
 * Starts from the base directory ($.BASE_DIR) and presents an interactive prompt
 * allowing the user to:
 * - Select "This" to return the current directory
 * - Select "Parent" to move to the parent directory
 * - Select any subdirectory to navigate into it
 *
 * The navigation continues in a loop until the user selects "This", at which point
 * the current directory path is returned. Hidden files and directories (starting with '.')
 * are filtered out from the choices.
 *
 * @example
 * const selectedDir = await navigate();
 * console.log(selectedDir); // /path/to/selected/directory
 */
export async function navigate() {
	let currentDir = $.BASE_DIR;

	while (true) {
		const subdirs = readdirSync(currentDir).filter(
			(entry) => !entry.startsWith('.') && statSync(join(currentDir, entry)).isDirectory()
		);

		const { choice } = await ask().prompt([
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
 * @async
 * @returns {Promise<boolean>} A promise that resolves to true if the user confirms, false otherwise.
 */
export function askProceed() {
	return promptBinary('Add/update README:');
}

/**
 * Prompts the user with a binary yes/no question to open the README file.
 * @async
 * @function askOpenReadme
 * @returns {Promise<boolean>} A promise that resolves to true if the user chooses to open the README, false otherwise.
 */
export function askOpenReadme() {
	return promptBinary('Open README:');
}

/**
 * Opens a file in Visual Studio Code.
 * @param {string} filePath - The path to the file to open in VS Code
 * @returns {void}
 */
export function openReadme(filePath) {
	execSync(`code "${filePath}"`);
}

/**
 * Creates a README file at the specified file path with the given content.
 * @async
 * @function createReadme
 * @param {string} filePath - The file path where the README will be created.
 * @param {string} content - The content to write to the README file.
 * @returns {Promise<void>} A promise that resolves when the README is created and logged.
 */
export async function createReadme(filePath, content) {
	writeFileSync(filePath, content);
	await log(`✅ README created at: ${filePath}`);
}

// * ─── Clipboard ───────────────────────────────────────────────────────────

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

// * ─── Gathering code ───────────────────────────────────────────────────────────

/**
 * Detects and extracts code files from a specified location, organizing them by programming language.
 * 
 * @param {string} location - The root directory path to scan for language subdirectories.
 * @returns {string} A markdown-formatted string containing code blocks organized by language and file.
 *                   Returns an empty string if no valid language directories or code files are found.
 * 
 * @throws {Error} If a code file exists but is empty.
 * 
 * @example
 * const readme = detectCode('./solutions');
 * // Returns markdown with sections like:
 * // ## JavaScript
 * // ### solution.js
 * // ```javascript
 * // ... code content ...
 * // ```
 */
export function detectCode(location) {
	const langs = readdirSync(location).filter(
		(entry) => entry in $.LANG_CONFIG && statSync(join(location, entry)).isDirectory()
	);

	if (!langs.length) return '';

	const sections = langs.map((lang) => {
		const langDir = join(location, lang);
		const files = readdirSync(langDir).filter((f) => f.endsWith($.LANG_CONFIG[lang].classExt));

		if (!files.length) return null;

		const langLabel = lang.toLowerCase().replace('#', 'sharp');

		const codeBlocks = files.map((file) => {
			const filePath = join(langDir, file);
			const code = readFileSync(filePath, 'utf-8').trim();
			if (!code) throw new Error(`${file} is empty at: ${filePath}`);
			return `### ${file}\n\n\`\`\`${langLabel}\n${code}\n\`\`\``;
		});

		return `## ${lang}\n\n${codeBlocks.join('\n\n')}`;
	});

	return sections.filter(Boolean).join('\n\n').trim();
}

// * ─── Validation ───────────────────────────────────────────────────────────

/**
 * Validates whether a string qualifies as a valid coding problem description based on predefined patterns and length constraints.
 * @param {string} text - The text to validate as a coding problem description.
 * @returns {boolean} True if the text matches all coding problem description patterns and falls within the specified length range, false otherwise.
 */
function isProblemDesc(text) {
	return $.PROBLEM_DESC_PATTERNS.every(pattern => pattern.test(text));
}

// * ─── Problem Description ──────────────────────────────────────────────────────

/**
 * Extracts and validates a problem description from the clipboard with user confirmation.
 * @async
 * @returns {Promise<string>} The validated problem description from the clipboard
 * @throws Will continue prompting until a valid description is confirmed
 * @description
 * Repeatedly prompts the user to confirm clipboard content as a problem description.
 * Validates that:
 * - The description hasn't changed since retrieval
 * - The description is not empty
 * - The content is recognized as a valid problem description (not just a title)
 * Logs appropriate status messages for each validation failure and retries.
 * Upon successful validation, logs acceptance, clears the clipboard, and returns the description.
 */
async function extractProblemDesc() {
	const max = $.PROBLEM_DESC_PREVIEW_LEN;
	const truncate = text =>
		text.length > max ? `${text.slice(0, max)}...` : text;

	while (true) {
		const text = getClipboard();
		const { ok } = await ask().prompt([
			{
				type: 'confirm',
				name: 'ok',
				message: `(Press Enter to confirm) Description from clipboard:\n${truncate(text)}`,
				default: true,
			},
		]);
		
		if (!ok) continue;

		if (text !== getClipboard())  { await log($.STATUS.descChanged);  continue; }
		if (text.length === 0)        { await log($.STATUS.descEmpty);    continue; }
		if (!isProblemDesc(text))     { await log($.STATUS.descIsTitle);  continue; }

		await log($.STATUS.descAccepted);
		await emptyClipboard();
		clear();
		return text;
	}
}

/**
 * Extracts problem description from a file and formats it as an HTML code block.
 * 
 * @param {string} filePath - The file path to read the problem description from
 * @returns {string} An HTML code block containing the problem description wrapped in `<html><body><p>` tags,
 *                   or an empty string if the file doesn't contain the problem description separator
 * 
 * @example
 * const readme = getProblemDescReadme('/path/to/problem.txt');
 * // Returns: "```html\n<html><body><p>Problem description here</p></body></html>\n```"
 */
export function getProblemDescReadme(filePath) {
	const content = readFileSync(filePath, 'utf-8').trim();
	if (!content?.includes($.PROBLEM_DESC_SEP)) return '';

	const desc = content.split($.PROBLEM_DESC_SEP)[0].trim();
	const page = `<html><body><p>${desc}</p></body></html>`;
	return `\`\`\`html\n${page}\n\`\`\``;
}

// * ─── References & Prompt ─────────────────────────────────────────────────────

/**
 * Reads and returns the contents of the instructions and templates files.
 *
 * @returns {{ instructions: string, templates: string }} An object containing the trimmed contents of the instructions and templates files.
 */
export function getReferences() {
	const instructions = readFileSync($.INSTRUCTIONS_PATH, 'utf-8').trim();
	const templates    = readFileSync($.TEMPLATES_PATH, 'utf-8').trim();
	return { instructions, templates };
}

/**
 * Builds a formatted prompt string by combining instructions, templates, problem description, and code.
 *
 * @param {string} instructions - The instructions to include at the top of the prompt.
 * @param {string} templates - The code templates or examples to include.
 * @param {string} problemDesc - The description of the coding problem.
 * @param {string} code - The solution code to include.
 * @returns {string} The formatted prompt string.
 */
export function buildPrompt(instructions, templates, problemDesc, code) {
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
 * Fetches a mapping of LeetCode question titles to their corresponding slugs.
 *
 * Sends a GraphQL POST request to the LeetCode endpoint specified by `$.LEETCODE_GRAPHQL`
 * and retrieves all question titles and their slugs. Returns an object where each key is
 * a lowercased question title and each value is the corresponding title slug.
 *
 * @async
 * @returns {Promise<Object<string, string>>} A promise that resolves to an object mapping
 *   lowercased question titles to their title slugs.
 * @throws {Error} If the fetch request fails or the response is invalid.
 */
async function fetchSlugMap() {
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

	const data = await res.json();

	return Object.fromEntries(
		data.data.allQuestionsRaw.map((q) => [q.title.toLowerCase(), q.titleSlug])
	);
}

/**
 * Retrieves a cached slug map from disk if available and not forced to refresh.
 * If the cache is missing, empty, or forceRefresh is true, fetches a new slug map,
 * writes it to the cache, and returns it.
 *
 * @param {boolean} forceRefresh - If true, bypasses the cache and fetches a fresh slug map.
 * @returns {Promise<Object>} The slug map object.
 */
async function getSlugMapCached(forceRefresh) {
	if (!forceRefresh && existsSync($.SLUG_CACHE_PATH)) {
		try {
			const stats = statSync($.SLUG_CACHE_PATH);
			if (stats.size > 0) {
				const { value } = JSON.parse(readFileSync($.SLUG_CACHE_PATH, 'utf-8'));
				return value;
			}
		} catch (err) {
			await warn(`Slug cache read failed, regenerating: ${$.SLUG_CACHE_PATH}\n${err.message}`);
		}
	}

	const value = await fetchSlugMap();
	writeFileSync($.SLUG_CACHE_PATH, JSON.stringify({ value }, null, 2));
	return value;
}

/**
 * Converts a title string into a URL-friendly slug.
 *
 * @function
 * @param {string} title - The input string to slugify.
 * @returns {string} A lowercase, hyphen-separated slug.
 */ 
function slugify(title) {
	return title
		// ? Normalize accents (é → e, etc.)
		.normalize("NFKD")
		.replaceAll(/[\u0300-\u036f]/g, "")

		// ? Lowercase
		.toLowerCase()

		// ? Remove apostrophes
		.replaceAll(/[’']/g, "")

		// ? Replace non-alphanumeric characters with spaces
		.replaceAll(/[^a-z0-9]+/g, " ")

		// ? Trim and replace spaces with hyphens
		.trim()
		.replaceAll(/\s+/g, "-");
}

/**
 * Converts a problem name into a slug using a cached slug map, falling back to slug generation if not found.
 *
 * @async
 * @param {string} problemName - The name of the problem to convert.
 * @param {boolean} forceRefresh - Whether to force refresh the cached slug map.
 * @returns {Promise<string>} The resolved slug.
 * @throws {Error} If retrieving the slug map or logging fails.
 */
async function toSlug(problemName, forceRefresh) {
	const slugMap = await getSlugMapCached(forceRefresh);
	const key = problemName.toLowerCase().trim();

	if (!Object.hasOwn(slugMap, key)) {
		const titleSlug = slugify(problemName);
		await warn(`No mapped slug found for "${problemName}" (searched as: ${key}). Using "${titleSlug}" instead.`);
		return titleSlug;
	}

	return slugMap[key];
}

/**
 * Fetches the title and content of a LeetCode problem by its title slug.
 *
 * @async
 * @param {string} titleSlug - The slug identifier of the LeetCode problem.
 * @returns {Promise<{ content: string }>} An object containing the problem's content.
 * @throws {Error} If the problem is not found for the given slug.
 */
async function fetchProblemDesc(titleSlug) {
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

	const data = await res.json();
	if (!data?.data?.question) {
		throw new Error(`Problem not found for slug: "${titleSlug}".`);
	}

	return data.data.question;
}

/**
 * Builds an HTML page string with the given title and content, wrapped in a Markdown HTML code block.
 *
 * @param {Object} params - The parameters for building the HTML.
 * @param {string} params.title - The title to display in the HTML page.
 * @param {string} params.content - The HTML content to include in the body.
 * @returns {string} The formatted HTML page as a Markdown code block, or an empty string if content is falsy.
 */
function buildProblemHTML({ title, content }, wrapContent = false) {
	if (!content) return '';
	const tryWrap = () => content.startsWith('<p>') ? content : `<p>${content}</p>`;
	const page = `<html><body><h1>${title}</h1>${tryWrap()}</body></html>`;
	return `\`\`\`html\n${page}\n\`\`\``;
}

/**
 * Retrieves problem data using a title slug, with a fallback to manual extraction if fetching fails.
 *
 * @param {string} problemName - The human-readable name of the problem.
 * @param {string} titleSlug - The unique identifier used to fetch the problem description.
 * @returns {Promise<{ title: string, content: string }>} A promise that resolves to an object containing
 * the problem title and its description content.
 */
async function getProblemData(problemName, titleSlug) {
	try {
		const res = await fetchProblemDesc(titleSlug);
		return {
			title: problemName,
			content: res.content,
		};
	} catch (err) {
		await warn(err.message);
		await log(`Copy the problem's description.`);
		const fallbackContent = await extractProblemDesc(); 

		return {
			title: problemName,
			content: fallbackContent,
		};
	}
}

/**
 * Retrieves the HTML description of a problem, using either a cached value (if available) or a prompt.
 * If a problem title is not found, it prompts the user to provide the problem description. 
 * Prompts the user to optionally force a cache refresh. If the cache exists and is valid,
 * it will use the cached description or fetch and update the cache as needed.
 * If the cache is missing or invalid, fetches the problem description and rebuilds the cache.
 *
 * @async
 * @param {string} problemName - The human-readable name of the problem to retrieve.
 * @returns {Promise<string>} The HTML representation of the problem description.
 */
export async function getProblemDescCached(problemName) {
	const forceRefresh = await promptBinary('Rebuild cache:', true);
	const titleSlug = await toSlug(problemName, forceRefresh);

	if (!forceRefresh && existsSync($.PROBLEMS_CACHE_PATH)) {
		try {
			const stats = statSync($.PROBLEMS_CACHE_PATH);
			if (stats.size > 0) {
				const { value: cachedMap } = JSON.parse(readFileSync($.PROBLEMS_CACHE_PATH, 'utf-8'));

				if (!Object.hasOwn(cachedMap, titleSlug)) {
					cachedMap[titleSlug] = await getProblemData(problemName, titleSlug);
					writeFileSync($.PROBLEMS_CACHE_PATH, JSON.stringify({ value: cachedMap }, null, 2));
				}

				return buildProblemHTML(cachedMap[titleSlug]);
			}
		} catch (err) {
			await warn(`Problems cache read failed, regenerating: ${$.PROBLEMS_CACHE_PATH}\n${err.message}`);
		}
	}

	const problem = await getProblemData(problemName, titleSlug);
	writeFileSync($.PROBLEMS_CACHE_PATH, JSON.stringify({ value: { [titleSlug]: problem } }, null, 2));
	return buildProblemHTML(problem);
}

// * ─── Ollama ───────────────────────────────────────────────────────────────────

/**
 * Sends a prompt to the Ollama API using the specified model and returns the response.
 *
 * @async
 * @param {string} model - The name of the model to use for generating the response.
 * @param {string} prompt - The prompt or input text to send to the model.
 * @returns {Promise<string>} The generated response from the Ollama API.
 * @throws {Error} If the Ollama API request fails or returns a non-OK status.
 */
export async function runOllama(model, prompt) {
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
