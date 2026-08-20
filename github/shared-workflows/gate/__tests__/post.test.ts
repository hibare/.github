import * as core from '@actions/core';
import { HttpClient } from '@actions/http-client';
import { runPost } from '../src/post';

jest.mock('@actions/core');
jest.mock('@actions/http-client');

describe('gate action post', () => {
  const mockedCore = core as jest.Mocked<typeof core>;
  const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip revocation if no token is stored in state', async () => {
    mockedCore.getState.mockReturnValue('');

    await runPost();

    expect(MockedHttpClient.prototype.request).not.toHaveBeenCalled();
    expect(mockedCore.debug).toHaveBeenCalledWith(
      'No GATE installation token found in step state to revoke.'
    );
  });

  it('should skip revocation if revoke-token is false', async () => {
    mockedCore.getState.mockImplementation((name: string) => {
      if (name === 'token') return 'ghs_mocktoken123';
      if (name === 'revoke-token') return 'false';
      return '';
    });

    await runPost();

    expect(MockedHttpClient.prototype.request).not.toHaveBeenCalled();
    expect(mockedCore.info).toHaveBeenCalledWith(
      'GATE token revocation skipped (revoke-token is disabled).'
    );
  });

  it('should successfully revoke token when present', async () => {
    mockedCore.getState.mockImplementation((name: string) => {
      if (name === 'token') return 'ghs_mocktoken123';
      if (name === 'revoke-token') return 'true';
      return '';
    });

    const mockRequest = jest.fn().mockResolvedValue({
      message: { statusCode: 204 },
      readBody: jest.fn().mockResolvedValue('')
    });
    MockedHttpClient.prototype.request = mockRequest;

    await runPost();

    expect(mockRequest).toHaveBeenCalledWith(
      'DELETE',
      'https://api.github.com/installation/token',
      '',
      {
        Authorization: 'Bearer ghs_mocktoken123',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    );

    expect(mockedCore.info).toHaveBeenCalledWith(
      'GATE installation token revoked successfully.'
    );
  });

  it('should handle already revoked/expired tokens (HTTP 404)', async () => {
    mockedCore.getState.mockImplementation((name: string) => {
      if (name === 'token') return 'ghs_mocktoken123';
      if (name === 'revoke-token') return 'true';
      return '';
    });

    const mockRequest = jest.fn().mockResolvedValue({
      message: { statusCode: 404 },
      readBody: jest.fn().mockResolvedValue('')
    });
    MockedHttpClient.prototype.request = mockRequest;

    await runPost();

    expect(mockedCore.info).toHaveBeenCalledWith(
      'GATE installation token is already expired or revoked.'
    );
  });

  it('should issue warning if revocation fails with error code', async () => {
    mockedCore.getState.mockImplementation((name: string) => {
      if (name === 'token') return 'ghs_mocktoken123';
      if (name === 'revoke-token') return 'true';
      return '';
    });

    const mockRequest = jest.fn().mockResolvedValue({
      message: { statusCode: 500 },
      readBody: jest.fn().mockResolvedValue('Internal server error')
    });
    MockedHttpClient.prototype.request = mockRequest;

    await runPost();

    expect(mockedCore.warning).toHaveBeenCalledWith(
      'Failed to revoke GATE token (HTTP 500): Internal server error'
    );
  });
});
