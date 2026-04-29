#!/bin/bash

# ! Adds a class file to a project folder (e.g., Two Sum/)

set -e

COMMAND_DIR="$HOME/Dev/vscode/injections/ts/addProblemClass"

npx tsx "$COMMAND_DIR"/main.ts --currentBase
