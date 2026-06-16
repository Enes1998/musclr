// Expo SDK 56 + pnpm monorepo + NativeWind. Explicit watchFolders/nodeModulesPaths are the
// safest form for pnpm (symlinked store). Do NOT set resolver.disableHierarchicalLookup with
// pnpm — it breaks symlinked-store resolution.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Treat the self-contained 3D viewer HTML (and any GLB) as bundled assets.
config.resolver.assetExts.push('html', 'glb');

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
