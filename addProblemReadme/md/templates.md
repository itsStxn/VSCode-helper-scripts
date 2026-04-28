# TEMPLATES

These are the canonical templates needed for generating the content of `README.md`. Copy the appropriate template and fill in every section. Do not omit sections, reorder them, or rename headings.

---

## Template A — Single Approach

Use this when all code files in **SOLUTION** (see down below) implement the same underlying algorithm.

```markdown
# {Problem Title}

## Description

{Full problem description. Reconstruct it faithfully from **CODING PROBLEM** (see down below). Write in prose. Do not use bullet points here.}

### Example 1

***Input***: {input as shown on the problem in **CODING PROBLEM** (see down below)}  
***Output***: {output}  
***Explanation***: {explanation, or omit this line if the problem provides none}  

### Example 2

***Input***: {input}  
***Output***: {output}  
***Explanation***: {explanation}  

### Example {n}

***Input***: {input}  
***Output***: {output}  
***Explanation***: {explanation}  

### Constraints

- {constraint 1, verbatim from the problem}
- {constraint 2}
- {constraint n}

## Strategy

{Explain the algorithmic strategy in 2–4 paragraphs. Cover:
- The key insight that makes the approach work
- Why a naive approach would be worse (if relevant)
- How the data structure or algorithm maps onto the problem
- Any edge cases the implementation must handle

Use ***bold italic*** for the single most important insight.
Use **bold** for algorithm/data structure names and key constraint values.
Use *italic* for specific variable names referenced in prose.
Use `backticks` for any token that appears literally in code.}

## Time Complexity - O({complexity class})

{Justify the complexity. Name the loop, recursion, or operation that dominates. Example: "We iterate through the array once with a single `for` loop, performing O(1) hash map lookups at each step, giving **O(n)** overall."}

## Space Complexity - O({complexity class})

{Justify the complexity. Name the data structure that grows with input size. Example: "In the worst case the **hash map** stores all *n* elements before a pair is found, giving **O(n)** auxiliary space."}
```

---

## Template B — Multiple Approaches

Use this when **SOLUTION** (see down below) has two or more code files (even within the same language, or across language sections) implement meaningfully different algorithms. The number of approaches is determined by algorithmic distinctness, not by language count.

```markdown
# {Problem Title}

## Description

{Full problem description. Same rules as Template A.}

### Example 1

***Input***: {input}  
***Output***: {output}  
***Explanation***: {explanation}  

### Example 2

***Input***: {input}  
***Output***: {output}  
***Explanation***: {explanation}  

### Example {n}

***Input***: {input}  
***Output***: {output}  
***Explanation***: {explanation}  

### Constraints

- {constraint 1}
- {constraint 2}
- {constraint n}

## Strategy

{One short paragraph (2–4 sentences) framing the problem and why multiple approaches exist. Do not describe the individual approaches here — that belongs in the subsections below. Example: "This problem can be solved at different efficiency levels depending on the data structures chosen. The approaches below progress from a straightforward but slower method to an optimised solution."}

### Approach 1 — {Short Descriptive Name}

{Describe Approach 1 in 2–4 paragraphs. Same depth and formatting rules as Template A's Strategy section. Use ***bold italic*** for the key insight.}

### Approach 2 — {Short Descriptive Name}

{Describe Approach 2 in 2–4 paragraphs.}

### Approach {n} — {Short Descriptive Name}

{Describe Approach n.}

## Time Complexity

### Approach 1 — O({complexity class})

{Justify the complexity for Approach 1.}

### Approach 2 — O({complexity class})

{Justify the complexity for Approach 2.}

### Approach {n} — O({complexity class})

{Justify the complexity for Approach n.}

## Space Complexity

### Approach 1 — O({complexity class})

{Justify the space complexity for Approach 1.}

### Approach 2 — O({complexity class})

{Justify the space complexity for Approach 2.}

### Approach {n} — O({complexity class})

{Justify the space complexity for Approach n.}
```

---

## Filling-in rules

| Placeholder | Rule |
|---|---|
| `{Problem Title}` | Exact title from the problem in **CODING PROBLEM** (see down below), title-cased |
| `{Full problem description}` | Faithful reconstruction — do not paraphrase or shorten |
| `{input}` / `{output}` | Copy verbatim from the problem in **CODING PROBLEM** (see down below) |
| `{explanation}` | Copy verbatim; omit the `***Explanation***` line entirely if the problem in **CODING PROBLEM** (see down below) provides none for that example |
| `{constraint}` | Copy verbatim, including mathematical notation such as `1 <= n <= 10^5` |
| `{complexity class}` | Fill in the actual Big-O class — never leave as `?` or a generic placeholder |
| `{Short Descriptive Name}` | Name the approach by its key idea, e.g. "Brute Force", "Hash Map", "Two Pointers", "Binary Search", "Sliding Window" |

---

## Approach-count decision guide

Ask these questions in order:

1. **Are there explicit labels?** — Comments like `// Approach 1`, file names like `BruteForce.cs`, or class names like `AlternativeSolution` → count as stated.

2. **Are the data structures fundamentally different?** — A solution using a `HashSet` versus one using a sorted array + binary search → different approaches.

3. **Is the time complexity different?** — O(n²) brute force versus O(n log n) sort-based versus O(n) hash-map solution → each is a distinct approach.

4. **Is it just a different language?** — The same algorithm in C# and Python → single approach. Do not split by language.

When in doubt, err toward fewer approaches: only split if the difference is algorithmically meaningful, not stylistic.

---

## Completed example — Single Approach

The following is a correct, finished README for "Two Sum" as a reference for tone, depth, and formatting.

```markdown
# Two Sum

## Description

Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. You may assume that each input has exactly one solution, and you may not use the same element twice. The answer can be returned in any order.

### Example 1

***Input***: `nums = [2,7,11,15]`, `target = 9`  
***Output***: `[0,1]`  
***Explanation***: Because `nums[0] + nums[1] == 9`, we return `[0, 1]`.  

### Example 2

***Input***: `nums = [3,2,4]`, `target = 6`  
***Output***: `[1,2]`  

### Example 3

***Input***: `nums = [3,3]`, `target = 6`  
***Output***: `[0,1]`  

### Constraints

- `2 <= nums.length <= 10^4`
- `-10^9 <= nums[i] <= 10^9`
- `-10^9 <= target <= 10^9`
- Only one valid answer exists.

## Strategy

The naive approach would check every pair of indices in two nested loops, yielding **O(n²)** time. The optimised strategy avoids this by recognising that for each element *x* we do not need to search the whole array for its complement — ***we only need to know whether `target - x` has already been seen***.

We maintain a **hash map** that maps each value we have encountered to its index. As we iterate through `nums` with index *i*, we compute the complement `target - nums[i]` and check the map in **O(1)**.If the complement is present, we immediately return its stored index alongside *i*. If not, we insert `nums[i] → i` into the map and continue.

This single-pass approach works because any valid pair *(i, j)* with *i < j* will be found the moment we reach index *j*: by then, `nums[i]` is already in the map.

## Time Complexity - O(n)

We traverse the array exactly once. Each iteration performs a constant-time **hash map** lookup and at most one insertion, so the total work is **O(n)**.

## Space Complexity - O(n)

In the worst case — when no pair is found until the very last element — the **hash map** grows to hold all *n* values, giving **O(n)** auxiliary space.
```

---

## References

- **CODING PROBLEM** (see down below)
- **SOLUTION** (see down below)
