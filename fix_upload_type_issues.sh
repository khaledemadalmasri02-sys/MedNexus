#!/bin/bash

UPLOAD_FILE="src/middleware/upload.ts"

if [ -f "$UPLOAD_FILE" ]; then
    echo "📝 Current fileTypeFromFile import: "
    grep -n "fileTypeFromFile" "$UPLOAD_FILE" | head -2
    
    echo -e "\n🔧 Applying dynamic import fix..."
    
    # First, let's replace the static import with dynamic approach
    sed -i 's/import { fileTypeFromFile } from "file-type";/import { fileTypeFromFile } from "file-type";\\n\\nlet fileTypeFromFile: any = null;\\n\\nasync function loadFileTypeLib() {\\n  if (!fileTypeFromFile) {\\n    const { fileTypeFromFile: loaded } = await import("file-type");\\n    fileTypeFromFile = loaded;\\n  }\\n  return fileTypeFromFile;\\n}/' "$UPLOAD_FILE"
    
    # Now replace the validateFileType function
    sed -i '/export async function validateFileType(filePath: string): Promise<boolean> {/ {\
        n\
        :\
    }\
    /export async function validateFileType(filePath: string): Promise<boolean> {\\
  try {\\
    const fileTypeLib = await loadFileTypeLib();\\
    const result = await fileTypeLib(filePath);\\
    return result !== null && ALLOWED_MIME_TYPES.has(result.mime);\\
  } catch (error) {\\
    console.warn("File type validation failed:", error);\\
    return false;\\
  }\\
}/'
}

if [ $? -eq 0 ]; then
    echo "✅ Dynamic import fix applied successfully!"
else
    echo "❌ Failed to apply fix"
    exit 1
fi
