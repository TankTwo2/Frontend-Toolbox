#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distPath = path.join(__dirname, '..', 'dist');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = packageJson.version;
const outputPath = path.join(__dirname, '..', `frontend-toolbox-v${version}.zip`);

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory not found. Run npm run build:production first.');
  process.exit(1);
}

// Create zip file
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Package created: frontend-toolbox-v${version}.zip (${sizeInMB} MB)`);
  console.log(`📁 Location: ${outputPath}`);
});

archive.on('error', (err) => {
  console.error('❌ Packaging failed:', err);
  process.exit(1);
});

archive.pipe(output);

// Add all files from dist directory
archive.directory(distPath, false);

// Finalize the archive
archive.finalize();

console.log(`📦 Creating package for version ${version}...`);