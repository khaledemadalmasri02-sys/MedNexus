// Debug file-type import issue
try {
  // Try CommonJS import
  const { fileTypeFromFile } = require('file-type');
  console.log('✅ CommonJS import succeeded:', fileTypeFromFile);
} catch (err) {
  console.error('CommonJS import failed:', err.message);
  
  // Try to inspect package.json
  const fs = require('fs');
  try {
    const packageJson = JSON.parse(fs.readFileSync('./node_modules/file-type/package.json', 'utf8'));
    console.log('package.json exports:', packageJson.exports);
    console.log('package.json main:', packageJson.main);
    console.log('package.json module:', packageJson.module);
    console.log('package.json type:', packageJson.type);
  } catch (e) {
    console.error('Failed to read package.json:', e);
  }
}
