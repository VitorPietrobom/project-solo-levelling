import { PrismaClient } from '@prisma/client';

// Prevent multiple PrismaClient instances in serverless hot-reload cycles
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
