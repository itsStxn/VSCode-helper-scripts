#!/bin/bash

# ! Adds a class file to a project folder (e.g., Two Sum/)

set -e

COMMAND_DIR="$HOME/Dev/vscode/injections/js/addProblemClass"

node "$COMMAND_DIR"/main.mjs --currentBase
