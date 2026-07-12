# Repository Structure

## Directory Layout

```
/home/ranger/Documents/projects/.github/
├── .claude/
│   └── settings.local.json          # Local Claude Code settings
├── .editorconfig                     # Editor configuration (root)
├── .github/                          # GitHub-specific configuration
│   ├── dependabot.yml               # Dependabot configuration for GitHub Actions
│   ├── release-drafter.yml          # Release drafter configuration
│   └── workflows/
│       ├── checks.yml               # Main CI workflow (pre-commit)
│       └── release-drafter.yml      # Release drafter workflow
├── .pre-commit-config.yaml          # Pre-commit hook configuration
├── .vscode/
│   └── settings.json                # VS Code workspace settings
├── README.md                        # Repository README (empty)
├── docs/
│   ├── codebase/                    # This documentation (generated)
│   │   └── .codebase-scan.txt       # Codebase scan output
│   └── plans/                       # Design and implementation plans
│       ├── 2026-06-04-caretaker-design.md
│       ├── 2026-06-04-caretaker-implementation.md
│       ├── 2026-06-04-caretaker-dependabot-command-design.md
│       ├── 2026-06-04-caretaker-dependabot-command-implementation.md
│       ├── 2026-06-04-caretaker-dev-tools-design.md
│       ├── 2026-06-04-caretaker-dev-tools-implementation.md
│       ├── 2026-06-04-caretaker-go-command-design.md
│       └── 2026-06-04-caretaker-go-command-implementation.md
└── github/
    └── shared-workflows/            # Reusable composite actions
        ├── docker-image-build-publish/
        │   └── action.yml           # Docker build & publish composite action
        ├── gate/
        │   └── action.yml           # GATE token exchange composite action
        ├── goreleaser/
        │   └── action.yml           # GoReleaser composite action
        └── pre-commit/
            ├── action.yml           # Pre-commit composite action
            ├── requirements.in      # Pre-commit dependencies (input)
            └── requirements.txt     # Pre-commit dependencies (pinned with hashes)
```

## Key Files

### Root Configuration

| File | Purpose |
|------|---------|
| `.editorconfig` | Consistent editor settings across IDEs |
| `.pre-commit-config.yaml` | Pre-commit hook definitions (pinned to SHAs) |
| `.github/dependabot.yml` | Automated dependency updates for GitHub Actions |
| `.github/release-drafter.yml` | Automated release notes generation |
| `.vscode/settings.json` | VS Code workspace settings |

### CI/CD Workflows (`.github/workflows/`)

| File | Trigger | Purpose |
|------|---------|---------|
| `checks.yml` | Push to main/tags, PR to main/dev | Runs pre-commit hooks via shared workflow |
| `release-drafter.yml` | Push to main, PR opened/synced | Auto-labels PRs and drafts release notes |

### Shared Composite Actions (`github/shared-workflows/`)

Each directory contains an `action.yml` defining a composite action:

| Action | Description | Inputs | Outputs |
|--------|-------------|--------|---------|
| `gate` | Exchange GitHub OIDC token for GitHub App installation token via GATE server | `gate-server-url`, `target-repository`, `policy-name`, `requested-permissions`, `requested-ttl` | `token`, `expires-at`, `matched-policy`, `permissions`, `request-id` |
| `docker-image-build-publish` | Build and publish Docker images to Docker Hub and/or GHCR | `dockerfile`, `context`, `image_names`, `tags`, `push_dockerhub`, `push_ghcr`, `build_args`, `platforms` | `image_digest` |
| `goreleaser` | Build and publish Go artifacts using GoReleaser | `args`, `workdir`, `sign` | (none) |
| `pre-commit` | Run pre-commit hooks with caching | `extra_args` | (none) |

### Pre-commit Action Dependencies

| File | Purpose |
|------|---------|
| `github/shared-workflows/pre-commit/requirements.in` | Unpinned pre-commit dependencies (source of truth) |
| `github/shared-workflows/pre-commit/requirements.txt` | Pinned dependencies with SHA256 hashes (used by action) |

### Documentation Plans (`docs/plans/`)

| File | Purpose |
|------|---------|
| `caretaker-design.md` | High-level design for `caretaker` Go CLI |
| `caretaker-implementation.md` | Detailed 8-task implementation plan for caretaker |
| `caretaker-dependabot-command-design.md` | Design for `caretaker dependabot` sub-command |
| `caretaker-dependabot-command-implementation.md` | Implementation plan for dependabot command |
| `caretaker-dev-tools-design.md` | Design for dev tools sub-commands |
| `caretaker-dev-tools-implementation.md` | Implementation plan for dev tools |
| `caretaker-go-command-design.md` | Design for Go-related sub-commands |
| `caretaker-go-command-implementation.md` | Implementation plan for Go commands |

## Entry Points

### GitHub Actions Workflows

- **Primary CI**: `.github/workflows/checks.yml` → uses `hibare/.github/github/shared-workflows/pre-commit@<sha>`
- **Release Automation**: `.github/workflows/release-drafter.yml` → uses `release-drafter/release-drafter@<sha>`

### Composite Actions (Callable)

Each shared workflow is a composite action callable via:

```yaml
uses: hibare/.github/github/shared-workflows/<action-name>@<ref>
```

### Planned CLI Entry Point (Not Yet Implemented)

- `cmd/caretaker/main.go` — Would be the binary entry point
- `caretaker pre-commit pin <repo-url>` — First planned sub-command

## Evidence

- Directory tree from scan output (`docs/codebase/.codebase-scan.txt`)
- All files listed above verified via `ls` and `cat` commands
- Workflow files reference shared workflows by repository and SHA
- Plan documents describe future `cmd/caretaker/` structure (not yet created)
