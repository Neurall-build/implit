# Implit GitHub Action

Automatically validate imports in your pull requests.

## Usage

Add this to `.github/workflows/implit.yml`:

```yaml
name: Implit Check

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: neurall-build/implit/github-action@main
        with:
          files: 'src/**/*.{ts,tsx,js,jsx}'
          fail-on-error: true
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `files` | Files to check (glob pattern) | `src/**/*.{ts,tsx,js,jsx}` |
| `fail-on-error` | Fail workflow if issues found | `true` |
| `fix` | Generate fix prompts | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `found-issues` | `true` if hallucinations found |
| `report` | JSON report of issues |

## Example PR Comment

When hallucinations are found, the action will:
1. Show detailed error output
2. Optionally block the merge
3. Generate fix prompts for your AI