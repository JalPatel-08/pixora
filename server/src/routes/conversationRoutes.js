import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
} from '../controllers/conversationController.js';

const router = Router();

router.use(protect);

router.get('/', getConversations);
router.get('/unread-count', getUnreadCount);
router.post('/', body('recipientId').notEmpty().withMessage('recipientId is required'), validate, getOrCreateConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', upload.single('media'), sendMessage);

export default router;
