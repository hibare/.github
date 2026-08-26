#!/usr/bin/env bash
set -euo pipefail

# Resolve OS
case "${RUNNER_OS}" in
  Linux)
    os="linux"
    ;;
  macOS)
    os="darwin"
    ;;
  Windows)
    os="windows"
    ;;
  *)
    echo "::error title=Unsupported OS::Unsupported runner OS: ${RUNNER_OS}"
    exit 1
    ;;
esac

# Resolve Architecture
case "${RUNNER_ARCH}" in
  X64)
    arch="x86_64"
    ;;
  ARM64)
    arch="aarch64"
    ;;
  ARM)
    arch="armv6hf"
    ;;
  *)
    echo "::error title=Unsupported Arch::Unsupported runner architecture: ${RUNNER_ARCH}"
    exit 1
    ;;
esac

# Determine version
target_version="${INPUT_VERSION:-latest}"
if [ -z "${target_version}" ] || [ "${target_version}" = "latest" ]; then
  auth_header=()
  if [ -n "${INPUT_TOKEN:-}" ]; then
    auth_header=(-H "Authorization: Bearer ${INPUT_TOKEN}")
  fi

  set +e
  api_response=$(curl -sS "${auth_header[@]}" https://api.github.com/repos/koalaman/shellcheck/releases/latest 2>/dev/null)
  target_version=$(echo "${api_response}" | jq -r '.tag_name // empty' 2>/dev/null)
  set -e

  if [ -z "${target_version}" ]; then
    # Fallback to redirect inspection if rate limited or jq empty
    target_version=$(curl -sS -I https://github.com/koalaman/shellcheck/releases/latest 2>/dev/null | tr -d '\r' | awk -F'/tag/' '/^[Ll]ocation:/ {print $2}')
  fi

  if [ -z "${target_version}" ]; then
    echo "::error title=Version Resolution Failed::Failed to determine latest ShellCheck version from GitHub."
    exit 1
  fi
fi

# Ensure target_version starts with 'v'
if [[ ! "${target_version}" =~ ^v ]]; then
  target_version="v${target_version}"
fi

echo "Installing ShellCheck ${target_version} for ${os}-${arch}..."

install_dir="${RUNNER_TEMP}/shellcheck-${target_version}-${os}-${arch}"
mkdir -p "${install_dir}"

# Construct download URLs (support .tar.xz, .tar.gz, .zip depending on release/OS)
if [ "${os}" = "windows" ]; then
  archive_name="shellcheck-${target_version}.zip"
  download_url="https://github.com/koalaman/shellcheck/releases/download/${target_version}/${archive_name}"
  dest_archive="${RUNNER_TEMP}/${archive_name}"

  echo "Downloading ${download_url}..."
  curl -sS -L -f -o "${dest_archive}" "${download_url}"
  unzip -q -o "${dest_archive}" -d "${install_dir}"
  bin_path=$(find "${install_dir}" -type f -name "shellcheck.exe" | head -n 1)
else
  # Check for tar.xz first, fallback to tar.gz
  archive_name="shellcheck-${target_version}.${os}.${arch}.tar.xz"
  download_url="https://github.com/koalaman/shellcheck/releases/download/${target_version}/${archive_name}"
  dest_archive="${RUNNER_TEMP}/${archive_name}"

  echo "Downloading ${download_url}..."
  if ! curl -sS -L -f -o "${dest_archive}" "${download_url}" 2>/dev/null; then
    archive_name="shellcheck-${target_version}.${os}.${arch}.tar.gz"
    download_url="https://github.com/koalaman/shellcheck/releases/download/${target_version}/${archive_name}"
    dest_archive="${RUNNER_TEMP}/${archive_name}"
    echo "Retrying with .tar.gz: ${download_url}..."
    curl -sS -L -f -o "${dest_archive}" "${download_url}"
  fi

  tar -xf "${dest_archive}" -C "${install_dir}"
  bin_path=$(find "${install_dir}" -type f -name "shellcheck" | head -n 1)
fi

if [ -z "${bin_path}" ] || [ ! -f "${bin_path}" ]; then
  echo "::error title=Installation Failed::Could not locate extracted shellcheck binary in ${install_dir}"
  exit 1
fi

chmod +x "${bin_path}"
bin_dir=$(dirname "${bin_path}")

echo "${bin_dir}" >> "${GITHUB_PATH}"
echo "version=${target_version}" >> "${GITHUB_OUTPUT}"
echo "shellcheck-path=${bin_path}" >> "${GITHUB_OUTPUT}"

echo "ShellCheck ${target_version} installed successfully at ${bin_path}"
