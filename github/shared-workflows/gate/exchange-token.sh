#!/usr/bin/env bash
# Exchange a GitHub OIDC token for a short-lived GitHub App installation token via GATE server

set -euo pipefail

# Required environment variables
: "${GATE_SERVER_URL:?GATE_SERVER_URL is required}"
: "${TARGET_REPOSITORY:?TARGET_REPOSITORY is required}"
: "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:?ACTIONS_ID_TOKEN_REQUEST_TOKEN is required}"
: "${ACTIONS_ID_TOKEN_REQUEST_URL:?ACTIONS_ID_TOKEN_REQUEST_URL is required}"

# Optional environment variables
: "${POLICY_NAME:=}"
: "${REQUESTED_PERMISSIONS:=}"
: "${REQUESTED_TTL:=}"

# Helper functions
error_exit() {
    echo "::error title=$1::$2"
    exit 1
}

# Fetch OIDC token from GitHub
echo "Fetching OIDC token from GitHub..."
OIDC_TOKEN=$(curl -sS -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
    "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=gate" | jq -r '.value')

if [[ -z "${OIDC_TOKEN}" || "${OIDC_TOKEN}" == "null" ]]; then
    error_exit "OIDC fetch failed" "Failed to retrieve OIDC token from GitHub."
fi

# Build request payload
echo "Building request payload..."
PAYLOAD=$(jq -n \
    --arg oidc_token "${OIDC_TOKEN}" \
    --arg target_repo "${TARGET_REPOSITORY}" \
    '{oidc_token: $oidc_token, target_repository: $target_repo}')

if [[ -n "${POLICY_NAME}" ]]; then
    PAYLOAD=$(echo "${PAYLOAD}" | jq --arg v "${POLICY_NAME}" '.policy_name = $v')
fi

if [[ -n "${REQUESTED_PERMISSIONS}" ]]; then
    if ! jq empty <<< "${REQUESTED_PERMISSIONS}" >/dev/null 2>&1; then
        error_exit "Invalid permissions" "requested-permissions must be valid JSON"
    fi
    PAYLOAD=$(echo "${PAYLOAD}" | jq --argjson v "${REQUESTED_PERMISSIONS}" '.requested_permissions = $v')
fi

if [[ -n "${REQUESTED_TTL}" ]]; then
    PAYLOAD=$(echo "${PAYLOAD}" | jq --argjson v "${REQUESTED_TTL}" '.requested_ttl = $v')
fi

# Exchange token with GATE server
echo "Exchanging token with GATE server..."
SERVER_URL="${GATE_SERVER_URL%/}"
ENDPOINT="${SERVER_URL}/api/v1/exchange"

RESPONSE=$(mktemp)
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "${RESPONSE}" \
    "${ENDPOINT}" \
    -H 'Content-Type: application/json' \
    -d "${PAYLOAD}")

if [[ "${HTTP_CODE}" -ge 200 && "${HTTP_CODE}" -lt 300 ]]; then
    TOKEN=$(jq -r '.token' "${RESPONSE}")
    EXPIRES_AT=$(jq -r '.expires_at' "${RESPONSE}")
    MATCHED_POLICY=$(jq -r '.matched_policy' "${RESPONSE}")
    PERMISSIONS=$(jq -c '.permissions' "${RESPONSE}")
    REQUEST_ID=$(jq -r '.request_id' "${RESPONSE}")

    # Set outputs
    echo "token=${TOKEN}" >> "${GITHUB_OUTPUT}"
    echo "expires_at=${EXPIRES_AT}" >> "${GITHUB_OUTPUT}"
    echo "matched_policy=${MATCHED_POLICY}" >> "${GITHUB_OUTPUT}"
    echo "permissions=${PERMISSIONS}" >> "${GITHUB_OUTPUT}"
    echo "request_id=${REQUEST_ID}" >> "${GITHUB_OUTPUT}"
else
    ERROR_CODE=$(jq -r '.error_code // "unknown"' "${RESPONSE}" 2>/dev/null || echo "unknown")
    ERROR_MSG=$(jq -r '.error // "No error message"' "${RESPONSE}" 2>/dev/null || echo "HTTP ${HTTP_CODE}")
    error_exit "Token exchange failed (HTTP ${HTTP_CODE})" "${ERROR_CODE}: ${ERROR_MSG}"
fi
