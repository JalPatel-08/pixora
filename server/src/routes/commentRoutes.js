import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  addComment,
  getComments,
  getReplies,
  deleteComment,
  toggleCommentLike,
  pinComment,
} from '../controllers/commentController.js';

const router = Router();

// Add comment to a post
router.post(
  '/posts/:postId/comments',
  protect,
  [
    body('text')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Comment must be 1-500 characters'),
    validate,
  ],
  addComment
);

// Get comments for a post
router.get('/posts/:postId/comments', getComments);

// Get replies for a comment
router.get('/comments/:commentId/replies', getReplies);

// Delete a comment
router.delete('/comments/:commentId', protect, deleteComment);

// Toggle like on a comment
router.put('/comments/:commentId/like', protect, toggleCommentLike);

// Pin / unpin a comment (post/reel owner only)
router.put('/comments/:commentId/pin', protect, pinComment);

export default router;
