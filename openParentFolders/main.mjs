#!/usr/bin/env node
import readline from "node:readline";
import { exec } from "node:child_process";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.question("Enter number of parent folders to open: ", (n) => {
	n = Number.parseInt(n, 10);
	if (Number.isNaN(n) || n < 1) {
		console.error("Invalid number");
		rl.close();
		return;
	}

	const up = new Array(n).fill("..").join("/");
	const cmd = `code ${up}`;
	console.log(`\n→ Running: ${cmd}\n`);
	exec(cmd);
	rl.close();
});
