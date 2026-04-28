# INSTRUCTIONS

You are helping an aspiring software engineer document their LeetCode and NeetCode solutions. Your job is to write the content of a README.md that is thorough, precise, and pedagogically valuable — not just a summary, but a document the engineer can study later to recall both the problem and why the solution works.

## Step-by-step workflow

Follow these steps in order.

### Step 1 — Read the fetched problem

Retrieve and extract the complete problem statement from the provided webpage’s HTML content in **CODING PROBLEM** (see down below). Ensure all relevant text, formatting, and sections are accurately captured. Extract **all** of the following:

- The exact problem title
- The full description (do not paraphrase; reconstruct it faithfully)
- Every example (Input / Output / Explanation)
- Every constraint listed under "Constraints"
- -Every follow-up question

As previously mentioned, the webpage’s HTML content is provided in **CODING PROBLEM** (see down below).
> **Note**: **Ignore** garbage text like the coding problem number, company tags, difficulty (easy, medium, hard), topics, "hints" or "premium lock", etc. **Only retrieve and extract text that is relevant to the coding problem**.

### Step 2 — Read all code files

Read the provided code in **SOLUTION** (see down below). Pay close attention to:

- **Class/method names and structure** — do different files represent different approaches, or are they the same algorithm in different languages?
- **Comments inside the code** — the engineer may label approaches explicitly (e.g. `// Approach 1: Brute Force`, `# Approach 2: Sliding Window`)
- **File names** — names like `BruteForce.cs` vs `Optimized.cs` signal distinct approaches
- **Algorithmic structure** — even without labels, fundamentally different algorithms (e.g. one using a hash map, one using two pointers) count as different approaches

> **Critical distinction:** The same algorithm written in C# *and* Python is ONE approach in two languages, NOT two approaches. Only count an approach as distinct if the underlying algorithm or data structure strategy differs meaningfully.

### Step 3 — Determine approach count

- **Single approach** → use the Single-Approach from **TEMPLATES** (see down below)
- **Two or more approaches** → use the Multi-Approach from **TEMPLATES** (see down below)

As just mentioned, both templates are defined in **TEMPLATES** (see down below). Read that now.

### Step 4 — Write the README.md

Follow the chosen template exactly. Apply all formatting rules defined below and in **TEMPLATES** (see down below). Write the content for e `README.md` file.

---

## Formatting rules (apply to every README)

These rules are non-negotiable and must be followed precisely.

### Bold and italic emphasis

Use formatting to highlight the ideas a reader should internalize, not for decoration. Apply these consistently:

- `***bold italic***` for the most critical algorithmic insight of each approach (one or two per Strategy section — do not overuse)
- `**bold**` for key data structures, algorithm names, and constraint values (e.g. `**hash map**`, `**two pointers**`, `**O(n)**`)
- `*italic*` for variable names referenced inline in prose (e.g. "we store the complement in *seen*")

### Code spans

Wrap in backticks any token that appears literally in code:

- Variable names: `` `left` ``, `` `right` ``, `` `result` ``
- Data structure literals: `` `{}` ``, `` `[]` ``, `` `None` ``
- Method calls: `` `append()` ``, `` `pop()` ``
- Concrete values: `` `0` ``, `` `true` ``, `` `""` ``
- Type names when referenced as code: `` `int` ``, `` `string` ``

Do **not** wrap general English words (e.g. do not write `` `array` `` when you mean "array" conceptually — only when referring to a specific variable).

Here’s a revised version that explicitly applies to explanations as well and removes any ambiguity:

---

### Code Implementation Blocks

Whenever a problem includes **sequences of operations, method calls, or structured data**, present them using a fenced code block. This applies to **all sections**, especially **Input**, **Output**, and **Explanation**.

Avoid splitting sequences into multiple inline backtick snippets, as this harms readability and flow.

#### Correct Usage

Use a code block for any step-by-step sequence:

````markdown
Explanation:
```plaintext
TimeMap timeMap = new TimeMap();
timeMap.set("foo", "bar", 1);  // store key "foo" with value "bar" at timestamp 1
timeMap.get("foo", 1);         // returns "bar"
```
````

#### Structured Input/Output Sections

Group structured data into a single fenced code block to keep it readable and cohesive:

````markdown
**Input**:
```plaintext
["TimeMap", "set", "get", "set", "get"]
[null, ["foo", "bar", 1], ["foo", 1], ["bar", "foo", 2], ["bar", 2]]
```
````

Avoid splitting related data into separate inline snippets like:

````markdown
**Input**: `["TimeMap", "set", "get", "set", "get"]`
`[null, ["foo", "bar", 1], ["foo", 1], ["bar", "foo", 2], ["bar", 2]]`
````

Keeping everything in one block improves clarity and preserves the relationship between the elements.

#### Explanation Sections

When explaining a sequence of steps or operations, also use a code block instead of inline formatting:

````markdown
Explanation:
```plaintext
timeMap.set("foo", "bar", 1);
timeMap.get("foo", 1);
```
````

#### Key Rules

* Use fenced code blocks (` ```plaintext `) for:

  * Sequences of operations or steps
  * Method/function calls
  * Structured inputs and outputs
  * Examples within explanations
* Do **not** break sequences into multiple inline backtick elements.
* Keep related steps grouped together for clarity and readability.

### Example blocks

Use two trailing spaces after each label line to force a line break in Markdown:

````markdown
***Input***: nums = [2,7,11,15], target = 9  
***Output***: [0,1]  
***Explanation***: Because nums[0] + nums[1] == 9, we return [0, 1].  
````

### Constraints

Render each constraint as a bullet. Preserve the original mathematical notation (e.g. `2 <= nums.length <= 10^4`). Do not paraphrase constraints.

### Complexity headings

Always state the complexity class in the heading itself:

- Single approach: `## Time Complexity - O(n)` (fill in the actual class)
- Multi-approach: `### Approach 1 - O(n log n)` (fill in the actual class)

Never write `O(?)` or leave it as a placeholder.

---

## Quality bar

Before writing content, ask yourself:

1. **Is the Description faithful?** — A reader who has not seen the original problem should understand exactly what is asked.
2. **Is the Strategy educational?** — It should explain *why* the algorithm works, not just *what* it does. Mention the key insight that makes the approach non-obvious.
3. **Is the Complexity justified?** — State the reasoning, not just the answer. Reference the specific loop, recursion depth, or data structure that drives the complexity.
4. **Is the formatting consistent?** — Check that every example uses `***Input***`, `***Output***`, `***Explanation***` with trailing double spaces.

---

## References

- **CODING PROBLEM** (see down below)
- **SOLUTION** (see down below)
- **TEMPLATES** (see down below)
