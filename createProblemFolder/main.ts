import {
	log,
	clear,
	getTitle,
	emptyClipboard,
	navigate,
	handleExistingProject,
	handleNewProject,
	checkProblemCategoryReadme,
	updateProblemCategoryCache,
	updateProblemCategoryReadme,
	copyToClipboard,
} from './helpers.js';
import * as $ from './constants.js';
import { existsSync, join } from './imports.js';

// * ─── Initialise ───────────────────────────────────────────────────────────────

clear();
await log('Creating coding problem folder...');

const detectedTitle = getTitle($.TITLE_MIN_LEN, $.TITLE_MAX_LEN);
if (detectedTitle) emptyClipboard();

// * ─── Resolve paths ────────────────────────────────────────────────────────────

const { title, category, difficulty, language } = await navigate(detectedTitle);

const problemDir   = join($.BASE_DIR, category, difficulty, title.trim());
const languageDir  = join(problemDir, language);
const solutionPath = join(languageDir, $.LANG_CONFIG[language].solution);

// * ─── Prepare problem category README.md ───────────────────────────────────────

checkProblemCategoryReadme(category);
const cache = await updateProblemCategoryCache(category, difficulty, title);

// * ─── Create or update ─────────────────────────────────────────────────────────

if (existsSync(languageDir)) {
	await handleExistingProject(languageDir, solutionPath, problemDir, language);
} else {
	await handleNewProject(problemDir, languageDir, solutionPath, language);
}

await updateProblemCategoryReadme(category, cache);
await copyToClipboard(title);
