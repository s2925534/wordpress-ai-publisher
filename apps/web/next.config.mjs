import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: repoRoot,
  // Minimal production runtime image (see apps/web/Dockerfile) -- only
  // traced dependencies + a small server.js, not the full node_modules.
  output: 'standalone'
};

export default nextConfig;
