import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    gymSession: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('../middleware/auth', async () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import prisma from '../lib/prisma';

describe('Gym session endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/gym-sessions', () => {
    it('returns recent sessions with exercises and muscle groups', async () => {
      const sessions = [
        {
          id: 'gs1',
          userId: 'test-user-id',
          date: '2024-01-15',
          notes: 'Push day',
          exercises: [
            {
              id: 'e1',
              sessionId: 'gs1',
              name: 'Bench Press',
              sets: 3,
              reps: 10,
              weight: 80,
              muscleGroups: [{ exerciseId: 'e1', muscleGroup: 'chest' }],
            },
          ],
        },
      ];
      (prisma.gymSession.findMany as any).mockResolvedValue(sessions);

      const res = await request(app).get('/api/gym-sessions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].exercises[0].name).toBe('Bench Press');
      expect(res.body[0].exercises[0].muscleGroups[0].muscleGroup).toBe('chest');
      expect(prisma.gymSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { date: 'desc' },
        take: 20,
        include: {
          exercises: {
            include: { muscleGroups: true },
          },
        },
      });
    });

    it('returns empty array when no sessions exist', async () => {
      (prisma.gymSession.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/gym-sessions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/gym-sessions', () => {
    it('creates a session with exercises and muscle groups', async () => {
      const created = {
        id: 'gs1',
        userId: 'test-user-id',
        date: '2024-01-15',
        notes: 'Push day',
        exercises: [
          {
            id: 'e1',
            sessionId: 'gs1',
            name: 'Bench Press',
            sets: 3,
            reps: 10,
            weight: 80,
            muscleGroups: [{ exerciseId: 'e1', muscleGroup: 'chest' }],
          },
        ],
      };
      (prisma.gymSession.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/gym-sessions')
        .send({
          date: '2024-01-15',
          notes: 'Push day',
          exercises: [
            { name: 'Bench Press', sets: 3, reps: 10, weight: 80, muscleGroups: ['chest'] },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.exercises[0].name).toBe('Bench Press');
    });

    it('returns 400 when date is missing', async () => {
      const res = await request(app)
        .post('/api/gym-sessions')
        .send({
          exercises: [
            { name: 'Bench Press', sets: 3, reps: 10, weight: 80, muscleGroups: ['chest'] },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Date is required');
    });

    it('returns 400 when exercises are missing', async () => {
      const res = await request(app)
        .post('/api/gym-sessions')
        .send({ date: '2024-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('At least one exercise is required');
    });

    it('returns 400 when exercises array is empty', async () => {
      const res = await request(app)
        .post('/api/gym-sessions')
        .send({ date: '2024-01-15', exercises: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('At least one exercise is required');
    });

    it('creates session without notes', async () => {
      const created = {
        id: 'gs1',
        userId: 'test-user-id',
        date: '2024-01-15',
        notes: null,
        exercises: [
          {
            id: 'e1',
            sessionId: 'gs1',
            name: 'Squat',
            sets: 5,
            reps: 5,
            weight: 100,
            muscleGroups: [{ exerciseId: 'e1', muscleGroup: 'quads' }],
          },
        ],
      };
      (prisma.gymSession.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/gym-sessions')
        .send({
          date: '2024-01-15',
          exercises: [
            { name: 'Squat', sets: 5, reps: 5, weight: 100, muscleGroups: ['quads'] },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.notes).toBeNull();
    });
  });

  describe('GET /api/gym-sessions/heatmap', () => {
    it('returns soreness data per muscle group', async () => {
      const now = new Date();
      const sessions = [
        {
          id: 'gs1',
          userId: 'test-user-id',
          date: now,
          notes: null,
          exercises: [
            {
              id: 'e1',
              sessionId: 'gs1',
              name: 'Bench Press',
              sets: 3,
              reps: 10,
              weight: 80,
              muscleGroups: [{ exerciseId: 'e1', muscleGroup: 'chest' }],
            },
          ],
        },
      ];
      (prisma.gymSession.findMany as any).mockResolvedValue(sessions);

      const res = await request(app).get('/api/gym-sessions/heatmap');

      expect(res.status).toBe(200);
      expect(res.body.chest).toBe(100);
    });

    it('returns empty object when no recent sessions', async () => {
      (prisma.gymSession.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/gym-sessions/heatmap');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
  });
});
