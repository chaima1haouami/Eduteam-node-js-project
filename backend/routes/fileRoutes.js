
import express from "express";
import multer from "multer";

import {
    uploadFile,
    getFiles,
    downloadFile
} from "../controllers/fileController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

router.get("/", protect, getFiles);

router.post("/", protect, upload.single("file"), uploadFile);

router.get("/:fileId/download", protect, downloadFile);

export default router;
