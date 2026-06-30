import { z } from 'zod';

const booleanString = z
  .union([z.string(), z.boolean()])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true'))
  .pipe(z.boolean());

export const envSchema = z.object({
  APP_URL: z.string().url(),
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_SECRET: z.string().min(32),
  APP_ENCRYPTION_KEY: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  CONFIG_DIR: z.string().min(1).default('./config'),
  DEFAULT_SITE_KEY: z.string().min(1).default('default-site'),
  DEFAULT_CONTENT_PROFILE_KEY: z.string().min(1).default('linkedin-blog-package'),
  WORDPRESS_INTEGRATION_ENABLED: booleanString.default(true),
  WORDPRESS_DEFAULT_STATUS: z.string().min(1).default('draft'),
  WORDPRESS_ALLOW_DIRECT_PUBLISH: booleanString.default(false),
  WORDPRESS_ALLOW_SCHEDULING: booleanString.default(true),
  WORDPRESS_PLUGIN_ROUTE_NAMESPACE: z.string().min(1).default('publisher/v1'),
  JETPACK_DISCOVERY_ENABLED: booleanString.default(true),
  SOCIAL_SHARING_ENABLED: booleanString.default(true),
  SOCIAL_SHARING_OPTIONAL: booleanString.default(true),
  CONTINUE_IF_SOCIAL_UNAVAILABLE: booleanString.default(true),
  REQUIRE_FINAL_CONFIRMATION: booleanString.default(true),
  REQUIRE_IMAGE_ALT_TEXT: booleanString.default(true),
  REQUIRE_CATEGORY_CONFIRMATION_FOR_NEW: booleanString.default(true),
  ENABLE_IDEMPOTENCY: booleanString.default(true),
  LOG_LEVEL: z.string().min(1).default('info'),
  REDACT_SECRETS_IN_LOGS: booleanString.default(true)
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(env);
}
