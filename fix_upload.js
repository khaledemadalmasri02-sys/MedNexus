// Create a CommonJS wrapper for file-type
const fs = require('fs');

function fixFileTypeImport() {
  const packageJsonPath = './node_modules/file-type/package.json';
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log('file-type package version:', packageJson.version);
    
    // Check if exports exist
    if (packageJson.exports) {
      console.log('file-type exports structure:', JSON.stringify(packageJson.exports, null, 2));
    }
    
    // Create a proper CommonJS import workaround
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    // Override require for CommonJS compatibility
    Module.prototype.require = function(id) {
      if (id === 'file-type') {
        // Try to import as CommonJS
        try {
          return require('./node_modules/file-type/index.js');
        } catch (err) {
          console.warn('Failed CommonJS import, trying alternative:', err.message);
        }
        
        // Check if file-type provides ESM export
        if (require('./node_modules/file-type/package.json').exports?.['./from_file']?.['import']) {
          console.log('file-type exports ESM for from_file');
        }
      }
      return originalRequire.apply(this, arguments);
    };
    
    console.log('✅ CommonJS wrapper created successfully');
  } else {
    console.log('❌ file-type package not found');
  }
}

// Test the fix
fixFileTypeImport();

// Try to import file-type as CommonJS
try {
  // Use the createRequire method to import CommonJS in ES module context
  const { fileTypeFromFile } = require('module').createRequire(import.meta.url)('file-type');
  console.log('✅ file-type imported as CommonJS with createRequire');
  console.log('✅ fileTypeFromFile:', fileTypeFromFile);
} catch (err) {
  console.error('❌ CommonJS import failed:', err.message);
}
