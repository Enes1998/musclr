import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship TS source — let Next transpile them.
  transpilePackages: ['@musclr/core', '@musclr/tokens', '@musclr/viewer3d', 'three'],
  eslint: { ignoreDuringBuilds: true },
  // Multiple lockfiles exist on this machine; pin the trace root to the monorepo.
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
