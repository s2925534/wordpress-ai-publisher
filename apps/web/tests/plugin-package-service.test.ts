import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  execFile: execFileMock
}));

import { PluginPackageService } from '@/server/plugin-package-service';

describe('PluginPackageService', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('repackages an existing plugin zip from current source', async () => {
    const rootDir = mkdtempSync(path.join(os.tmpdir(), 'wap-plugin-'));
    mkdirSync(path.join(rootDir, 'scripts'));
    mkdirSync(path.join(rootDir, 'dist'));
    writeFileSync(path.join(rootDir, 'scripts', 'package-wordpress-plugin.sh'), '#!/usr/bin/env bash\n');
    const zipPath = path.join(rootDir, 'dist', 'publisher-plugin.zip');
    writeFileSync(zipPath, Buffer.from('zip'));

    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
        options: { cwd?: string },
        callback: (error: Error | null, result?: { stdout: string; stderr: string }) => void
      ) => {
        writeFileSync(path.join(options.cwd ?? rootDir, 'dist', 'publisher-plugin.zip'), Buffer.from('new-zip'));
        callback(null, { stdout: '', stderr: '' });
      }
    );

    const service = new PluginPackageService(rootDir);
    const result = await service.ensurePluginZip();

    expect(result).toBe(zipPath);
    expect(execFileMock).toHaveBeenCalledOnce();
  });

  it('packages the plugin when the zip is missing', async () => {
    const rootDir = mkdtempSync(path.join(os.tmpdir(), 'wap-plugin-missing-'));
    mkdirSync(path.join(rootDir, 'scripts'));
    writeFileSync(path.join(rootDir, 'scripts', 'package-wordpress-plugin.sh'), '#!/usr/bin/env bash\n');

    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
        options: { cwd?: string },
        callback: (error: Error | null, result?: { stdout: string; stderr: string }) => void
      ) => {
        const zipDir = path.join(options.cwd ?? rootDir, 'dist');
        mkdirSync(zipDir, { recursive: true });
        writeFileSync(path.join(zipDir, 'publisher-plugin.zip'), Buffer.from('zip'));
        callback(null, { stdout: '', stderr: '' });
      }
    );

    const service = new PluginPackageService(rootDir);
    const result = await service.ensurePluginZip();

    expect(result).toBe(path.join(rootDir, 'dist', 'publisher-plugin.zip'));
    expect(execFileMock).toHaveBeenCalledOnce();
  });
});
