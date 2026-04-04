import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from './apiClient';

function mockResponse(status: number, body?: unknown, ok?: boolean): Response {
  return {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    text: () => Promise.resolve(body != null ? JSON.stringify(body) : ''),
    json: () => Promise.resolve(body),
  } as Response;
}

// Create a proper localStorage mock since jsdom may not provide one
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', storageMock);
    storageMock.clear();
    vi.clearAllMocks();
    // Reset location
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  it('injects Authorization header when token exists', async () => {
    storageMock.setItem('token', 'my-jwt-token');
    vi.mocked(fetch).mockResolvedValue(mockResponse(200, { ok: true }));

    await apiClient.get('/api/test');

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer my-jwt-token',
      }),
    }));
  });

  it('does not inject Authorization header when no token', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(200, { ok: true }));

    await apiClient.get('/api/test');

    const callHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(callHeaders.Authorization).toBeUndefined();
  });

  it('clears token and redirects to /login on 401', async () => {
    storageMock.setItem('token', 'expired-token');
    vi.mocked(fetch).mockResolvedValue(mockResponse(401, null, false));

    await expect(apiClient.get('/api/protected')).rejects.toThrow('Unauthorized');

    expect(storageMock.removeItem).toHaveBeenCalledWith('token');
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

  it('PUT retries once on failure', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResponse(200, { updated: true }));

    const result = await apiClient.put('/api/items/1', { body: { name: 'updated' } });

    expect(result).toEqual({ updated: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('DELETE retries once on failure', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResponse(204));

    await apiClient.delete('/api/items/1');

    expect(fetch).toHaveBeenCalledTimes(2);
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
