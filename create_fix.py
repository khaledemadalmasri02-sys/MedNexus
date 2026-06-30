import fs from 'fs';
import path from 'path';

// Create a fix for the upload middleware
const uploadPath = 'src/middleware/upload.ts';

if (fs.existsSync(uploadPath)) {
  let content = fs.readFileSync(uploadPath, 'utf8');
  
  // Check if file-type import needs to be fixed
  if (content.includes('import { fileTypeFromFile } from "file-type";')) {
    console.log('Found file-type import in upload.ts');
    
    // Replace with dynamic import approach
    const newContent = content
      .replace(
        'import { fileTypeFromFile } from "file-type";',
        '// file-type imports - use dynamic import for ES module compatibility\nlet fileTypeFromFile: any = null;\n\nasync function loadFileTypeLib() {\n  if (!fileTypeFromFile) {\n    const { fileTypeFromFile: loaded } = await import("file-type");\n    fileTypeFromFile = loaded;\n  }\n  return fileTypeFromFile;\n}'
      )
      .replace(
        'export async function validateFileType(filePath: string): Promise<boolean> {\n  const fileType = await fileTypeFromFile(filePath);\n  if (!fileType) {\n    return false;\n  }\n  return ALLOWED_MIME_TYPES.has(fileType.mime);\n}',
        'export async function validateFileType(filePath: string): Promise<boolean> {\n  try {\n    const fileTypeLib = await loadFileTypeLib();\n    const result = await fileTypeLib(filePath);\n    return result !== null && ALLOWED_MIME_TYPES.has(result.mime);\n  } catch (error) {\n    console.warn("File type validation failed:", error);\n    return false;\n  }\n}'
      );
    
    fs.writeFileSync(uploadPath, newContent);
    console.log('✅ upload.ts has been updated with dynamic file-type import');
  } else {
    console.log('✅ upload.ts does not use file-type import');
  }
} else {
  console.log('❌ upload.ts not found');
}
