#!/bin/bash

# ! Run from inside the project folder (e.g., Two Sum/)

set -e

PROJECT_DIR="C#"

# ? Removes existing C# folders
trash -f "$PROJECT_DIR"

# ? Create the C# folder and move into it
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# ? Create the .NET console project (outputs files directly here, no subfolder)
dotnet new console -n "C#" --output .

# ? Create the solution file
dotnet new sln -n "C#" --format sln

# ? Add the project to the solution
dotnet sln "C#.sln" add "C#.csproj"

# ? Delete Program.cs
rm Program.cs

# ? Create Solution.cs
touch Solution.cs

echo "✅ C# project created at $(pwd)"