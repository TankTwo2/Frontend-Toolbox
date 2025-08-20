#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const webstoreUpload = require('webstore-upload');

// Read package.json for version info
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = packageJson.version;
const zipPath = path.join(__dirname, '..', `frontend-toolbox-v${version}.zip`);

// Check required environment variables
const requiredEnvVars = [
  'EXTENSION_ID',
  'CLIENT_ID', 
  'CLIENT_SECRET',
  'REFRESH_TOKEN'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   ${varName}`));
  console.error('\n📖 Please check the deployment guide for setup instructions.');
  process.exit(1);
}

// Check if zip file exists
if (!fs.existsSync(zipPath)) {
  console.error('❌ Package file not found. Run npm run package first.');
  console.error(`   Looking for: ${zipPath}`);
  process.exit(1);
}

console.log(`🚀 Uploading frontend-toolbox-v${version}.zip to Chrome Web Store...`);

const options = {
  extensionId: process.env.EXTENSION_ID,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN,
  zipPath: zipPath
};

async function uploadExtension() {
  try {
    const result = await webstoreUpload(options);
    
    if (result.uploadState === 'SUCCESS') {
      console.log('✅ Upload successful!');
      console.log(`📋 Upload ID: ${result.id}`);
      console.log('⏳ Your extension is now being reviewed by Google.');
      console.log('🔔 You will receive an email when the review is complete.');
    } else {
      console.error('❌ Upload failed:', result);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    
    if (error.message.includes('Invalid credentials')) {
      console.error('🔑 Please check your API credentials in environment variables.');
    } else if (error.message.includes('Extension not found')) {
      console.error('🔍 Please check your EXTENSION_ID.');
    }
    
    process.exit(1);
  }
}

uploadExtension();