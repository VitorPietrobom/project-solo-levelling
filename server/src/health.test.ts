import { vi } from 'vitest';
import request from 'supertest';

vi.mock('./lib/supabase', () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));

import app from './index';

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
