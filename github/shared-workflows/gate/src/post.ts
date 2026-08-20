import * as core from '@actions/core';
import { HttpClient } from '@actions/http-client';

export async function runPost(): Promise<void> {
  try {
    const token = core.getState('token');
    const revokeTokenState = core.getState('revoke-token');

    if (!token) {
      core.debug('No GATE installation token found in step state to revoke.');
      return;
    }

    if (revokeTokenState === 'false') {
      core.info('GATE token revocation skipped (revoke-token is disabled).');
      return;
    }

    core.info('Revoking GATE installation token via GitHub API...');
    const http = new HttpClient('hibare-gate-action');
    const response = await http.request(
      'DELETE',
      'https://api.github.com/installation/token',
      '',
      {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    );

    const statusCode = response.message.statusCode ?? 500;

    if (statusCode === 204 || statusCode === 200) {
      core.info('GATE installation token revoked successfully.');
    } else if (statusCode === 404 || statusCode === 401) {
      core.info('GATE installation token is already expired or revoked.');
    } else {
      const body = await response.readBody();
      core.warning(`Failed to revoke GATE token (HTTP ${statusCode}): ${body}`);
    }
  } catch (error) {
    // Post cleanup should log warnings rather than failing the overall workflow
    core.warning(
      `Error during GATE token revocation: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
