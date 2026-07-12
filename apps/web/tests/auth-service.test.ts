import { describe, expect, it } from 'vitest';

import { AuthService, hashPassword, verifyPassword } from '@/server/auth-service';

function createMockPrisma() {
  const users: Array<{ id: string; email: string; passwordHash: string | null }> = [];
  const sessions: Array<{ id: string; userId: string; expiresAt: Date }> = [];
  let nextId = 1;

  return {
    prisma: {
      user: {
        async findUnique({ where }: any) {
          return users.find((user) => user.email === where.email) ?? null;
        },
        async upsert({ where, create }: any) {
          const existing = users.find((user) => user.email === where.email);
          if (existing) {
            return existing;
          }
          const created = { id: `user-${nextId++}`, ...create };
          users.push(created);
          return created;
        },
        async count() {
          return users.length;
        },
        async create({ data }: any) {
          const created = { id: `user-${nextId++}`, ...data };
          users.push(created);
          return created;
        }
      },
      session: {
        async create({ data }: any) {
          const created = { id: `session-${nextId++}`, ...data };
          sessions.push(created);
          return created;
        },
        async findUnique({ where, include }: any) {
          const session = sessions.find((item) => item.id === where.id);
          if (!session) {
            return null;
          }
          if (include?.user) {
            return { ...session, user: users.find((user) => user.id === session.userId) ?? null };
          }
          return session;
        },
        async deleteMany({ where }: any) {
          const before = sessions.length;
          const remaining = sessions.filter((session) => session.id !== where.id);
          sessions.length = 0;
          sessions.push(...remaining);
          return { count: before - remaining.length };
        }
      }
    } as any,
    users,
    sessions
  };
}

describe('hashPassword / verifyPassword', () => {
  it('verifies a correct password and rejects an incorrect one', () => {
    const stored = hashPassword('correct horse battery staple');
    expect(verifyPassword('correct horse battery staple', stored)).toBe(true);
    expect(verifyPassword('wrong password', stored)).toBe(false);
  });

  it('produces a different salt (and stored value) for the same password each time', () => {
    const first = hashPassword('same-password');
    const second = hashPassword('same-password');
    expect(first).not.toBe(second);
  });
});

describe('AuthService', () => {
  it('verifies local credentials only when the password matches', async () => {
    const { prisma } = createMockPrisma();
    const service = new AuthService({ prisma });
    await service.ensureBootstrapAdmin('admin@example.com', 'super-secret-1');

    const ok = await service.verifyCredentials('admin@example.com', 'super-secret-1');
    expect(ok?.email).toBe('admin@example.com');

    const bad = await service.verifyCredentials('admin@example.com', 'wrong');
    expect(bad).toBeNull();
  });

  it('only bootstraps the first admin once, and skips when a user already exists', async () => {
    const { prisma, users } = createMockPrisma();
    const service = new AuthService({ prisma });

    const created = await service.ensureBootstrapAdmin('admin@example.com', 'super-secret-1');
    expect(created).not.toBeNull();
    expect(users).toHaveLength(1);

    const secondAttempt = await service.ensureBootstrapAdmin('someone-else@example.com', 'super-secret-2');
    expect(secondAttempt).toBeNull();
    expect(users).toHaveLength(1);
  });

  it('creates a session and can look up the owning user until it expires', async () => {
    const { prisma } = createMockPrisma();
    const service = new AuthService({ prisma });
    const user = await service.ensureBootstrapAdmin('admin@example.com', 'super-secret-1');

    const session = await service.createSession(user!.id);
    const found = await service.getSessionUser(session.id);
    expect(found?.email).toBe('admin@example.com');

    await service.destroySession(session.id);
    const afterDestroy = await service.getSessionUser(session.id);
    expect(afterDestroy).toBeNull();
  });

  it('treats an expired session as invalid', async () => {
    const { prisma, sessions } = createMockPrisma();
    const service = new AuthService({ prisma });
    const user = await service.ensureBootstrapAdmin('admin@example.com', 'super-secret-1');
    const session = await service.createSession(user!.id);

    sessions.find((item) => item.id === session.id)!.expiresAt = new Date(Date.now() - 1000);

    const found = await service.getSessionUser(session.id);
    expect(found).toBeNull();
  });

  it('matches an existing OIDC user by email instead of creating a duplicate', async () => {
    const { prisma, users } = createMockPrisma();
    const service = new AuthService({ prisma });
    await service.ensureBootstrapAdmin('admin@example.com', 'super-secret-1');

    const matched = await service.findOrCreateOidcUser('Admin@Example.com');
    expect(matched.email).toBe('admin@example.com');
    expect(users).toHaveLength(1);
  });
});
