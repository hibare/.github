# Technology Stack

## Overview

This repository is a **GitHub Actions workflows and shared composite actions repository** — not a traditional application codebase. It contains reusable GitHub Actions workflows and composite actions for CI/CD, pre-commit, Docker builds, GoReleaser, and a GATE token exchange action.

## Languages & Runtimes

| Category | Details |
|----------|---------|
| Primary Languages | YAML (GitHub Actions workflows), Bash (composite action scripts), YAML (pre-commit config), Go (planned caretaker CLI) |
| Shell | Bash (used in composite action `run` steps) |
| CI/CD | GitHub Actions (workflows in `.github/workflows/` and `github/shared-workflows/`) |
| Pre-commit | Python-based (via `pre-commit` framework with hooks from various ecosystems) |

## Frameworks & Tools

| Tool | Version (Pinned) | Purpose |
|------|------------------|---------|
| `actions/checkout` | v7.0.0 (SHA: 9c091bb) | Checkout repository |
| `actions/setup-python` | v6.2.0 (SHA: a309ff8) | Set up Python for pre-commit |
| `actions/setup-go` | v6.4.0 (SHA: 4a36011) | Set up Go for GoReleaser |
| `actions/cache` | v5.0.5 (SHA: 27d5ce7) | Cache pre-commit and Docker layers |
| `actions/github-script` | v9.0.0 (SHA: 3a2844b) | Script GitHub API in workflows |
| `docker/setup-qemu-action` | v4.1.0 (SHA: 0611638) | QEMU for multi-platform Docker |
| `docker/setup-buildx-action` | v4.1.0 (SHA: d7f5e7f) | Docker Buildx |
| `docker/login-action` | v4.2.0 (SHA: 650006c) | Docker registry login |
| `docker/build-push-action` | v7.2.0 (SHA: f9f3042) | Build and push Docker images |
| `docker/metadata-action` | v6.1.0 (SHA: 80c7e94) | Generate Docker metadata |
| `goreleaser/goreleaser-action` | v7.2.2 (SHA: 5daf1e9) | GoReleaser for Go releases |
| `sigstore/cosign-installer` | v4.1.2 (SHA: 6f9f177) | Cosign for signing |
| `step-security/harden-runner` | v2.19.4 (SHA: 9af89fc) | Harden GitHub Actions runners |
| `release-drafter/release-drafter` | v7.4.0 (SHA: ed4bc48) | Automated release notes |

## Pre-commit Hooks (from `.pre-commit-config.yaml`)

| Hook Repo | Revision | Hooks |
|-----------|----------|-------|
| `pre-commit/pre-commit-hooks` | v6.0.0 (3e8a870) | check-added-large-files, check-ast, check-builtin-literals, check-case-conflict, check-executables-have-shebangs, check-illegal-windows-names, check-json, check-shebang-scripts-are-executable, check-symlinks, check-toml, check-yaml, debug-statements, double-quote-string-fixer, end-of-file-fixer, fix-encoding-pragma, mixed-line-ending, sort-simple-yaml, trailing-whitespace, fix-byte-order-marker |
| `rhysd/actionlint` | v1.7.12 (914e7df) | actionlint |
| `DavidAnson/markdownlint-cli2` | v0.22.1 (996abf6) | markdownlint-cli2-docker |

## Dependabot Configuration

- **Ecosystem**: `github-actions`
- **Directories monitored**: `/`, `/github/shared-workflows/docker-image-build-publish`, `/github/shared-workflows/gate`, `/github/shared-workflows/goreleaser`, `/github/shared-workflows/pre-commit`
- **Schedule**: Monthly on Friday at 00:30
- **Target branch**: `main`
- **Grouping**: All actions grouped under `actions` group

## Release Drafter

- **Version**: v7.4.0
- **Version resolver**: Minor by default, major/minor/patch via labels
- **Categories**: Features (feat/feature/enhancement), Bug Fixes (fix/bugfix/bug), Documentation (docs), Maintenance (chore), Miscellaneous (misc)
- **Auto-labeler**: Based on branch names and PR titles (feat/, fix/, docs/, chore/, misc/)

## Editor Configuration (`.editorconfig`)

- Root: true
- Default: UTF-8, LF, insert final newline, trim trailing whitespace
- YAML/YAML: 2-space indent
- JSON: 2-space indent
- Markdown: No trailing whitespace trim, no max line length
- Go: Tab indent, size 4
- Python: 4-space indent, 88 char line length
- Shell: 2-space indent
- Dockerfile: 2-space indent
- GitHub Actions workflows: 2-space indent
- Pre-commit config: 2-space indent
- Dependabot config: 2-space indent

## Planned Go CLI (Caretaker)

Per design docs in `docs/plans/`, a Go CLI called `caretaker` is planned with:

- **Module**: `github.com/hibare/.github/cmd/caretaker`
- **Framework**: `github.com/spf13/cobra`
- **Git ops**: `github.com/go-git/go-git/v5`
- **GitHub API**: `github.com/google/go-github/v69`
- **YAML**: `gopkg.in/yaml.v3`
- **Semver**: `golang.org/x/mod/semver`
- **First command**: `caretaker pre-commit pin <repo-url>` — pins pre-commit hook revs to commit SHAs

## Evidence

- `.github/workflows/checks.yml` — CI workflow using shared pre-commit workflow
- `.github/dependabot.yml` — Dependabot configuration
- `.github/release-drafter.yml` — Release drafter configuration
- `.pre-commit configuration
- `.editorconfig` — Editor configuration
- `github/shared-workflows/gate/action.yml` — GATE token exchange composite action
- `github/shared-workflows/docker-image-build-publish/action.yml` — Docker build/publish composite action
- `github/shared-workflows/goreleaser/action.yml` — GoReleaser composite action
- `github/shared-workflows/pre-commit/action.yml` — Pre-commit composite action
- `docs/plans/2026-06-04-caretaker-design.md` — Caretaker CLI design
- `docs/plans/2026-06-04-caretaker-implementation.md` — Caretaker CLI implementation plan
