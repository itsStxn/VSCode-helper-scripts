import { clear, copyToClipboard, handleExistingClass, handleNewClass, log, navigate } from './helpers.js';
import { basename, existsSync } from './imports.js';

// * ─── Initialise ───────────────────────────────────────────────────────────────

clear();
await log('Adding class file to coding problem folder...');

const { language, problemDir, classPath } = await navigate();

// * ─── Create or update ─────────────────────────────────────────────────────────

if (existsSync(classPath)) {
	await handleExistingClass(classPath, language, problemDir);
} else {
	await handleNewClass(classPath, language, problemDir);
}

await copyToClipboard(basename(problemDir));
