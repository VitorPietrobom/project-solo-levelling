import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../index';
import prisma from '../lib/prisma';
import { JWT_SECRET } from '../middleware/auth';

vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
};

describe('Auth endpoints', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('returns JWT for valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
        totalXP: 0,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toEqual({ id: 'user-1', email: 'test@example.com' });

      const decoded = jwt.verify(res.body.token, JWT_SECRET) as any;
      expect(decoded.id).toBe('user-1');
      expect(decoded.email).toBe('test@example.com');
    });

    it('returns 401 for invalid email', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 401 for invalid password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
        totalXP: 0,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 400 when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password are required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns success message', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user info with valid token', async () => {
      const token = jwt.sign({ id: 'user-1', email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '1h',
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: 'user-1', email: 'test@example.com' });
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing or invalid authorization header');
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    it('returns 403 with expired token', async () => {
      const token = jwt.sign({ id: 'user-1', email: 'test@example.com' }, JWT_SECRET, {
        expiresIn: '0s',
      });

      // Small delay to ensure token is expired
      await new Promise((resolve) => setTimeout(resolve, 50));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Token expired');
    });
  });
});
