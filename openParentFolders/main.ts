import readline from 'node:readline';
import { exec } from 'node:child_process';

const rl = readline.createInterface({
	input:  process.stdin,
	output: process.stdout,
});

rl.question('Enter number of parent folders to open: ', (answer) => {
	const n = Number.parseInt(answer, 10);

	if (Number.isNaN(n) || n < 1) {
		console.error('Invalid number');
		rl.close();
		return;
	}

	const path = new Array(n).fill('..').join('/');
	const cmd  = `code ${path}`;

	console.log(`\n→ Running: ${cmd}\n`);
	exec(cmd);
	rl.close();
});
