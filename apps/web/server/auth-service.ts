import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

export { SESSION_COOKIE_NAME } from '@/lib/session-cookie';

type AuthPrisma = Pick<PrismaClient, 'user' | 'session'>;

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, derivedHex] = stored.split(':');
  if (!salt || !derivedHex) {
    return false;
  }

  const expected = Buffer.from(derivedHex, 'hex');
  const candidate = scryptSync(password, salt, expected.length);
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export class AuthService {
  private readonly prisma: AuthPrisma;

  constructor(deps: { prisma?: AuthPrisma } = {}) {
    this.prisma = deps.prisma ?? getDefaultPrisma();
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async verifyCredentials(email: string, password: string) {
    const user = await this.findUserByEmail(email);
    if (!user?.passwordHash) {
      return null;
    }

    return verifyPassword(password, user.passwordHash) ? user : null;
  }

  async findOrCreateOidcUser(email: string) {
    const normalized = email.toLowerCase();
    return this.prisma.user.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized, passwordHash: null }
    });
  }

  async createSession(userId: string) {
    return this.prisma.session.create({
      data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) }
    });
  }

  async getSessionUser(sessionId: string) {
    if (!sessionId) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.user;
  }

  async destroySession(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async ensureBootstrapAdmin(email: string, password: string) {
    const existing = await this.prisma.user.count();
    if (existing > 0) {
      return null;
    }

    return this.prisma.user.create({
      data: { email: email.toLowerCase(), passwordHash: hashPassword(password) }
    });
  }
}

function getDefaultPrisma() {
  return require('@/lib/prisma').prisma as PrismaClient;
}
