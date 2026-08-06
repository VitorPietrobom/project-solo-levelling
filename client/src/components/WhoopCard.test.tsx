import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WhoopCard, { isWhoopSyncStale, WHOOP_STALE_MS } from './WhoopCard';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

describe('isWhoopSyncStale', () => {
  it('treats no sync at all as stale', () => {
    expect(isWhoopSyncStale(null)).toBe(true);
    expect(isWhoopSyncStale(undefined)).toBe(true);
  });

  it('treats an unparsable timestamp as stale', () => {
    expect(isWhoopSyncStale('not-a-date')).toBe(true);
  });

  it('is stale just past the threshold', () => {
    const now = Date.parse('2026-08-06T12:00:00.000Z');
    const syncedAt = new Date(now - WHOOP_STALE_MS - 1).toISOString();
    expect(isWhoopSyncStale(syncedAt, now)).toBe(true);
  });

  it('is fresh just under the threshold', () => {
    const now = Date.parse('2026-08-06T12:00:00.000Z');
    const syncedAt = new Date(now - WHOOP_STALE_MS + 1000).toISOString();
    expect(isWhoopSyncStale(syncedAt, now)).toBe(false);
  });

  it('is fresh for a sync that just happened', () => {
    const now = Date.parse('2026-08-06T12:00:00.000Z');
    expect(isWhoopSyncStale(new Date(now).toISOString(), now)).toBe(false);
  });
});

describe('WhoopCard auto-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/body');
  });

  it('auto-syncs on open when the last sync is stale, without clicking anything', async () => {
    mockGet.mockResolvedValueOnce({ connected: true, syncedAt: '2020-01-01T00:00:00.000Z', latest: null });
    mockPost.mockResolvedValueOnce({ connected: true, syncedAt: new Date().toISOString(), latest: null, weightLogged: false });

    render(<WhoopCard />);

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/whoop/sync'));
  });

  it('does NOT auto-sync when the last sync is still fresh', async () => {
    mockGet.mockResolvedValueOnce({ connected: true, syncedAt: new Date().toISOString(), latest: null });

    render(<WhoopCard />);

    await waitFor(() => expect(screen.getByText('Sync')).toBeInTheDocument());
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('does not sync at all when not connected', async () => {
    mockGet.mockResolvedValueOnce({ connected: false });

    render(<WhoopCard />);

    await waitFor(() => expect(screen.getByText('Connect Whoop')).toBeInTheDocument());
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('refreshes the weight chart when a stale auto-sync logs a new weight', async () => {
    mockGet.mockResolvedValueOnce({ connected: true, syncedAt: null, latest: null });
    mockPost.mockResolvedValueOnce({ connected: true, syncedAt: new Date().toISOString(), latest: null, weightLogged: true });
    const onSynced = vi.fn();

    render(<WhoopCard onSynced={onSynced} />);

    await waitFor(() => expect(onSynced).toHaveBeenCalled());
  });

  it('still syncs exactly once right after the OAuth redirect, even if syncedAt looks fresh', async () => {
    window.history.replaceState({}, '', '/body?whoop=connected');
    mockGet.mockResolvedValueOnce({ connected: true, syncedAt: new Date().toISOString(), latest: null });
    mockPost.mockResolvedValueOnce({ connected: true, syncedAt: new Date().toISOString(), latest: null, weightLogged: false });

    render(<WhoopCard />);

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    // The whoop=connected query param is consumed so a refresh doesn't re-trigger it.
    expect(window.location.search).toBe('');
  });
});
