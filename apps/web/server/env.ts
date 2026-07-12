import { z } from 'zod';

const booleanString = z
  .union([z.string(), z.boolean()])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true'))
  .pipe(z.boolean());

export const envSchema = z
  .object({
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
    REDACT_SECRETS_IN_LOGS: booleanString.default(true),
    // --- Authentication -------------------------------------------------
    // Local username/password login always works with no external
    // dependency. ADMIN_EMAIL/ADMIN_PASSWORD seed the first account on an
    // empty database only (see server/bootstrap-admin.ts); they are not
    // read again afterwards. OIDC SSO (e.g. against a self-hosted authentik
    // instance) is an optional, disabled-by-default addition, never a
    // replacement -- see docs/AUTHENTICATION.md.
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    ENABLE_OIDC_SSO: booleanString.default(false),
    OIDC_ISSUER_URL: z.string().url().optional(),
    OIDC_CLIENT_ID: z.string().min(1).optional(),
    OIDC_CLIENT_SECRET: z.string().min(1).optional()
  })
  .superRefine((data, ctx) => {
    if (data.ENABLE_OIDC_SSO && (!data.OIDC_ISSUER_URL || !data.OIDC_CLIENT_ID || !data.OIDC_CLIENT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OIDC_ISSUER_URL, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET are required when ENABLE_OIDC_SSO is true.'
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(env);
}
