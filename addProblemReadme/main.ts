import {
	navigate,
	askProceed,
	askOpenReadme,
	openReadme,
	createReadme,
	detectCode,
	getProblemDescReadme,
	getProblemDescCached,
	getReferences,
	buildPrompt,
	runOllama,
	exit,
	log,
	clear,
} from './helpers.js';
import { MODEL } from './constants.js';
import { basename, existsSync, join } from './imports.js';

// * ─── Initialise ───────────────────────────────────────────────────────────────

clear();
await log('Adding coding problem README.md...');

// * ─── Resolve target directory ─────────────────────────────────────────────────

const dir          = await navigate();
const problemName  = basename(dir);
const readmePath   = join(dir, 'README.md');
const readmeExists = existsSync(readmePath);

await log(
	readmeExists
		? `Found README.md at: ${readmePath}`
		: `No README.md found at: ${readmePath}`,
);

// * ─── Confirm before proceeding ────────────────────────────────────────────────

if (!await askProceed()) exit('No changes made.').ok();

// * ─── Gather inputs ────────────────────────────────────────────────────────────

const code = detectCode(dir);
if (!code) exit(`No code detected at: ${dir}`).bad();

const problemDesc = readmeExists
	? getProblemDescReadme(readmePath)
	: await getProblemDescCached(problemName);

if (!problemDesc) {
	exit(
		readmeExists
			? `No coding problem detected at: ${readmePath}`
			: `Failed to fetch problem description — check cache or LeetCode API connectivity.`,
	).bad();
}

const { instructions, templates } = getReferences();
if (!instructions || !templates) exit(`Missing markdown references at: ${join(dir, 'md')}`).bad();

// * ─── Generate and write README ────────────────────────────────────────────────

const prompt  = buildPrompt(instructions, templates, problemDesc, code);
const result  = await runOllama(MODEL, prompt);
await createReadme(readmePath, result);

// * ─── Optionally open README ───────────────────────────────────────────────────

if (await askOpenReadme()) openReadme(readmePath);
