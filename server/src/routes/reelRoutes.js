import { Router } from 'express';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { reelUpload } from '../middlewares/upload.js';
import {
  createReel,
  getReelFeed,
  getUserReels,
  getReel,
  toggleLike,
  toggleSave,
  recordView,
  deleteReel,
} from '../controllers/reelController.js';

const router = Router();

// Feed (authenticated)
router.get('/feed', protect, getReelFeed);

// User reels (public)
router.get('/user/:username', optionalAuth, getUserReels);

// Single reel (public with optional auth)
router.get('/:id', optionalAuth, getReel);

// Create reel (authenticated, single video)
router.post('/', protect, reelUpload.single('video'), createReel);

// Like / save / view (authenticated)
router.put('/:id/like', protect, toggleLike);
router.put('/:id/save', protect, toggleSave);
router.put('/:id/view', protect, recordView);

// Delete (authenticated)
router.delete('/:id', protect, deleteReel);

export default router;
