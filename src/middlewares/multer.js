import multer from "multer";
import path from 'path';
import fs from 'fs'
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileFilter = (req, file, callback) => {
    const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "video/mp4", "video/mkv", "video/avi", "video/webm"];

    if (allowedTypes.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new Error("Invalid file type. Only PNG, JPG, JPEG, MP4, MKV, AVI, and WEBM files are allowed."), false);
    }
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        let folder = 'others';

        if (file.mimetype.startsWith('image/')) {
            folder = 'posters';
        } else if (file.mimetype.startsWith('video/')) {
            folder = 'trailers';
        }

        const uploadPath = path.join(__dirname, `../uploads/${folder}`);

        // Auto create folder if not exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        callback(null, uploadPath)
    },
    filename: (req, file, callback) => {
        const timestamps = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/\s+/g, "_");
        callback(null, `${name}-${timestamps}${ext}`);
    }
});

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 100, // 100 MB
    }
});