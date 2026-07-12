import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { storyUpload } from '../middlewares/upload.js';
import {
  createStory,
  getFeedStories,
  getUserStories,
  getDrafts,
  publishDraft,
  discardDraft,
  updateDraft,
  viewStory,
  likeStory,
  reactToStory,
  replyToStory,
  getStoryViewers,
  getArchive,
  getHighlights,
  createHighlight,
  deleteStory,
} from '../controllers/storyController.js';

const router = Router();

router.use(protect);

router.get('/feed', getFeedStories);
router.get('/drafts', getDrafts);
router.get('/archive', getArchive);
router.get('/highlights', getHighlights);
router.get('/highlights/:username', getHighlights);
router.get('/user/:username', getUserStories);
router.post('/highlights', createHighlight);

router.post(
  '/',
  storyUpload.single('media'),
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
router.put('/:id/react', [body('emoji').trim().notEmpty().withMessage('Emoji is required.'), validate], reactToStory);
router.put('/:id/publish', publishDraft);
router.patch('/:id/draft', updateDraft);
router.delete('/:id/draft', discardDraft);

router.post(
  '/:id/reply',
  [body('text').trim().notEmpty().withMessage('Reply text is required.'), validate],
  replyToStory
);

router.get('/:id/viewers', getStoryViewers);
router.delete('/:id', deleteStory);

export default router;
