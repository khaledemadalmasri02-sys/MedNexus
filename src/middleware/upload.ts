import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
// file-type imports - use dynamic import for ES module compatibility
let fileTypeFromFile: any = null;

async function loadFileTypeLib() {
  if (!fileTypeFromFile) {
    const { fileTypeFromFile: loaded } = await import("file-type");
    fileTypeFromFile = loaded;
  }
  return fileTypeFromFile;
}

const UPLOAD_DIR = "./data/summary_uploads";
const OUTPUT_DIR = "./data/summary_outputs";

[UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ALLOWED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "text/plain": [".txt", ".md"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(ALLOWED_TYPES));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = Object.values(ALLOWED_TYPES).flat();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

const imageStorage = multer.memoryStorage();

export const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, and WebP images are allowed"));
    }
  },
});

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm", ".css", ".js", ".ts", ".jsx", ".tsx", ".yaml", ".yml"]);

async function isTextFile(filePath: string): Promise<boolean> {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer.length === 0 || isUtf8(buffer);
  } catch {
    return false;
  }
}

function isUtf8(buffer: Buffer): boolean {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

export async function validateFileType(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (TEXT_EXTENSIONS.has(ext)) {
    return isTextFile(filePath);
  }
  
  try {
    const fileTypeLib = await loadFileTypeLib();
    const result = await fileTypeLib(filePath);
    return result !== null && ALLOWED_MIME_TYPES.has(result.mime);
  } catch (error) {
    console.warn("File type validation failed:", error);
    
    const allowedExts = Object.values(ALLOWED_TYPES).flat();
    if (allowedExts.includes(ext)) {
      return true;
    }
    return false;
  }
}

export { UPLOAD_DIR, OUTPUT_DIR };
