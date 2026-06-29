import path from 'node:path';

import { ConfigService } from '../apps/web/server/config-service';

async function main() {
  const configDir = process.env.CONFIG_DIR ?? path.resolve(process.cwd(), 'config');
  const service = new ConfigService(configDir);
  const report = await service.validateAll();

  if (!report.valid) {
    for (const issue of report.issues) {
      console.error(`${issue.file}: ${issue.field} - ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Config validation passed for ${configDir}`);
}

void main();
