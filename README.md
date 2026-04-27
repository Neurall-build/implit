<div align="center">
  <img src="logo.jpg" alt="Implit Logo" width="150" height="150">
  
  # Implit
  
  **Stop AI hallucinations before they break your code**
  
  [![npm version](https://img.shields.io/npm/v/@neurall.build/implit?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@neurall.build/implit)
  [![npm downloads](https://img.shields.io/npm/dt/@neurall.build/implit?style=for-the-badge)](https://www.npmjs.com/package/@neurall.build/implit)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
  [![GitHub stars](https://img.shields.io/github/stars/Neurall-build/implit?style=for-the-badge)](https://github.com/Neurall-build/implit)
  
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square" />
  <img src="https://img.shields.io/badge/Zero_Config-✓-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/Speed-Blazing_Fast-orange?style=flat-square" />
  
  <br>
  <br>
  
  *"AI wrote code with fake packages. Implit caught them in 0.3 seconds."*
  
  <br>
  
  **[Quick Start](#-quick-start)** • **[Features](#-features)** • **[Why Implit?](#-why-implit)** • **[Examples](#-examples)**
  
</div>

---

## 😱 The Problem

```typescript
// AI generates this code...
import { awesomeAuth } from 'super-auth-lib';  // ❌ DOESN'T EXIST
import { fetchUser } from './api/users';       // ❌ NO export named fetchUser
import { login } from 'magic-auth';            // ❌ TYPO - should be 'magic-auth-lib'

// You run npm install... 💥 BROKEN BUILD
```

**Every developer using AI has experienced this:**
- ❌ AI invents npm packages that don't exist
- ❌ AI guesses wrong local import paths
- ❌ Security risk: hackers can register fake packages
- ❌ Hours wasted debugging phantom dependencies

---

## ✨ The Solution

**Implit** scans your AI-generated code and validates every import BEFORE you run it.

```bash
npx @neurall.build/implit check generated-code.ts
```

```
🔍 Checking generated-code.ts...

✓ react - Package exists on npm
✓ lodash - Package exists on npm
✗ super-auth-lib - Package NOT FOUND on npm registry
✗ ./api/users - No export named 'fetchUser' (available: getUser, deleteUser)
✗ magic-auth - Package NOT FOUND (did you mean: magic-auth-lib?)

❌ Found 3 hallucinated imports!
```

---

## 🚀 Quick Start

### Zero Config (Recommended)

```bash
# Check any file instantly - no installation needed
npx @neurall.build/implit check your-file.ts
```

### Global Install

```bash
# Install globally for frequent use
npm install -g @neurall.build/implit

# Then run anywhere
implit check your-file.ts
```

### Generate Fix Prompt for AI

```bash
# Get a ready-to-paste prompt to feed back to your AI
npx @neurall.build/implit check your-file.ts --fix
```

**Output:**
```
📋 Fix prompt (ready to paste):

Your generated code has invalid imports:

1. "super-auth-lib" does not exist on npm.
2. "./api/users" does not export "fetchUser". Available exports: getUser, deleteUser.
3. "magic-auth" does not exist. Did you mean "magic-auth-lib"?

Please fix these imports and regenerate the code.
```

---

## 🎯 Features

### ✓ npm Package Verification
- Checks every external import against `registry.npmjs.org`
- Detects typos with fuzzy matching ("Did you mean...")
- Prevents supply chain attacks from fake packages

### ✓ Local Import Validation
- Scans your local files for actual exports
- Detects missing files
- Reports available exports for wrong imports

### ✓ Node.js Built-in Detection
- Automatically recognizes Node.js built-ins (fs, path, http, etc.)
- No false positives on standard modules

### ✓ Smart Caching
- Caches npm lookups for 24 hours
- Blazing fast on repeated runs
- Minimal network overhead

### ✓ Zero Config
- Works out of the box
- No setup required
- Just `npx` and go

### ✓ AI-Friendly Output
- `--fix` flag generates clipboard-ready prompts
- Feed directly back to Claude, GPT, or Gemini
- One-command workflow for AI-assisted coding

---

## 💡 Why Implit?

| Feature | Implit | Manual Review | IDE Linter |
|---------|--------|---------------|------------|
| Catches fake npm packages | ✓ | Maybe | ✗ |
| Validates local exports | ✓ | Maybe | ✗ |
| Zero setup required | ✓ | — | ✗ |
| Works on any file | ✓ | — | ✗ |
| Generates AI fix prompts | ✓ | — | — |
| Speed | 0.3s | Minutes | Realtime* |

*IDE linters only catch already-installed packages, not hallucinated ones

---

## 📦 Examples

### Basic Check

```bash
npx @neurall.build/implit check src/components/App.tsx
```

### Check Multiple Files

```bash
npx @neurall.build/implit check src/**/*.ts
```

### CI/CD Integration

```yaml
# .github/workflows/check.yml
name: Validate Imports

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx @neurall.build/implit check src/index.ts
```

### JSON Output

```bash
npx @neurall.build/implit check your-file.ts --json
```

```json
[
  {
    "module": "react",
    "valid": true,
    "type": "external",
    "message": "Package exists on npm"
  },
  {
    "module": "super-auth-lib",
    "valid": false,
    "type": "external",
    "message": "Package NOT FOUND on npm registry"
  }
]
```

---

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `implit check <file>` | Check a file for hallucinated imports |
| `implit check <file> --security` | Also run security checks for typosquatting |
| `implit check <file> --fix` | Generate fix prompt for AI |
| `implit check <file> --json` | Output results as JSON |
| `implit check <file> --no-cache` | Skip cache, always query npm |
| `implit audit` | Run npm audit for vulnerabilities |
| `implit install-hook` | Install git pre-commit hook |
| `implit clear-cache` | Clear the dependency cache |

---

## 🏆 Who Uses Implit?

- **AI Vibe Coders** — Validate ChatGPT/Claude code before running
- **DevOps Teams** — Catch issues before they hit CI/CD
- **Security Teams** — Prevent dependency hijacking attacks
- **Open Source Maintainers** — Validate PRs with AI-generated code

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - feel free to use in personal and commercial projects.

---

## 🙏 Credits

Built by [Neurall](https://github.com/build-neurall) — making AI-assisted development safer.

---

<div align="center">
  
  **[⬆ Back to Top](#-implit)**
  
  <br>
  
  *Found this useful? Give us a ⭐ on GitHub!*
  
  [![GitHub Repo](https://img.shields.io/badge/GitHub-Neurall--build/implit-black?style=for-the-badge&logo=github)](https://github.com/Neurall-build/implit)
  [![NPM Package](https://img.shields.io/badge/NPM-@neurall.build/implit-red?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@neurall.build/implit)
  
</div>