import {
	ask,
	log,
	clear,
	getTitle,
	createSolutionFile,
	runSetupScript,
	inspectSolutionFile,
	addProblemReadme,
	emptyClipboard,
	exit,
	navigate,
	addProblemClass,
} from './helpers.mjs';
import * as $ from './constants.mjs';
import { existsSync, mkdirSync, join } from './imports.mjs';

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

// * ─── Create or update ─────────────────────────────────────────────────────────

if (existsSync(languageDir)) {
	const { choice } = await ask().prompt([
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

	const added = await addProblemClass(languageDir);
	if (!added) await addProblemReadme(problemDir);
} else {
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

	const added = await addProblemClass(languageDir);
	if (!added) await addProblemReadme(problemDir);
}
