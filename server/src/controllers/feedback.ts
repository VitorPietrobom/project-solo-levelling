import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function createFeedback(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { message, page } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    if (message.length > 4000) {
      res.status(400).json({ error: 'Message is too long' });
      return;
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        message: message.trim(),
        page: typeof page === 'string' && page.trim() ? page.trim() : null,
      },
    });

    res.status(201).json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
