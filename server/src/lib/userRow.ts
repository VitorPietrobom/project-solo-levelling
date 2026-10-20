import prisma from './prisma';

// User.email is @unique. If a different account (another `sub`) already owns
// this email — e.g. the auth account was deleted and recreated — the create
// branch of the upsert fails with P2002 on email. We don't silently re-link
// the old row (that would hand the new identity someone else's data), so
// callers surface a clear 409 instead of a permanent 500.
export class EmailConflictError extends Error {
  constructor() {
    super('Email already linked to another account');
  }
}

export const EMAIL_CONFLICT_BODY = {
  error: 'This email is already linked to another account. Contact support.',
  code: 'EMAIL_CONFLICT',
};

export function isEmailUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; meta?: { target?: unknown } };
  if (e.code !== 'P2002') return false;
  const target = e.meta?.target;
  if (Array.isArray(target)) return target.includes('email');
  if (typeof target === 'string') return target.includes('email');
  return false;
}

// Find-or-create the user row keyed on the JWT `sub`.
export async function upsertUserRow(id: string, email: string) {
  try {
    return await prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, email, activated: false },
    });
  } catch (err) {
    if (isEmailUniqueViolation(err)) throw new EmailConflictError();
    throw err;
  }
}
