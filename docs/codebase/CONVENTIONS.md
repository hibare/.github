# Conventions & Standards

## Overview
This repository follows conventions for GitHub Actions workflows, composite actions, Bash scripts, YAML configuration, and Markdown documentation. Conventions are enforced via pre-commit hooks and EditorConfig.

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| GitHub Actions workflows | `kebab-case.yml` | `checks.yml`, `release-drafter.yml` |
| Composite actions | `action.yml` (in directory) | `github/shared-workflows/gate/action.yml` |
| Pre-commit config | `.pre-commit-config.yaml` | (standard name) |
| Dependabot config | `dependabot.yml` | (standard name) |
| Release drafter config | `release-drafter.yml` | (standard name) |
| EditorConfig | `.editorconfig` | (standard name) |
| Requirements (pinned) | `requirements.txt` | `pre-commit/requirements.txt` |
| Requirements (source) | `requirements.in` | `pre-commit/requirements.in` |
| Markdown docs | `kebab-case.md` | `caretaker-design.md` |
| Plan docs | `YYYY-MM-DD-feature-type.md` | `2026-06-04-caretaker-implementation.md` |
| Go files (planned) | `snake_case.go` | `config.go`, `resolver_test.go` |

## YAML Conventions

### Indentation & Formatting (Enforced by `.editorconfig` + pre-commit)
- **Indent**: 2 spaces (all YAML files)
- **Line endings**: LF
- **Final newline**: Required
- **Trailing whitespace**: Trimmed (except Markdown)
- **Quotes**: Not required for strings unless special chars; `actionlint` prefers unquoted

### GitHub Actions Workflow Structure
```yaml
name: Descriptive Name

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main, dev]

concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref_name }}
  cancel-in-progress: true

permissions:
  contents: read  # Default minimal

jobs:
  job-name:
    permissions:
      contents: write  # Elevated only where needed
    runs-on: ubuntu-latest
    steps:
      - name: Harden Runner (Audit)
        uses: step-security/harden-runner@<sha>
        with:
          egress-policy: audit
      - name: Descriptive Step Name
        uses: owner/repo@<full-sha>
        with:
          input: value
```

### Composite Action Structure
```yaml
name: Action Name
description: >-
  One-line description.
  Can span multiple lines with >-.

inputs:
  input-name:
    description: Description of input
    required: true/false
    default: "default-value"

outputs:
  output-name:
    description: Description
    value: ${{ steps.step-id.outputs.output-name }}

runs:
  using: composite
  steps:
    - name: Step Name
      shell: bash
      run: |
        set -euo pipefail
        # commands
      env:
        VAR: ${{ inputs.input-name }}
```

### Action Pinning
- **Always pin to full SHA** (40-char commit hash)
- **Never use tags** (`v1`, `v2`, `latest`)
- **Comment with version** for readability: `# v7.0.0`
- **Format**: `uses: owner/repo@sha # vX.Y.Z`

### Input/Output Naming
- **Inputs**: `kebab-case` (e.g., `gate-server-url`, `target-repository`)
- **Outputs**: `kebab-case` (e.g., `expires-at`, `matched-policy`)
- **Descriptions**: Sentence case, end with period

## Bash Script Conventions (in Composite Actions)

### Shebang & Safety
```bash
#!/usr/bin/env bash
set -euo pipefail
```

### Error Handling
- Use `::error title=Title::Message` for GitHub Actions annotations
- Exit non-zero on failure
- Mask secrets: `echo "::add-mask::$SECRET"`

### Variable Naming
- **Environment variables**: `UPPER_SNAKE_CASE` (e.g., `GATE_SERVER_URL`)
- **Local variables**: `lower_snake_case` (e.g., `server_url`, `http_code`)
- **Step outputs**: Written to `$GITHUB_OUTPUT` as `key=value`

### curl Usage
```bash
# Always use -sS (silent + show errors)
# Use -w for HTTP code capture
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$RESPONSE_FILE" ...)
# Check range
if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  # success
else
  echo "::error title=Error::Message"
  exit 1
fi
```

### jq Usage
```bash
# Always check for null/empty
VALUE=$(jq -r '.field' "$FILE")
if [ -z "$VALUE" ] || [ "$VALUE" = "null" ]; then
  echo "::error::Missing field"
  exit 1
fi
```

## GitHub Actions Specific

### Permissions Model
- **Workflow default**: `contents: read`
- **Job-level**: Elevate only what's needed
- **OIDC token**: Requires `id-token: write` at workflow or job level

### Concurrency
- **Group**: `${{ github.workflow }}-${{ github.head_ref || github.ref_name }}`
- **Cancel-in-progress**: `true` for all workflows

### Reusable Workflow Calls (Not Used)
This repo uses **composite actions**, not reusable workflows. Consumers call:
```yaml
uses: hibare/.github/github/shared-workflows/gate@<sha>
```

## Pre-commit Hook Conventions

### Hook Pinning
- **All hooks pinned to commit SHA** (not tags)
- **Format**: `rev: <sha> # vX.Y.Z`
- **Source**: `.pre-commit-config.yaml`

### Hook Order
1. File integrity checks (symlinks, case conflict, large files)
2. Syntax checks (YAML, JSON, TOML, AST)
3. Security checks (executables, shebangs, windows names)
4. Formatters/fixers (whitespace, quotes, encoding, line endings)
5. Linters (actionlint, markdownlint)
6. Custom (debug statements)

## Markdown Conventions

### Headings
- **ATX style**: `# Heading`
- **One H1 per file** (repository/file title)
- **Hierarchical**: H1 → H2 → H3

### Links
- **Relative paths** for repo files: `docs/plans/design.md`
- **Absolute URLs** for external: `https://github.com/...`
- **Reference-style** avoided; inline preferred

### Code Blocks
- **Language specified**: ```yaml, ```bash, ```go
- **No language**: Plain text output

### Tables
- **GitHub-flavored markdown tables** with header row
- **Alignment**: Left (default), no colons needed

## Git Conventions

### Commit Messages
- **Format**: `<type>: <subject>`
- **Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `ci`, `test`
- **Scope**: Optional, in parentheses: `feat(gate): add retry logic`
- **Body**: Optional, explains why not how
- **No co-authors, no AI attribution**

### Branch Naming
- **Format**: `<type>/<short-description>`
- **Types**: `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`
- **Examples**: `feat/gate-exchange-action`, `chore/update-dependabot`

### PR Titles
- **Match commit subject** (squash merge)
- **Conventional commits** for Release Drafter categorization

## Go Conventions (Planned - for Caretaker CLI)

### Module Path
- **Planned**: `github.com/hibare/.github/cmd/caretaker`
- **Note**: Unusual nested path; consider `github.com/hibare/caretaker`

### Project Layout
```
cmd/caretaker/
├── main.go
├── cmd/
│   ├── root.go
│   └── precommit/
│       └── pin.go
└── internal/
    ├── precommit/
    │   ├── config.go
    │   ├── config_test.go
    │   ├── resolver.go
    │   ├── resolver_test.go
    │   └── pinner.go
    └── github/
        ├── client.go
        └── repo.go
```

### Code Style
- **Formatter**: `gofmt` / `goimports`
- **Linter**: `golangci-lint` (not yet configured)
- **Imports**: Standard library first, then third-party, then local
- **Error handling**: Explicit checks, wrap with `fmt.Errorf("%w", err)`
- **Context**: Pass `context.Context` as first param for I/O
- **Tests**: `*_test.go`, table-driven, `testing.T` helper functions

### Dependencies (Planned)
| Package | Purpose |
|---------|---------|
| `github.com/spf13/cobra` | CLI framework |
| `github.com/go-git/go-git/v5` | Git operations |
| `github.com/google/go-github/v69` | GitHub API |
| `gopkg.in/yaml.v3` | YAML parsing (with position tracking) |
| `golang.org/x/mod/semver` | Semver utilities |

## Dependabot Conventions

### Grouping
- **All GitHub Actions** grouped as `actions` with pattern `*`
- **Single PR per month** for all action updates
- **Assignee**: `@hibare`

### Schedule
- **Monthly** on Friday at 00:30 UTC
- **Target branch**: `main`
- **Cooldown**: 10 days

## Release Drafter Conventions

### Version Resolution
- **Major**: Label `major`
- **Minor**: Label `minor` (default)
- **Patch**: Label `patch`

### Categories & Labels
| Category | Labels |
|----------|--------|
| Features | `feat`, `feature`, `enhancement` |
| Bug Fixes | `fix`, `bugfix`, `bug` |
| Documentation | `docs` |
| Maintenance | `chore` |
| Miscellaneous | `misc` |

### Auto-labeling
- **Branch patterns**: `feat/*`, `fix/*`, `docs/*`, `chore/*`, `misc/*`
- **Title patterns**: Conventional commit prefixes

## Evidence
- `.editorconfig` — Indentation, line endings, charset
- `.pre-commit-config.yaml` — Hook versions, order
- `.github/workflows/checks.yml` — Workflow structure, permissions, concurrency
- `.github/workflows/release-drafter.yml` — Release workflow structure
- `.github/dependabot.yml` — Grouping, schedule
- `.github/release-drafter.yml` — Categories, labels, versioning
- `github/shared-workflows/*/action.yml` — Composite action patterns, pinning
- `docs/plans/2026-06-04-caretaker-design.md` — Planned Go conventions
