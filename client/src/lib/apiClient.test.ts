import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.fn();
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

import { apiClient, ApiError } from './apiClient';

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
    (window as any).location = { href: '' };
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'sb-token' } } });
  });

  it('injects Authorization header from Supabase session', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(200, { ok: true }));

    await apiClient.get('/api/test');

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer sb-token',
      }),
    }));
  });

  it('does not inject Authorization header when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
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

  it('POST retries once on failure then succeeds', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResponse(200, { saved: true }));

    const result = await apiClient.post('/api/items', { body: { name: 'test' } });

    expect(result).toEqual({ saved: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('POST retries once and throws if retry also fails', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Still failing'));

    await expect(
      apiClient.post('/api/items', { body: { name: 'test' } }),
    ).rejects.toThrow('Still failing');

    expect(fetch).toHaveBeenCalledTimes(2);
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
