import { Router } from 'express';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  getUserProfile,
  updateProfile,
  updateProfilePicture,
  updateCoverPhoto,
  deleteProfilePicture,
  deleteCoverPhoto,
  followUser,
  unfollowUser,
  removeFollower,
  acceptFollowRequest,
  rejectFollowRequest,
  blockUser,
  unblockUser,
  checkUsernameAvailability,
  getFollowers,
  getFollowing,
  searchUsers,
  getSuggestions,
  getUserPosts,
  getSavedPosts,
  getCloseFriends,
  addCloseFriend,
  removeCloseFriend,
  getFollowRequests,
} from '../controllers/userController.js';

const router = Router();

// Search users (authenticated)
router.get('/search', protect, searchUsers);

// Get suggestions (authenticated)
router.get('/suggestions', protect, getSuggestions);

// Get saved posts (authenticated)
router.get('/saved-posts', protect, getSavedPosts);

// Check username availability (public)
router.get('/check-username/:username', checkUsernameAvailability);

// Update profile (authenticated)
router.put('/profile', protect, updateProfile);

// Upload profile picture (authenticated)
router.put('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);

// Delete profile picture (authenticated)
router.delete('/profile-picture', protect, deleteProfilePicture);

// Upload cover photo (authenticated)
router.put('/cover-photo', protect, upload.single('coverPhoto'), updateCoverPhoto);

// Delete cover photo (authenticated)
router.delete('/cover-photo', protect, deleteCoverPhoto);

// Close friends (authenticated) — must be BEFORE /:username wildcard
router.get('/close-friends', protect, getCloseFriends);

// Follow requests (authenticated) — must be BEFORE /:username wildcard
router.get('/follow-requests', protect, getFollowRequests);

// Get user profile (public, with optional auth for isFollowing flag)
router.get('/:username', optionalAuth, getUserProfile);

// Get user posts (public)
router.get('/:username/posts', optionalAuth, getUserPosts);

// Get followers (public)
router.get('/:username/followers', getFollowers);

// Get following (public)
router.get('/:username/following', getFollowing);

// Follow a user (authenticated)
router.post('/:id/follow', protect, followUser);

// Unfollow a user (authenticated)
router.post('/:id/unfollow', protect, unfollowUser);

// Accept follow request (authenticated)
router.post('/:id/accept-follow', protect, acceptFollowRequest);

// Reject follow request (authenticated)
router.post('/:id/reject-follow', protect, rejectFollowRequest);

// Block a user (authenticated)
router.post('/:id/block', protect, blockUser);

// Unblock a user (authenticated)
router.post('/:id/unblock', protect, unblockUser);

// Remove a follower (authenticated)
router.delete('/:id/follower', protect, removeFollower);

// Close friends add/remove (authenticated)
router.post('/:id/close-friends', protect, addCloseFriend);
router.delete('/:id/close-friends', protect, removeCloseFriend);

export default router;
