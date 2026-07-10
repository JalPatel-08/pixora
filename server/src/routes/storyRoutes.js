import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import {
  createStory,
  getFeedStories,
  getUserStories,
  viewStory,
  likeStory,
  replyToStory,
  getStoryViewers,
  deleteStory,
} from '../controllers/storyController.js';

const router = Router();

router.use(protect);

router.get('/feed', getFeedStories);
router.get('/user/:username', getUserStories);

router.post(
  '/',
  upload.single('media'),
  [
    body('caption')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Caption cannot exceed 200 characters'),
    validate,
  ],
  createStory
);

router.put('/:id/view', viewStory);
router.put('/:id/like', likeStory);

router.post(
  '/:id/reply',
  [body('text').trim().notEmpty().withMessage('Reply text is required.'), validate],
  replyToStory
);

router.get('/:id/viewers', getStoryViewers);
router.delete('/:id', deleteStory);

export default router;
