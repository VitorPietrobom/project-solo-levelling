import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

vi.mock('../lib/prisma', () => ({
  default: {
    trainingProgram: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

describe('Training program endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/training-programs', () => {
    it('returns programs with nested days and exercises', async () => {
      const programs = [
        {
          id: 'tp1',
          userId: 'test-user-id',
          name: 'Push Pull Legs',
          active: true,
          createdAt: '2024-01-15T00:00:00.000Z',
          days: [
            {
              id: 'd1',
              programId: 'tp1',
              dayOfWeek: 'mon',
              exercises: [
                { id: 'pe1', programDayId: 'd1', name: 'Bench Press', sets: 4, reps: 8, targetWeight: 80, sortOrder: 0 },
              ],
            },
          ],
        },
      ];
      (prisma.trainingProgram.findMany as any).mockResolvedValue(programs);

      const res = await request(app).get('/api/training-programs');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Push Pull Legs');
      expect(res.body[0].days[0].dayOfWeek).toBe('mon');
      expect(res.body[0].days[0].exercises[0].name).toBe('Bench Press');
    });

    it('returns empty array when no programs exist', async () => {
      (prisma.trainingProgram.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/training-programs');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/training-programs', () => {
    it('creates a program with days and exercises', async () => {
      const created = {
        id: 'tp1',
        userId: 'test-user-id',
        name: 'Upper Lower',
        active: false,
        createdAt: '2024-01-15T00:00:00.000Z',
        days: [
          {
            id: 'd1',
            programId: 'tp1',
            dayOfWeek: 'mon',
            exercises: [
              { id: 'pe1', programDayId: 'd1', name: 'Squat', sets: 5, reps: 5, targetWeight: 100, sortOrder: 0 },
              { id: 'pe2', programDayId: 'd1', name: 'Leg Press', sets: 3, reps: 12, targetWeight: 150, sortOrder: 1 },
            ],
          },
        ],
      };
      (prisma.trainingProgram.create as any).mockResolvedValue(created);

      const res = await request(app)
        .post('/api/training-programs')
        .send({
          name: 'Upper Lower',
          days: [
            {
              dayOfWeek: 'mon',
              exercises: [
                { name: 'Squat', sets: 5, reps: 5, targetWeight: 100 },
                { name: 'Leg Press', sets: 3, reps: 12, targetWeight: 150 },
              ],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Upper Lower');
      expect(res.body.days[0].exercises).toHaveLength(2);
      expect(res.body.days[0].exercises[0].sortOrder).toBe(0);
      expect(res.body.days[0].exercises[1].sortOrder).toBe(1);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/training-programs')
        .send({ days: [{ dayOfWeek: 'mon', exercises: [] }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    it('returns 400 when days are missing', async () => {
      const res = await request(app)
        .post('/api/training-programs')
        .send({ name: 'Test Program' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('At least one day is required');
    });

    it('returns 400 when days array is empty', async () => {
      const res = await request(app)
        .post('/api/training-programs')
        .send({ name: 'Test Program', days: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('At least one day is required');
    });
  });

  describe('PATCH /api/training-programs/:id/activate', () => {
    it('deactivates all programs and activates the specified one', async () => {
      const program = { id: 'tp1', userId: 'test-user-id', name: 'PPL', active: false };
      (prisma.trainingProgram.findFirst as any).mockResolvedValue(program);
      (prisma.trainingProgram.updateMany as any).mockResolvedValue({ count: 2 });

      const activated = {
        ...program,
        active: true,
        days: [
          {
            id: 'd1',
            programId: 'tp1',
            dayOfWeek: 'mon',
            exercises: [],
          },
        ],
      };
      (prisma.trainingProgram.update as any).mockResolvedValue(activated);

      const res = await request(app).patch('/api/training-programs/tp1/activate');

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(true);
      expect(prisma.trainingProgram.updateMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        data: { active: false },
      });
      expect(prisma.trainingProgram.update).toHaveBeenCalledWith({
        where: { id: 'tp1' },
        data: { active: true },
        include: expect.any(Object),
      });
    });

    it('returns 404 when program not found', async () => {
      (prisma.trainingProgram.findFirst as any).mockResolvedValue(null);

      const res = await request(app).patch('/api/training-programs/nonexistent/activate');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Training program not found');
    });
  });

  describe('DELETE /api/training-programs/:id', () => {
    it('deletes a program owned by the user', async () => {
      const program = { id: 'tp1', userId: 'test-user-id', name: 'Old Program', active: false };
      (prisma.trainingProgram.findFirst as any).mockResolvedValue(program);
      (prisma.trainingProgram.delete as any).mockResolvedValue(program);

      const res = await request(app).delete('/api/training-programs/tp1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Training program deleted');
    });

    it('returns 404 when program not found', async () => {
      (prisma.trainingProgram.findFirst as any).mockResolvedValue(null);

      const res = await request(app).delete('/api/training-programs/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Training program not found');
    });
  });
});
