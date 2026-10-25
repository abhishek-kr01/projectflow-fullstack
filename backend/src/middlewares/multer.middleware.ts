import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { ApiError } from "../utils/api-error.js";

const uploadDirectory = path.resolve(process.cwd(), "public", "images");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const safeOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginalName}`);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("application/pdf") && !file.mimetype.startsWith("text/")) {
      return callback(new ApiError(415, "Only images, PDF files, and text files are supported."));
    }
    callback(null, true);
  },
});

export const upload = multerUpload;
