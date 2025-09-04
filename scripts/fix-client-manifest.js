#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the (app) directory in .next build output
const appDir = path.join(process.cwd(), '.next/server/app/(app)');
const manifestPath = path.join(appDir, 'page_client-reference-manifest.js');

// Check if manifest already exists
if (fs.existsSync(manifestPath)) {
  console.log('✓ Client reference manifest already exists');
  process.exit(0);
}

// Check if directory exists
if (!fs.existsSync(appDir)) {
  console.error('✗ Build directory not found:', appDir);
  process.exit(1);
}

// Create a minimal client reference manifest
// This matches the structure of other page manifests in the build
const manifestContent = `globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};
globalThis.__RSC_MANIFEST["(app)/page"] = {
  __default_css__: [],
  __client__: [],
  __edge_ssr_module_mapping__: {},
  __entry_css_files__: {}
};
`;

try {
  fs.writeFileSync(manifestPath, manifestContent);
  console.log('✓ Created client reference manifest for (app)/page');
} catch (error) {
  console.error('✗ Failed to create manifest:', error.message);
  process.exit(1);
}