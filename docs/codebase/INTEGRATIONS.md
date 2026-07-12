# Integrations

## Overview
This repository integrates with external services exclusively through GitHub Actions workflows and composite actions. There are no direct application-level integrations (no database connections, no API clients in application code).

## External Service Integrations

### 1. GitHub Platform
**Integration Type**: Native (GitHub Actions runtime)

| Component | Purpose | Auth Method | Permissions Used |
|-----------|---------|-------------|------------------|
| `actions/checkout` | Clone repository | `GITHUB_TOKEN` | `contents: read` |
| `release-drafter/release-drafter` | Auto-generate release notes | `GITHUB_TOKEN` | `contents: write`, `pull-requests: read` |
| `release-drafter/autolabeler` | Auto-label PRs | `GITHUB_TOKEN` | `pull-requests: write` |
| `gate` action | Exchange OIDC token for GitHub App token | OIDC (`id-token: write`) + GATE server | N/A (delegates to GATE) |
| `goreleaser/goreleaser-action` | Build/publish Go releases | `GITHUB_TOKEN` | `contents: write`, `packages: write` (if publishing) |
| Dependabot | Automated dependency updates | Built-in | `contents: write`, `pull-requests: write` |

**OIDC Token Exchange (GATE Action)**:
- Workflow must declare `permissions: { id-token: write }`
- Action requests token with `audience=gate`
- GATE server validates token and issues GitHub App installation token
- Used for cross-repository access with fine-grained permissions

### 2. Docker Registries

#### Docker Hub
**Integration**: `docker/login-action` + `docker/build-push-action`
- **Auth**: Username/password via `DOCKERHUB_USERNAME` / `DOCKERHUB_PASSWORD` repository secrets
- **Trigger**: Manual via workflow inputs (`push_dockerhub: "true"`)
- **Images**: Multi-platform via Buildx + QEMU
- **Cache**: Local `/tmp/.buildx-cache` with GitHub Actions cache

#### GitHub Container Registry (GHCR)
**Integration**: `docker/login-action` + `docker/build-push-action`
- **Auth**: `GITHUB_TOKEN` (automatic, `push_ghcr: "true"` input)
- **Registry**: `ghcr.io`
- **Username**: `github.repository_owner`
- **Permissions**: `packages: write` (implicit via `GITHUB_TOKEN`)

### 3. Go Ecosystem (via GoReleaser)

#### GoReleaser
**Integration**: `goreleaser/goreleaser-action`
- **Config**: `.goreleaser.yaml` (expected in repo using this action)
- **Auth**: `GITHUB_TOKEN` for releases, `FURY_TOKEN` for Gemfury (optional)
- **Signing**: Cosign (optional, `sign: "true"` input)
- **Distribution**: GitHub Releases, optionally Gemfury, Homebrew, Scoop, etc.

#### Cosign (Sigstore)
**Integration**: `sigstore/cosign-installer`
- **Trigger**: Non-PR events with `sign: "true"`
- **Purpose**: Sign artifacts and verify signatures
- **Keys**: Managed via Sigstore keyless signing (OIDC)

### 4. Python / Pre-commit Ecosystem

#### Pre-commit Framework
**Integration**: `actions/setup-python` + `pip install` + `pre-commit run`
- **Python Version**: Latest stable via `setup-python` (no fixed version)
- **Dependencies**: Pinned in `github/shared-workflows/pre-commit/requirements.txt` with SHA256 hashes
- **Hook Sources**:
  - `pre-commit/pre-commit-hooks` (v6.0.0) — General file checks
  - `rhysd/actionlint` (v1.7.12) — GitHub Actions workflow linting
  - `DavidAnson/markdownlint-cli2` (v0.22.1) — Markdown linting (Docker-based)

#### PyPI (Indirect)
- Pre-commit hooks installed from PyPI via `pip`
- Hash verification enforced (`--require-hashes`)

### 5. Security & Hardening

#### Step Security Harden Runner (Integration)
**Integration**: `step-security/harden-runner@v2.19.4`
- **Mode**: `egress-policy: audit` (logs outbound connections, doesn't block)
- **Scope**: All workflow jobs
- **Purpose**: Detect unexpected network calls for supply chain security

### 6. Dependabot
**Integration**: GitHub-native (`.github/dependabot.yml`)
- **Ecosystem**: `github-actions` only
- **Schedule**: Monthly, Friday 00:30 UTC
- **Target**: `main` branch
- **Groups**: All actions under single `actions` group
- **Assignee**: `@hibare`
- **Cooldown**: 10 days

## Authentication Patterns

| Service | Method | Where Configured |
|---------|--------|------------------|
| GitHub API (Actions) | `GITHUB_TOKEN` (auto) | Workflow `permissions:` / `env:` |
| GitHub API (OIDC) | `ACTIONS_ID_TOKEN_REQUEST_TOKEN` + URL | Runner environment (auto) |
| GitHub App (via GATE) | OIDC → GATE → Installation token | `gate` action internals |
| Docker Hub | Username + Password (secrets) | Repository/Organization secrets |
| GHCR | `GITHUB_TOKEN` | Automatic |
| Gemfury | `FURY_TOKEN` secret | Repository/Organization secrets |
| PyPI | N/A (pre-commit only) | N/A |

## Network Dependencies

### Outbound Connections (observed via harden-runner audit)
| Destination | Purpose | From |
|-------------|---------|------|
| `api.github.com` | GitHub API (all actions) | All workflows |
| `github.com` | Git operations, releases | `checkout`, `goreleaser`, `release-drafter` |
| `registry.hub.docker.com` / `index.docker.io` | Docker Hub images | `docker/*` actions |
| `ghcr.io` | GitHub Container Registry | `docker/login-action` (GHCR) |
| `pypi.org` / `files.pythonhosted.org` | Pre-commit hook packages | `pre-commit` action |
| `raw.githubusercontent.com` | Action source, release assets | `actions/checkout`, various |
| `objects.githubusercontent.com` | Release assets | `goreleaser` |
| `gate.server.url` (configurable) | GATE token exchange | `gate` action |
| `cosign` / `sigstore` endpoints | Keyless signing | `cosign-installer`, `goreleaser` |
| `fury.io` | Gemfury publishing | `goreleaser` (if configured) |

### Inbound Connections
- None (this is a workflow library, not a service)

## Configuration Management

### Required Secrets (per repository using these workflows)
| Secret | Required By | Description |
|--------|-------------|-------------|
| `DOCKERHUB_USERNAME` | `docker-image-build-publish` | Docker Hub username |
| `DOCKERHUB_PASSWORD` | `docker-image-build-publish` | Docker Hub password/token |
| `FURY_TOKEN` | `goreleaser` | Gemfury push token (optional) |
| `GATE_SERVER_URL` | `gate` action input | Base URL of GATE server |

### Environment Variables
| Variable | Set By | Used By |
|----------|--------|---------|
| `GITHUB_TOKEN` | GitHub Actions | All actions needing API access |
| `ACTIONS_ID_TOKEN_REQUEST_TOKEN` | GitHub Actions runner | `gate` action (OIDC) |
| `ACTIONS_ID_TOKEN_REQUEST_URL` | GitHub Actions runner | `gate` action (OIDC) |
| `DOCKERHUB_USERNAME` | Repo secret → `env:` | `docker-image-build-publish` |
| `DOCKERHUB_PASSWORD` | Repo secret → `env:` | `docker-image-build-publish` |
| `FURY_TOKEN` | Repo secret → `env:` | `goreleaser` |

## Webhook / Event Subscriptions

### GitHub Events Consumed
| Event | Workflow | Purpose |
|-------|----------|---------|
| `push` (tags `v*`, branches `main`) | `checks.yml` | Run CI on releases and main |
| `pull_request` (branches `main`, `dev`) | `checks.yml` | Run CI on PRs |
| `push` (branch `main`) | `release-drafter.yml` | Update release draft |
| `pull_request` (opened, reopened, synchronize) | `release-drafter.yml` | Auto-label PRs |

### GitHub Events Produced
| Event | Producer | Consumers |
|-------|----------|-----------|
| `pull_request` (auto-labeled) | `release-drafter/autolabeler` | Human reviewers, automation |
| `release` (draft/published) | `release-drafter/release-drafter` | Users, downstream automation |
| `check_run` / `check_suite` | All workflows | Branch protection, PR checks |

## Monitoring & Observability

### Built-in GitHub Actions Monitoring
- **Workflow runs**: `gh run list`, `gh run view`, `gh run watch`
- **Check results**: `gh pr checks`, `gh pr status`
- **Release Drafter**: Draft release visible at `/releases` (draft)
- **Dependabot**: PRs created automatically, viewable in PR list

### Step Security Harden Runner
- **Mode**: Audit (logs only)
- **Output**: Annotations in workflow run summary showing egress connections
- **Alerting**: None configured (audit only)

### No External Monitoring
- No Datadog, New Relic, Prometheus, Grafana, etc.
- No custom metrics emission
- No log aggregation beyond GitHub Actions logs

## Integration Health Checks

### Manual Verification
| Integration | Check Method |
|-------------|--------------|
| Docker Hub push | Trigger workflow with `push_dockerhub: true`, verify image on hub.docker.com |
| GHCR push | Trigger workflow with `push_ghcr: true`, verify package on GitHub |
| GoReleaser | Tag push (`vX.Y.Z`), verify release artifacts |
| GATE action | Run workflow with valid `gate-server-url`, verify token output |
| Pre-commit | Push to PR, verify `checks.yml` passes |
| Release Drafter | Open PR, verify labels; push to main, verify draft release |
| Dependabot | Wait for monthly run, verify PRs created |

### Automated Health Signals
- Workflow status badges (if added to README)
- Dependabot PR creation = Dependabot working
- Release Drafter draft updates = Release Drafter working

## Evidence
- `.github/workflows/checks.yml` — GitHub Actions, permissions, harden-runner
- `.github/workflows/release-drafter.yml` — Release Drafter, auto-labeler
- `.github/dependabot.yml` — Dependabot config
- `.github/release-drafter.yml` — Release Drafter config (labels, versioning)
- `github/shared-workflows/gate/action.yml` — OIDC token exchange, GATE API
- `github/shared-workflows/docker-image-build-publish/action.yml` — Docker Hub + GHCR
- `github/shared-workflows/goreleaser/action.yml` — GoReleaser, cosign, Fury
- `github/shared-workflows/pre-commit/action.yml` — Python, pre-commit, cache
- `github/shared-workflows/pre-commit/requirements.txt` — Pinned Python deps with hashes
- `.pre-commit-config.yaml` — Hook repositories and versions
