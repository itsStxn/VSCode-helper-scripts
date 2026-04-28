import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const gitignorePath = join(process.cwd(), ".gitignore");

const content = `
############################
# Operating System files
############################
.DS_Store
Thumbs.db
Desktop.ini

############################
# Logs
############################
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

############################
# Dependencies
############################
node_modules/
jspm_packages/
.pnp/
.pnp.js

############################
# Environment variables
############################
.env
.env.*
!.env.example
!.env.template

############################
# Build outputs
############################
dist/
build/
out/
coverage/
*.tsbuildinfo

############################
# Cache
############################
.cache/
.parcel-cache/
.eslintcache
.stylelintcache
.turbo/
.next/
.nuxt/
.vite/

############################
# Testing
############################
coverage/
.nyc_output/

############################
# IDE / Editors
############################
.vscode/
!.vscode/extensions.json
!.vscode/settings.json
.idea/
*.sublime-project
*.sublime-workspace

############################
# TypeScript
############################
*.tsbuildinfo

############################
# Python (if present)
############################
__pycache__/
*.py[cod]
*.pyo
.venv/
venv/
.env/

############################
# Java / Kotlin
############################
*.class
*.jar
*.war
*.ear
target/

############################
# JavaScript / Frameworks
############################
.next/
nuxt/
.svelte-kit/
.angular/
storybook-static/

############################
# Misc
############################
*.swp
*.swo
*.bak
*.tmp
*.old
`.trim();

if (existsSync(gitignorePath)) {
	console.log(".gitignore already exists. No changes made.");
	process.exit(0);
}

writeFileSync(gitignorePath, content + "\n", "utf8");

console.log("Comprehensive .gitignore created at:", gitignorePath);
