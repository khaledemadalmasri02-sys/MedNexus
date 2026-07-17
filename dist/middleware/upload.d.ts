import multer from "multer";
declare const UPLOAD_DIR = "./data/summary_uploads";
declare const OUTPUT_DIR = "./data/summary_outputs";
export declare const upload: multer.Multer;
export declare const uploadImage: multer.Multer;
export declare function validateFileType(filePath: string): Promise<boolean>;
export { UPLOAD_DIR, OUTPUT_DIR };
//# sourceMappingURL=upload.d.ts.map