import { Request, Response } from 'express';

type Handler = (req: Request, res: Response) => Promise<void>;

/**
 * Express 4 doesn't forward rejected promises, so an async handler that throws
 * (e.g. a Prisma error) would leave the request hanging until the platform
 * timeout. Wrap it so any rejection is logged and answered with a 500 JSON.
 */
export function handleAsync(label: string, fn: Handler): Handler {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error(`${label} failed:`, err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  };
}
