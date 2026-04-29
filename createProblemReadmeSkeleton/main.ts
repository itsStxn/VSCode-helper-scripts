import { existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
});

const readmePath = join(process.cwd(), "README.md");

if (existsSync(readmePath)) {
	console.log("README.md already exists. Aborting.");
	rl.close();
	process.exit(0);
}

rl.question("Enter problem title: ", (title) => {
	const content = `# ${title}

## Description

### Example 1

***Input***: text  
***Output***: text  
***Explanation***: text  

### Constraints

- Text
- Text
- Text

## Strategy

## Time Complexity - O(text)

## Space Complexity - O(text)
`;

	writeFileSync(readmePath, content, "utf8");
	console.log("README.md created successfully.");
	rl.close();
});
