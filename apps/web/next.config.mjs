import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot
  // Not using output: 'standalone' -- its pruned node_modules only traces
  // what server code *imports* at runtime, which excludes the `prisma` CLI
  // (invoked as a separate process for `migrate deploy`, see
  // apps/web/docker-entrypoint.sh) and its own deep dependency tree
  // (@prisma/config -> effect, etc). apps/web/Dockerfile copies the full
  // node_modules from the build stage instead, so the CLI and everything
  // it needs is guaranteed to be present.
};

export default nextConfig;
