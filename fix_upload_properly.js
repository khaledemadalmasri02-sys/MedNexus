const fs = require('fs');
const path = require('path');

function fixUploadMiddleware() {
    const uploadFile = 'src/middleware/upload.ts';
    
    if (!fs.existsSync(uploadFile)) {
        console.log('❌ upload.ts not found');
        return;
    }
    
    console.log('✅ upload.ts found, applying proper dynamic import fix...');
    
    let content = fs.readFileSync(uploadFile, 'utf8');
    
    // Check if file-type import exists
    if (!content.includes('import { fileTypeFromFile } from "file-type";')) {
        console.log('✅ upload.ts does not use static file-type import');
        return;
    }
    
    console.log('🔄 Applying dynamic import fix...');
    
    // Replace the file-type import with dynamic approach
    content = content
        // Replace the file-type import line
        .replace(
            'import { fileTypeFromFile } from "file-type";',
            '// file-type imports - use dynamic import for ES module compatibility\nlet fileTypeFromFile: any = null;\n\nasync function loadFileTypeLib() {\n  if (!fileTypeFromFile) {\n    const { fileTypeFromFile: loaded } = await import("file-type");\n    fileTypeFromFile = loaded;\n  }\n  return fileTypeFromFile;\n}'
        )
        // Update validateFileType function to use dynamic file-type
        .replace(
            'export async function validateFileType(filePath: string): Promise<boolean> {\n  const fileType = await fileTypeFromFile(filePath);\n  if (!fileType) {\n    return false;\n  }\n  return ALLOWED_MIME_TYPES.has(fileType.mime);\n}',
            'export async function validateFileType(filePath: string): Promise<boolean> {\n  try {\n    const fileTypeLib = await loadFileTypeLib();\n    const result = await fileTypeLib(filePath);\n    return result !== null && ALLOWED_MIME_TYPES.has(result.mime);\n  } catch (error) {\n    console.warn("File type validation failed:", error);\n    return false;\n  }\n}'
        );
    
    // Write the fixed content
    fs.writeFileSync(uploadFile, content);
    console.log('✅ upload.ts has been successfully updated with dynamic file-type import!');
    
    // Verify the fix
    const updatedContent = fs.readFileSync(uploadFile, 'utf8');
    if (!updatedContent.includes('async function loadFileTypeLib()')) {
        console.error('❌ Fix verification failed');
        return false;
    }
    
    console.log('✅ Dynamic import fix verified');\n    
    return true;
}

// Apply the fix
const success = fixUploadMiddleware();
process.exit(success ? 0 : 1);
