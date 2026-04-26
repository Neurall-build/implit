<div align="center">
  <img src="logo.jpg" alt="Implit Logo" width="128" height="128">
  <h1>Implit</h1>
  <p>Validate imports and catch fake AI-generated dependencies</p>
</div>

---

# Implit

Validate imports and catch fake AI-generated dependencies before they break your code.

## Why?

LLMs hallucinate. They invent:
- Non-existent npm packages
- Fake functions in local files
- Invalid import paths

Implit catches these **before** you run or commit the code.

## Install

```bash
npx @neurall.build/implit check <file>
```

No installation needed. Works instantly with npx.

## Usage

```bash
# Check a single file
npx @neurall.build/implit check src/index.ts

# Check with fix prompt generation
npx @neurall.build/implit check src/index.ts --fix

# Output as JSON (for CI/CD)
npx @neurall.build/implit check src/index.ts --json

# Clear cache
npx @neurall.build/implit clear-cache
```

## Features

✓ **Dependency Verification** — Checks if npm packages exist
✓ **Built-in Whitelist** — Recognizes Node.js built-ins (fs, path, etc.)
✓ **Local Import Check** — Validates imports from local files
✓ **Caching** — 24-hour TTL for fast repeated checks
✓ **Fix Prompts** — Generates clipboard-ready prompts to feed back to AI
✓ **CI/CD Ready** — JSON output for automation

## Example Output

```
🔍 Checking src/index.ts...

✓ react - Package exists on npm
✓ chalk - Package exists on npm
✓ fs - Node.js built-in module
✓ ./utils/helper - Local file exports the function

✗ awesome-super-api - Package not found in npm registry
✗ ./does-not-exist - Local file not found
```

## How It Works

1. Parses your file using AST (no execution)
2. Extracts all import/require statements
3. Checks external packages against npm registry
4. Validates local imports against your file system
5. Reports problems with clear messages

## License

MIT