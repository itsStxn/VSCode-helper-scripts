import { addProblemReadme, ask, clear, createClassFile, exit, inspectClassFile, log, navigate } from './helpers.mjs';
import { basename, existsSync } from './imports.mjs';

// * ─── Initialise ───────────────────────────────────────────────────────────────

clear();
await log('Adding class file to coding problem folder...');

const { language, problemDir, classPath } = await navigate();

// * ─── Create or update ─────────────────────────────────────────────────────────

if (existsSync(classPath)) {
	const { choice } = await ask().prompt([
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
} else {
	await createClassFile(classPath, language);
	await log(`✅ Class created: ${classPath}`);
	await inspectClassFile(classPath);

  // * ─── Follow-up ──────────────────────────────────────────────────────────────

	const { choice } = await ask().prompt([
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