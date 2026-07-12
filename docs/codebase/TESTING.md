# Testing Strategy

## Overview

This repository is a **GitHub Actions workflow and composite action library** — not a traditional application with unit/integration tests. Testing is primarily **operational** (workflow execution validation) and **static analysis** (linting).

## Current Testing Approaches

### 1. Static Analysis (Pre-commit / CI)

All workflows and configurations are validated via pre-commit hooks in `.github/workflows/checks.yml`.

| Check | Tool | Scope |
|-------|------|-------|
| YAML syntax | `check-yaml` (pre-commit-hooks) | All `.yml`/`.yaml` files |
| JSON syntax | `check-json` | All `.json` files |
| GitHub Actions workflow syntax | `actionlint` (rhysd/actionlint) | `.github/workflows/*.yml`, `github/shared-workflows/*/action.yml` |
| Markdown linting | `markdownlint-cli2` | All `.md` files |
| Shell script issues | `check-ast`, `check-shebang-scripts-are-executable` | Shell scripts in composite actions |
| File integrity | `check-symlinks`, `check-case-conflict` | Repository structure |
| Whitespace/formatting | `trailing-whitespace`, `end-of-file-fixer`, `mixed-line-ending` | All text files |

**Execution**: `pre-commit run --all-files` (via shared workflow)

### 2. Workflow Execution Testing (Manual / CI)

Workflows are tested by **actually running them** on GitHub Actions:

| Workflow | Trigger | Validation |
|----------|---------|------------|
| `checks.yml` | Push to main/tags, PR to main/dev | All pre-commit hooks pass |
| `release-drafter.yml` | Push to main, PR opened/synced | Draft release updated, PRs labeled |
| Composite actions | Used by consumer repos | Consumer workflow succeeds |

**No automated test suite** exists for composite actions — they are validated by consumption in this repo's own workflows and by downstream repositories.

### 3. Dependabot Validation

- Monthly PRs update action pins to new SHAs
- `checks.yml` runs on Dependabot PRs
- If pre-commit passes, update is considered safe
- Auto-merge not enabled (manual review by `@hibare`)

### 4. Release Drafter Validation

- PR labels verified on PR creation
- Draft release content verified on push to main
- Version resolution tested via label combinations

## Planned Testing (Caretaker CLI)

Per `docs/plans/2026-06-04-caretaker-implementation.md`, the Go CLI will have:

### Unit Tests

- **Framework**: Go standard library `testing` package
- **Location**: `*_test.go` files alongside source
- **Targets**:
  - `precommit/config.go` — `IsSHA`, `Parse`, `TagRevEntries`, `ApplyPins`
  - `precommit/resolver.go` — `extractRepoParts`, `resolveRef` (with mock server)
  - `github/repo.go` — URL parsing, branch/PR logic (unit-testable parts)

### Test Patterns

```go
// Table-driven tests
func TestIsSHA(t *testing.T) {
    tests := []struct {
        name string
        s    string
        want bool
    }{
        {"full SHA", "914e7df21a07ef503a81201c76d2b11c789d3fca", true},
        {"tag", "v6.0.0", false},
        {"short", "abc", false},
        {"empty", "", false},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := IsSHA(tt.s); got != tt.want {
                t.Errorf("IsSHA(%q) = %v, want %v", tt.s, got, tt.want)
            }
        })
    }
}

// YAML parsing with position tracking
func TestTagRevEntries(t *testing.T) {
    cfg, err := Parse([]byte(sampleConfig))
    if err != nil { t.Fatal(err) }
    entries, err := TagRevEntries([]byte(sampleConfig), cfg)
    // Verify line numbers, tag values
}
```

### Mocking Strategy

- **GitHub API**: `net/http/httptest` server returning canned responses
- **Git operations**: Not mocked in unit tests (integration-style); use temp dirs
- **External services**: No direct mocks — test at integration level

### Integration Tests (Planned)

- **Scope**: Full `PinConfig` flow against a test repository
- **Requirements**: GitHub token with repo access, test repo
- **CI**: Not in standard CI (requires secrets); manual or scheduled

### Test Commands

```bash
# Unit tests only
go test ./cmd/caretaker/... -v

# Specific package
go test ./cmd/caretaker/internal/precommit/ -v -run TestTagRevEntries

# With coverage
go test ./cmd/caretaker/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Testing Gaps / TODO

| Area | Current State | Desired State |
|------|---------------|---------------|
| Composite action unit tests | None | `act` local testing or GitHub Actions test harness |
| Workflow integration tests | Manual only | Scheduled workflow dispatch tests |
| Pre-commit hook updates | Dependabot + manual | Automated validation against test repo |
| GoReleaser action | Consumer-tested only | Dedicated test workflow with sample Go project |
| Docker action | Consumer-tested only | Test workflow with sample Dockerfile |
| GATE action | Requires GATE server | Mock server integration test |

## Evidence

- `.github/workflows/checks.yml` — Pre-commit CI job
- `.pre-commit-config.yaml` — Hook definitions (actionlint, markdownlint, etc.)
- `github/shared-workflows/pre-commit/action.yml` — Pre-commit runner
- `github/shared-workflows/pre-commit/requirements.txt` — Pinned deps with hashes
- `docs/plans/2026-06-04-caretaker-implementation.md` — Planned Go test structure
- `docs/codebase/.codebase-scan.txt` — "No performance testing configs detected"
