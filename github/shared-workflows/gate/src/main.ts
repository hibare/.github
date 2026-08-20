import * as core from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { GateExchangeRequest, GateExchangeResponse, GateErrorResponse } from './types';

export async function run(): Promise<void> {
  try {
    const gateServerUrl = core.getInput('gate-server-url', { required: true }).trim();
    const targetRepository = core.getInput('target-repository', { required: true }).trim();
    const policyName = core.getInput('policy-name').trim();
    const requestedPermissionsRaw = core.getInput('requested-permissions').trim();
    const requestedTtlRaw = core.getInput('requested-ttl').trim();
    const revokeToken = core.getBooleanInput('revoke-token');

    // Retrieve OIDC token from GitHub with audience 'gate'
    core.info('Fetching OIDC token from GitHub...');
    let oidcToken: string;
    try {
      oidcToken = await core.getIDToken('gate');
    } catch (err) {
      throw new Error(
        `Failed to retrieve OIDC token from GitHub. Ensure the workflow has 'permissions: { id-token: write }'. Details: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    if (!oidcToken) {
      throw new Error('OIDC token retrieved from GitHub is empty.');
    }

    // Mask the OIDC token immediately
    core.setSecret(oidcToken);

    // Build payload
    const payload: GateExchangeRequest = {
      oidc_token: oidcToken,
      target_repository: targetRepository
    };

    if (policyName) {
      payload.policy_name = policyName;
    }

    if (requestedPermissionsRaw) {
      try {
        const parsed = JSON.parse(requestedPermissionsRaw);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('requested-permissions must be a valid JSON object (e.g. {"contents":"read"})');
        }
        payload.requested_permissions = parsed;
      } catch (err) {
        throw new Error(
          `Invalid JSON for requested-permissions: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (requestedTtlRaw) {
      const parsedTtl = parseInt(requestedTtlRaw, 10);
      if (isNaN(parsedTtl) || parsedTtl <= 0) {
        throw new Error(`requested-ttl must be a positive integer, got: '${requestedTtlRaw}'`);
      }
      payload.requested_ttl = parsedTtl;
    }

    // Send exchange request to GATE server
    const serverUrl = gateServerUrl.replace(/\/+$/, '');
    const endpoint = `${serverUrl}/api/v1/exchange`;

    core.info(`Exchanging token with GATE server at ${endpoint}...`);
    const http = new HttpClient('hibare-gate-action');
    const response = await http.post(endpoint, JSON.stringify(payload), {
      'Content-Type': 'application/json'
    });

    const statusCode = response.message.statusCode ?? 500;
    const body = await response.readBody();

    if (statusCode >= 200 && statusCode < 300) {
      let data: GateExchangeResponse;
      try {
        data = JSON.parse(body) as GateExchangeResponse;
      } catch (err) {
        throw new Error(`Failed to parse GATE response JSON: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!data.token) {
        throw new Error('GATE server response did not contain a token.');
      }

      // Mask the returned installation token
      core.setSecret(data.token);

      // Save state for post-step cleanup
      core.saveState('token', data.token);
      core.saveState('revoke-token', String(revokeToken));

      // Set outputs
      core.setOutput('token', data.token);
      core.setOutput('expires-at', data.expires_at || '');
      core.setOutput('matched-policy', data.matched_policy || '');
      core.setOutput('permissions', JSON.stringify(data.permissions || {}));
      core.setOutput('request-id', data.request_id || '');

      core.info('Successfully exchanged OIDC token for GitHub App installation token.');
    } else {
      let errorCode = 'unknown';
      let errorMessage = `HTTP ${statusCode}`;

      try {
        const errorData = JSON.parse(body) as GateErrorResponse;
        if (errorData.error_code) {
          errorCode = errorData.error_code;
        }
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message || errorMessage;
        }
      } catch {
        if (body.trim()) {
          errorMessage = body.trim();
        }
      }

      throw new Error(`Token exchange failed (HTTP ${statusCode}): [${errorCode}] ${errorMessage}`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}
