import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as notifCtrl from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", notifCtrl.getNotifications);
router.get("/unread-count", notifCtrl.getUnreadCount);
router.put("/read-all", notifCtrl.markAllAsRead);
router.put("/:id/read", notifCtrl.markAsRead);

export default router;
