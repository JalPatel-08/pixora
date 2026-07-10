import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  deleteAllNotifications,
  getUnreadNotificationCount,
} from '../controllers/notificationController.js';

const router = Router();
router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/', deleteAllNotifications);

export default router;
