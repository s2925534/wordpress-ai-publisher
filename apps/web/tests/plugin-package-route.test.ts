import { describe, expect, it, vi } from 'vitest';

const readPluginZipMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/plugin-package-service', () => ({
  PluginPackageService: vi.fn().mockImplementation(() => ({
    readPluginZip: readPluginZipMock
  }))
}));

import { GET } from '@/app/api/plugin/package/route';

describe('plugin package route', () => {
  it('returns the plugin zip as a download', async () => {
    readPluginZipMock.mockResolvedValue(Buffer.from('zip-binary'));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toContain('publisher-plugin.zip');
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('zip-binary');
  });
});
