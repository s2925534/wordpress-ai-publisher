import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class PluginPackageService {
  constructor(private readonly rootDir = resolveProjectRoot()) {}

  getZipPath() {
    return path.join(this.rootDir, 'dist', 'publisher-plugin.zip');
  }

  async ensurePluginZip() {
    const zipPath = this.getZipPath();
    if (await exists(zipPath)) {
      return zipPath;
    }

    await execFileAsync('bash', [path.join(this.rootDir, 'scripts', 'package-wordpress-plugin.sh')], {
      cwd: this.rootDir
    });

    if (!(await exists(zipPath))) {
      throw new Error('Unable to package the WordPress plugin zip.');
    }

    return zipPath;
  }

  async readPluginZip() {
    const zipPath = await this.ensurePluginZip();
    return fs.readFile(zipPath);
  }
}

function resolveProjectRoot() {
  const cwd = process.cwd();
  const repoRootCandidate = path.resolve(cwd, '..', '..');
  return cwd.endsWith(path.join('apps', 'web')) ? repoRootCandidate : cwd;
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
