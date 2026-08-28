const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('glb', 'gltf');

// Metro caches transforms in the OS temp dir, keyed by file contents + transform
// options — but NOT by project root. Git worktrees share this repo's node_modules,
// so a checkout can pick up another checkout's cached copy of expo-router/_ctx,
// which has that other project's app/ path baked in. The router then finds zero
// routes and the dev server serves "Welcome to Expo" instead of the site.
// One cache per checkout (inside gitignored .expo/) keeps them apart.
config.cacheStores = [new FileStore({ root: path.join(__dirname, '.expo', 'metro-cache') })];

module.exports = config;
