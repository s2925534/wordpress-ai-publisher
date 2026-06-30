import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { classifyErrorStatus, formatErrorMessage, redactSecrets } from '@/lib/error-utils';

describe('error utils', () => {
  it('redacts exact secret values from messages', () => {
    expect(redactSecrets('token abc123', ['abc123'])).toBe('token [redacted]');
  });

  it('formats zod validation errors with field context', () => {
    const schema = z.object({ name: z.string().min(3) });
    const parsed = schema.safeParse({ name: 'a' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(formatErrorMessage(parsed.error)).toContain('name');
      expect(classifyErrorStatus(parsed.error)).toBe(400);
    }
  });
});
