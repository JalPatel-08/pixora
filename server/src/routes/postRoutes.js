import { Router } from 'express';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  createPost,
  getFeed,
  getExplorePosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleSave,
} from '../controllers/postController.js';

const router = Router();

// Create post (authenticated)
router.post('/', protect, upload.array('media', 10), createPost);

// Get feed (authenticated)
router.get('/feed', protect, getFeed);

// Get explore posts (authenticated)
router.get('/explore', protect, getExplorePosts);

// Get single post (public with optional auth)
router.get('/:id', optionalAuth, getPost);

// Update post (authenticated)
router.put('/:id', protect, updatePost);

// Delete post (authenticated)
router.delete('/:id', protect, deletePost);

// Toggle like (authenticated)
router.put('/:id/like', protect, toggleLike);

// Toggle save (authenticated)
router.put('/:id/save', protect, toggleSave);

export default router;
