import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  contentProfileSchema,
  defaultImageRulesSchema,
  defaultSeoRulesSchema,
  defaultValidationRulesSchema,
  platformCapabilitiesSchema,
  siteConfigSchema,
  type ContentProfileConfig,
  type SiteConfig
} from '@/lib/config-schemas';

export type ConfigValidationIssue = {
  file: string;
  field: string;
  message: string;
};

export type ConfigValidationReport = {
  valid: boolean;
  issues: ConfigValidationIssue[];
};

function formatIssues(file: string, issues: { path: (string | number)[]; message: string }[]) {
  return issues.map((issue) => ({
    file,
    field: issue.path.length ? issue.path.join('.') : '(root)',
    message: issue.message
  }));
}

async function readJsonFile(filePath: string) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function resolveConfigPath(configDir: string, segments: string[]) {
  return path.join(configDir, ...segments);
}

export class ConfigService {
  constructor(private readonly configDir: string) {}

  async loadSiteConfig(siteKey: string): Promise<SiteConfig> {
    const sitePath = resolveConfigPath(this.configDir, ['sites', `${siteKey}.json`]);
    const parsed = siteConfigSchema.safeParse(await readJsonFile(sitePath));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(
        `${sitePath}: ${issue.path.join('.') || '(root)'} - ${issue.message}`
      );
    }
    return parsed.data;
  }

  async loadContentProfile(profileKey: string): Promise<ContentProfileConfig> {
    const profilePath = resolveConfigPath(this.configDir, ['content-profiles', `${profileKey}.json`]);
    const parsed = contentProfileSchema.safeParse(await readJsonFile(profilePath));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(
        `${profilePath}: ${issue.path.join('.') || '(root)'} - ${issue.message}`
      );
    }
    return parsed.data;
  }

  async validateAll(): Promise<ConfigValidationReport> {
    const issues: ConfigValidationIssue[] = [];

    for (const file of await listJsonFiles(path.join(this.configDir, 'sites'))) {
      const result = siteConfigSchema.safeParse(await readJsonFile(file));
      if (!result.success) {
        issues.push(...formatIssues(file, result.error.issues));
      }
    }

    for (const file of await listJsonFiles(path.join(this.configDir, 'content-profiles'))) {
      const result = contentProfileSchema.safeParse(await readJsonFile(file));
      if (!result.success) {
        issues.push(...formatIssues(file, result.error.issues));
      }
    }

    for (const file of await listJsonFiles(path.join(this.configDir, 'global'))) {
      const base = path.basename(file);
      const data = await readJsonFile(file);

      const schema =
        base === 'platform-capabilities.json'
          ? platformCapabilitiesSchema
          : base === 'default-seo-rules.json'
            ? defaultSeoRulesSchema
            : base === 'default-image-rules.json'
              ? defaultImageRulesSchema
              : base === 'default-validation-rules.json'
                ? defaultValidationRulesSchema
                : null;

      if (schema) {
        const result = schema.safeParse(data);
        if (!result.success) {
          issues.push(...formatIssues(file, result.error.issues));
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

async function listJsonFiles(directory: string) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(directory, entry.name));
  } catch {
    return [];
  }
}
