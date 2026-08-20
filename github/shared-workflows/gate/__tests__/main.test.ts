import * as core from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { run } from '../src/main';

jest.mock('@actions/core');
jest.mock('@actions/http-client');

describe('gate action main', () => {
  const mockedCore = core as jest.Mocked<typeof core>;
  const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockedCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'gate-server-url':
          return 'https://gate.example.com';
        case 'target-repository':
          return 'owner/repo';
        case 'policy-name':
          return 'ci-policy';
        case 'requested-permissions':
          return '{"contents":"read"}';
        case 'requested-ttl':
          return '300';
        default:
          return '';
      }
    });

    mockedCore.getBooleanInput.mockImplementation((name: string) => {
      if (name === 'revoke-token') return true;
      return false;
    });

    mockedCore.getIDToken.mockResolvedValue('mock-oidc-token');
  });

  it('should successfully exchange token and set outputs', async () => {
    const mockPost = jest.fn().mockResolvedValue({
      message: { statusCode: 200 },
      readBody: jest.fn().mockResolvedValue(
        JSON.stringify({
          token: 'ghs_mock123456789',
          expires_at: '2026-08-20T21:00:00Z',
          matched_policy: 'ci-policy',
          permissions: { contents: 'read' },
          request_id: 'req-abc-123'
        })
      )
    });

    MockedHttpClient.prototype.post = mockPost;

    await run();

    expect(mockedCore.getIDToken).toHaveBeenCalledWith('gate');
    expect(mockedCore.setSecret).toHaveBeenCalledWith('mock-oidc-token');
    expect(mockedCore.setSecret).toHaveBeenCalledWith('ghs_mock123456789');

    expect(mockPost).toHaveBeenCalledWith(
      'https://gate.example.com/api/v1/exchange',
      JSON.stringify({
        oidc_token: 'mock-oidc-token',
        target_repository: 'owner/repo',
        policy_name: 'ci-policy',
        requested_permissions: { contents: 'read' },
        requested_ttl: 300
      }),
      { 'Content-Type': 'application/json' }
    );

    expect(mockedCore.saveState).toHaveBeenCalledWith('token', 'ghs_mock123456789');
    expect(mockedCore.saveState).toHaveBeenCalledWith('revoke-token', 'true');

    expect(mockedCore.setOutput).toHaveBeenCalledWith('token', 'ghs_mock123456789');
    expect(mockedCore.setOutput).toHaveBeenCalledWith('expires-at', '2026-08-20T21:00:00Z');
    expect(mockedCore.setOutput).toHaveBeenCalledWith('matched-policy', 'ci-policy');
    expect(mockedCore.setOutput).toHaveBeenCalledWith('permissions', JSON.stringify({ contents: 'read' }));
    expect(mockedCore.setOutput).toHaveBeenCalledWith('request-id', 'req-abc-123');
    expect(mockedCore.setFailed).not.toHaveBeenCalled();
  });

  it('should fail if OIDC token fetch fails', async () => {
    mockedCore.getIDToken.mockRejectedValue(new Error('Permission denied'));

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("Failed to retrieve OIDC token from GitHub. Ensure the workflow has 'permissions: { id-token: write }'")
    );
  });

  it('should fail if requested-permissions is invalid JSON', async () => {
    mockedCore.getInput.mockImplementation((name: string) => {
      if (name === 'gate-server-url') return 'https://gate.example.com';
      if (name === 'target-repository') return 'owner/repo';
      if (name === 'requested-permissions') return '{invalid-json}';
      return '';
    });

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Invalid JSON for requested-permissions')
    );
  });

  it('should fail if requested-ttl is not a valid positive number', async () => {
    mockedCore.getInput.mockImplementation((name: string) => {
      if (name === 'gate-server-url') return 'https://gate.example.com';
      if (name === 'target-repository') return 'owner/repo';
      if (name === 'requested-ttl') return '-50';
      return '';
    });

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('requested-ttl must be a positive integer')
    );
  });

  it('should handle GATE server error responses', async () => {
    const mockPost = jest.fn().mockResolvedValue({
      message: { statusCode: 403 },
      readBody: jest.fn().mockResolvedValue(
        JSON.stringify({
          error: 'No policy matched',
          error_code: 'ERR_UNAUTHORIZED'
        })
      )
    });

    MockedHttpClient.prototype.post = mockPost;

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      'Token exchange failed (HTTP 403): [ERR_UNAUTHORIZED] No policy matched'
    );
  });
});
