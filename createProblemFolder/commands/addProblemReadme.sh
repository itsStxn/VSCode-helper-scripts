#!/bin/bash

# ? Navigate to the project folder (e.g., Two Sum/) -> create README.md

set -e

COMMAND_DIR="$HOME/Dev/vscode/injections/ts/addProblemReadme"

npx tsx "$COMMAND_DIR"/main.ts
