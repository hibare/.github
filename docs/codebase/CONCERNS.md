# Concerns & Technical Debt

## Overview

This document catalogs known issues, risks, and areas for improvement in the repository. Items are categorized by severity and type.

## Security Concerns

### HIGH: GATE Action Requires `id-token: write` Permission

- **Location**: Any workflow using `hibare/.github/github/shared-workflows/gate@<sha>`
- **Issue**: The action fetches GitHub OIDC token via `ACTIONS_ID_TOKEN_REQUEST_TOKEN/URL`. This requires the workflow to have `id-token: write` permission.
- **Risk**: If a consumer workflow doesn't set `permissions: { id-token: write }`, the action fails with a clear error message. No silent failure.
- **Mitigation**: Documented in action description and error message. Consumer must explicitly grant permission.
- **Evidence**: `github/shared-workflows/gate/action.yml:63-67`

### MEDIUM: Harden Runner in Audit Mode Only

- **Location**: `.github/workflows/checks.yml:22-25`, `.github/workflows/release-drafter.yml:22-25, 38-41`
- **Issue**: `step-security/harden-runner` runs with `egress-policy: audit` — logs outbound connections but doesn't block them.
- **Risk**: Malicious or compromised actions could exfiltrate data without blocking.
- **Mitigation**: Audit logs reviewed manually. Consider `egress-policy: block` with allowlist for production.
- **Evidence**: Both workflow files

### MEDIUM: Pre-commit Hooks Install from PyPI Without Verification Beyond Hashes

- **Location**: `github/shared-workflows/pre-commit/requirements.txt`
- **Issue**: Dependencies pinned with SHA256 hashes, but hashes only verify download integrity, not supply chain integrity of the package itself.
- **Risk**: Compromised PyPI package with valid hash (if hash was updated maliciously).
- **Mitigation**: Dependabot updates hashes monthly; manual review of Dependabot PRs.
- **Evidence**: `requirements.txt` contains `--hash=sha256:...` for each package

### LOW: Docker Build Uses `docker/build-push-action` with Local Cache

- **Location**: `github/shared-workflows/docker-image-build-publish/action.yml:88-94, 121-122`
- **Issue**: Cache stored in `/tmp/.buildx-cache` on runner — ephemeral, not shared across runs.
- **Risk**: Low (performance only). No cross-run cache poisoning.
- **Note**: Could use `actions/cache` with proper key for better performance.

## Technical Debt

### HIGH: No Tests for Composite Actions

- **Location**: `github/shared-workflows/*/action.yml`
- **Issue**: Four composite actions have zero automated tests. Validation relies on:
  1. This repo's own workflows using them
  2. Downstream consumer repos
  3. Manual `act` runs (not documented)
- **Risk**: Breaking changes to actions not caught until consumer workflows fail.
- **Remediation**: Add test workflows using `act` or GitHub Actions test harness; or create example consumer repos with required checks.

### HIGH: Caretaker CLI Not Implemented

- **Location**: `docs/plans/2026-06-04-caretaker-*.md` (8 design/implementation docs)
- **Issue**: Extensive design and implementation plans exist, but zero code in `cmd/caretaker/`.
- **Risk**: Plans become stale; design decisions forgotten.
- **Remediation**: Either implement per plan or archive plans with decision record.

### MEDIUM: Dependabot Updates All Actions in Single PR

- **Location**: `.github/dependabot.yml:20-23`
- **Issue**: `groups.actions.patterns: ["*"]` groups all 5 directories' action updates into one PR.
- **Risk**: Large PR with many changes; harder to review; one failure blocks all.
- **Remediation**: Consider per-directory groups or per-action groups.

### MEDIUM: Pre-commit Requirements Files Duplicated

- **Location**: `github/shared-workflows/pre-commit/requirements.in` → `requirements.txt`
- **Issue**: Two files: `.in` (source) and `.txt` (pinned with hashes). Manual process to update `.txt` from `.in`.
- **Risk**: Drift between files; forgotten regeneration.
- **Remediation**: Add `pip-compile` step to pre-commit or CI to verify/generate `.txt` from `.in`.

### LOW: Release Drafter Config in Two Places

- **Location**: `.github/release-drafter.yml` (workflow config) and `.github/workflows/release-drafter.yml` (workflow file)
- **Issue**: Workflow file references action config via default behavior, but config file is separate.
- **Risk**: Low confusion; standard pattern for release-drafter.
- **Note**: This is expected usage, not a bug.

### LOW: Empty README.md

- **Location**: `README.md` (0 bytes)
- **Issue**: No documentation for consumers on how to use shared workflows.
- **Remediation**: Add usage examples, input/output tables, versioning policy.

## Performance Concerns

### LOW: Pre-commit Cache Key Includes Python Location

- **Location**: `github/shared-workflows/pre-commit/action.yml:21-23`
- **Issue**: Cache key: `pre-commit-3|${{ env.pythonLocation }}|${{ hashFiles('.pre-commit-config.yaml') }}|${{ hashFiles(requirements.txt) }}`
- **Impact**: Cache miss if Python version/patch changes (even if pre-commit deps same).
- **Remediation**: Use `python-version` input instead of `pythonLocation`, or accept occasional misses.

### LOW: Docker Build Cache Not Shared Across Runs

- **Location**: `github/shared-workflows/docker-image-build-publish/action.yml:88-94`
- **Issue**: `actions/cache` uses key `${{ runner.os }}-buildx-${{ github.sha }}` — unique per SHA.
- **Impact**: No cache reuse between builds. `restore-keys` only matches OS prefix.
- **Remediation**: Use better cache key (e.g., include Dockerfile hash, build args hash).

## Maintainability Concerns

### MEDIUM: Action SHA Pins Scattered Across Files

- **Locations**:
  - `.github/workflows/checks.yml:24, 27, 30`
  - `.github/workflows/release-drafter.yml:23, 27, 38, 43`
  - `github/shared-workflows/docker-image-build-publish/action.yml:65, 74, 80, 86, 98, 105, 113`
  - `github/shared-workflows/goreleaser/action.yml:19, 24, 30, 33`
  - `github/shared-workflows/pre-commit/action.yml:17`
- **Issue**: 20+ action SHAs hardcoded; no central manifest.
- **Risk**: Hard to audit; Dependabot updates each file separately.
- **Remediation**: Consider central `action-pins.yml` or use a tool like `action-pinner`.

### MEDIUM: Composite Actions Versioned Only by Git Ref

- **Issue**: Consumers reference actions by SHA (e.g., `@ec61c90a75c7438d3fa683fffffd83908d1e7447`). No semantic versioning/tags.
- **Risk**: Consumers must manually update SHAs; no `v1`, `v2` tags for easy updates.
- **Remediation**: Tag releases (e.g., `gate-v1.0.0`) and document versioning policy.

### LOW: EditorConfig Covers Many Languages But No Enforcement

- **Location**: `.editorconfig`
- **Issue**: No CI check for EditorConfig compliance (e.g., `editorconfig-checker`).
- **Risk**: Inconsistent formatting over time.

### LOW: No `go.mod` / Go Toolchain Defined (for Planned Caretaker)

- **Issue**: Design docs specify `go.mod` at `cmd/caretaker/go.mod`, but not created.
- **Risk**: When implemented, module path `github.com/hibare/.github/cmd/caretaker` is unusual (nested in `.github`).
- **Remediation**: Consider `github.com/hibare/caretaker` or similar.

## Reliability Concerns

### MEDIUM: GATE Action Depends on External GATE Server

- **Location**: `github/shared-workflows/gate/action.yml:116-118`
- **Issue**: Action fails if GATE server unavailable. No retry, no fallback.
- **Risk**: Workflow failures during GATE outage.
- **Remediation**: Add retry logic with backoff; document SLA requirements.

### LOW: Docker Action Requires Secrets for Registry Push

- **Location**: `github/shared-workflows/docker-image-build-publish/action.yml:43-61`
- **Issue**: Prechecks fail fast if secrets missing, but error messages could be clearer.
- **Remediation**: Improve error messages; consider optional registry login.

## Documentation Gaps

| Missing Doc | Impact |
|-------------|--------|
| Shared workflow usage guide | Consumers don't know inputs/outputs/versions |
| Versioning/release policy for actions | Consumers don't know when to update SHAs |
| GATE server setup/deployment | Action unusable without server |
| Pre-commit hook update process | Maintainers don't know how to update `requirements.txt` |
| Caretaker CLI status | Unclear if active, planned, or abandoned |

## High-Churn Files (Last 90 Days)

Per scan output, these files change frequently — potential fragility indicators:

1. `.github/dependabot.yml` (4 changes) — Dependabot config updates
2. `.github/workflows/release-drafter.yml` (4 changes) — Release workflow tweaks
3. `.github/workflows/checks.yml` (3 changes) — CI workflow changes
4. `github/shared-workflows/docker-image-build-publish/action.yml` (2 changes)
5. `github/shared-workflows/goreleaser/action.yml` (2 changes)
6. `github/shared-workflows/pre-commit/action.yml` (2 changes)
7. `.pre-commit-config.yaml` (2 changes)

## Evidence

- `docs/codebase/.codebase-scan.txt` — High-churn files, scan metrics
- `.github/workflows/checks.yml` — Harden-runner audit mode
- `.github/workflows/release-drafter.yml` — Harden-runner audit mode
- `github/shared-workflows/gate/action.yml` — OIDC requirement, GATE dependency
- `github/shared-workflows/pre-commit/requirements.txt` — Pinned deps with hashes
- `github/shared-workflows/docker-image-build-publish/action.yml` — Cache strategy, secret prechecks
- `.github/dependabot.yml` — Grouped updates
- `.pre-commit-config.yaml` — Hook versions
- `docs/plans/2026-06-04-caretaker-*.md` — Unimplemented plans
