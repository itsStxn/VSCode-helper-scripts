# VSCode Coding Problem Helpers

This repository contains a collection of small Node.js automations that make trivial tasks for me, like **creating**, **managing**, and **documenting** coding‑problem folders directly from VS Code.

The scripts are intended to be run via the VS Code UI (e.g. clicking a button provided by a custom extension) but they work perfectly from the terminal as well.

---

## Table of Contents
- [VSCode Coding Problem Helpers](#vscode-coding-problem-helpers)
	- [Table of Contents](#table-of-contents)
	- [Features](#features)
	- [Folder Structure](#folder-structure)
	- [Scripts](#scripts)
		- [`addProblemClass`](#addproblemclass)
		- [`addProblemReadme`](#addproblemreadme)
		- [`createProblemFolder`](#createproblemfolder)
		- [`createGitignore`](#creategitignore)
		- [`openParentFolders`](#openparentfolders)
		- [`createProblemReadmeSkeleton`](#createproblemreadmeskeleton)
	- [Configuration \& Constants](#configuration--constants)
	- [How it works](#how-it-works)

---

## Features
- **Interactive prompts** using `inquirer` to guide you through folder creation.
- **Clipboard‑driven**: copy a problem title or solution code and the tools will validate and inject it.
- **Automatic README generation** for LeetCode problems (fetches description via the LeetCode GraphQL API, falls back to clipboard if offline).
- **Class & solution scaffolding** with language‑specific templates.
- **Convenient UI helpers** – open a chain of parent folders in VS Code, generate a comprehensive `.gitignore`.

---

## Folder Structure
```
js/
├─ addProblemClass/           # Add a new class file to an existing problem
│   ├─ main.mjs
│   ├─ helpers.mjs
│   └─ templates/…
├─ addProblemReadme/          # Build a README.md for a problem (uses Ollama/LeetCode)
├─ createProblemFolder/       # Create a new problem folder with solution stub
├─ createGitignore/           # Generate a full‑featured .gitignore
├─ openParentFolders/          # Open N parent directories in VS Code
└─ createProblemReadmeSkeleton/ # Quick README skeleton for manual editing
```

---

## Scripts
### `addProblemClass`
**Purpose**: Add or update a class file inside an existing problem folder.

**How to use**
1. Copy the class code to your clipboard.
2. Run the script (`node addProblemClass/main.mjs`).
3. Choose the target language and directory (the script walks the problem hierarchy).
4. If the file already exists you can **Update** it or **Update + regenerate README**.

The script validates the clipboard content, prepends a language‑specific template and writes the file.

---
### `addProblemReadme`
**Purpose**: Generate a fully‑filled `README.md` for a problem.

**How it works**
- Detects the problem folder.
- Retrieves the problem description either from LeetCode (via GraphQL) **or** from the clipboard.
- Detects existing solution code files and bundles them as markdown code blocks.
- Sends a prompt to an Ollama model (`gpt‑oss:120b-cloud`) to craft the final README.
- Optionally opens the newly created file in VS Code.

---
### `createProblemFolder`
**Purpose**: Initialise a new coding‑problem directory.

**Steps**
1. (Optional) Copy a problem title to the clipboard – the script will detect it.
2. Run `node createProblemFolder/main.mjs`.
3. Answer the interactive prompts for **category**, **difficulty**, **language**.
4. The script creates the folder hierarchy, runs a language‑specific setup script (e.g. creates a `src` folder), writes a solution stub, and optionally adds a class and a README.

---
### `createGitignore`
**Purpose**: Create a comprehensive `.gitignore` at the repository root.

Simply run the script – it will abort if a `.gitignore` already exists.

---
### `openParentFolders`
**Purpose**: Quickly open a chain of parent directories in VS Code.

Run the script, enter the number of levels you want to go up and it will execute `code ../../..` for you.

---
### `createProblemReadmeSkeleton`
**Purpose**: Scaffold a minimal README with placeholders for description, examples, and complexity notes.

The script asks for a problem title and writes `README.md` in the current working directory.

---
## Configuration & Constants
Each module has a `constants.mjs` that defines:
- `LANG_CONFIG` – supported languages (`C#`, `Python`, `Typescript`) and file extensions.
- `LOG_DELAY` – artificial delay for nicer terminal output.
- Paths for templates, caches, LeetCode GraphQL endpoint, Ollama API, etc.

You can customise these files to add more languages or change the Ollama endpoint.

---
## How it works
All scripts share a common set of utilities (`helpers.mjs` & `imports.mjs`) that provide:
- **Terminal helpers** (`log`, `clear`).
- **Clipboard handling** (`wl-paste` / `wl-copy`).
- **Interactive prompts** via `inquirer`.
- **File system helpers** for reading/writing and navigating the problem hierarchy.
- **LeetCode integration** – fetches problem description and caches it locally (`problems_cache.json`).
- **Ollama integration** – generates human‑readable READMEs.
