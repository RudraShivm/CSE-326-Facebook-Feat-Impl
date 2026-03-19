import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.middleware";
import { uploadMedia } from "../controllers/storage.controller";

const router = Router();

// Use memory storage so the file buffer is available for Supabase upload
// Max size: 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticate);
router.post("/upload", upload.single("file"), uploadMedia);

export default router;
