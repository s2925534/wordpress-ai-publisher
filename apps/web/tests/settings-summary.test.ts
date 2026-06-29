import { describe, expect, it } from 'vitest';

import { buildSettingsCompletionStatus } from '@/lib/settings-summary';

describe('buildSettingsCompletionStatus', () => {
  it('reports missing settings', () => {
    const status = buildSettingsCompletionStatus({});
    expect(status.configured).toBe(false);
    expect(status.missing).toContain('OpenAI API key');
  });

  it('reports configuration as complete when all required values exist', () => {
    const status = buildSettingsCompletionStatus({
      appUrl: 'http://localhost:3000',
      openAiKey: 'key',
      wordpressSiteUrl: 'https://example.com',
      wordpressUsername: 'user',
      wordpressPassword: 'pass',
      pluginToken: 'token'
    });
    expect(status.configured).toBe(true);
    expect(status.missing).toHaveLength(0);
  });
});
