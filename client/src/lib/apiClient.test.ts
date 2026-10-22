import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthToken = vi.fn();
const mockSignOut = vi.fn();
vi.mock('./neonAuth', () => ({
  getAuthToken: () => mockGetAuthToken(),
  authClient: { signOut: () => mockSignOut() },
}));

import { apiClient, ApiError, resetUnauthorizedRedirectForTests } from './apiClient';

function mockResponse(status: number, body?: unknown, ok?: boolean): Response {
  return {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    text: () => Promise.resolve(body != null ? JSON.stringify(body) : ''),
    json: () => Promise.resolve(body),
  } as Response;
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    delete (window as any).location;
    (window as any).location = { href: '', pathname: '/' };
    resetUnauthorizedRedirectForTests();
    mockSignOut.mockResolvedValue(undefined);
    mockGetAuthToken.mockResolvedValue('neon-token');
  });

  it('injects Authorization header from Neon Auth token', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(200, { ok: true }));

    await apiClient.get('/api/test');

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer neon-token',
      }),
    }));
  });

  it('does not inject Authorization header when no session', async () => {
    mockGetAuthToken.mockResolvedValue(null);
    vi.mocked(fetch).mockResolvedValue(mockResponse(200, { ok: true }));

    await apiClient.get('/api/test');

    const callHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(callHeaders.Authorization).toBeUndefined();
  });

  it('redirects to /login on 401', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(401, null, false));

    await expect(apiClient.get('/api/protected')).rejects.toThrow('Unauthorized');
    expect(window.location.href).toBe('/login');
  });

  it('signs out of Better Auth before redirecting on 401', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(401, null, false));

    await expect(apiClient.get('/api/protected')).rejects.toThrow('Unauthorized');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('still redirects on 401 when signOut fails', async () => {
    mockSignOut.mockRejectedValue(new Error('offline'));
    vi.mocked(fetch).mockResolvedValue(mockResponse(401, null, false));

    await expect(apiClient.get('/api/protected')).rejects.toThrow('Unauthorized');
    expect(window.location.href).toBe('/login');
  });

  it('only signs out and redirects once for parallel 401s', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(401, null, false));
    const hrefSet = vi.fn();
    Object.defineProperty(window.location, 'href', { set: hrefSet, get: () => '' });

    await Promise.allSettled([
      apiClient.get('/api/a'),
      apiClient.get('/api/b'),
      apiClient.get('/api/c'),
    ]);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(hrefSet).toHaveBeenCalledTimes(1);
  });

  it('does not redirect on 401 when already on /login', async () => {
    (window as any).location = { href: '', pathname: '/login' };
    vi.mocked(fetch).mockResolvedValue(mockResponse(401, null, false));

    await expect(apiClient.get('/api/protected')).rejects.toThrow('Unauthorized');
    expect(window.location.href).toBe('');
  });

  it('throws ApiError with server message on 4xx', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(422, { error: 'Validation failed' }, false),
    );

    try {
      await apiClient.get('/api/data');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).message).toBe('Validation failed');
      expect((e as ApiError).status).toBe(422);
    }
  });

  it('throws generic message on 5xx', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(500, null, false));
    await expect(apiClient.get('/api/data')).rejects.toThrow('Something went wrong');
  });

  it('POST that gets a 500 is sent exactly once and throws ApiError', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(500, null, false));

    await expect(
      apiClient.post('/api/items', { body: { name: 'test' } }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('POST does NOT retry when fetch rejects', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResponse(200, { saved: true }));

    await expect(
      apiClient.post('/api/items', { body: { name: 'test' } }),
    ).rejects.toThrow('Network error');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('PATCH does NOT retry when fetch rejects', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    await expect(apiClient.patch('/api/items/1', { body: {} })).rejects.toThrow('Network error');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('DELETE retries once when fetch rejects, then succeeds', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResponse(200, { deleted: true }));

    const result = await apiClient.delete('/api/items/1');

    expect(result).toEqual({ deleted: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('PUT retries once and throws if retry also fails', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Still failing'));

    await expect(apiClient.put('/api/items/1', { body: {} })).rejects.toThrow('Still failing');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('PUT that gets a 400 is not retried', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(400, { error: 'Bad input' }, false));

    await expect(apiClient.put('/api/items/1', { body: {} })).rejects.toThrow('Bad input');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('GET does NOT retry on failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    await expect(apiClient.get('/api/items')).rejects.toThrow('Network error');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sends JSON body with Content-Type header for POST', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(200, { id: 1 }));

    await apiClient.post('/api/items', { body: { name: 'test' } });

    expect(fetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ name: 'test' }),
    }));
  });
});
