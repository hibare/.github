# Shared GitHub Actions

Reusable composite actions published from `hibare/.github`.

## docker-image-build-publish

Build and optionally publish Docker images to DockerHub and/or GHCR. Supports BuildKit build secrets for private dependencies inside the Dockerfile.

```yaml
- uses: hibare/.github/github/shared-workflows/docker-image-build-publish@<sha>
  with:
    image_names: myorg/myimage
    tags: latest
    platforms: linux/amd64,linux/arm64
    secrets: |
      npm_token=${{ secrets.NPM_TOKEN }}
```

## setup-shellcheck

Download and set up ShellCheck from GitHub releases for the runner platform and architecture.

```yaml
- uses: hibare/.github/github/shared-workflows/setup-shellcheck@<sha>
  with:
    version: latest # optional: "latest", "v0.10.0", or "0.10.0"
```
