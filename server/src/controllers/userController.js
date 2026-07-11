import User from '../models/User.js';
import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * GET /api/users/:username - Get user profile
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('postsCount');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check blocking
    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      if (currentUser.blockedUsers.includes(user._id) || user.blockedUsers.includes(currentUser._id)) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
    }

    const userObj = user.toSafeObject();

    // Check if the requesting user follows this user
    if (req.user) {
      userObj.isFollowing = user.followers.some(
        (f) => f.toString() === req.user._id.toString()
      );
      userObj.isOwnProfile = user._id.toString() === req.user._id.toString();
      userObj.hasRequested = user.followRequests.some(
        (f) => f.toString() === req.user._id.toString()
      );
    }

    res.json({ success: true, user: userObj });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/profile - Update user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, website, location, username, isPrivate } = req.body;
    const user = await User.findById(req.user._id);

    // If username is changing, check uniqueness
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username is already taken.',
        });
      }
      user.username = username;
    }

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (website !== undefined) {
      if (website !== '') {
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
        if (!urlRegex.test(website)) {
          return res.status(400).json({ success: false, message: 'Invalid website URL format.' });
        }
      }
      user.website = website;
    }
    if (location !== undefined) user.location = location;
    if (isPrivate !== undefined) user.isPrivate = isPrivate;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/profile-picture - Upload profile picture
 */
export const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image.',
      });
    }

    const user = await User.findById(req.user._id);

    // Delete old profile picture if exists
    if (user.profilePicture.publicId) {
      await deleteFromCloudinary(user.profilePicture.publicId);
    }

    // Upload new picture
    const result = await uploadToCloudinary(req.file.buffer, 'instaclone/avatars', {
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      ],
    });

    user.profilePicture = {
      url: result.secure_url,
      publicId: result.public_id,
    };
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Profile picture updated.',
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/cover-photo - Upload cover photo
 */
export const updateCoverPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image.',
      });
    }

    const user = await User.findById(req.user._id);

    if (user.coverPhoto.publicId) {
      await deleteFromCloudinary(user.coverPhoto.publicId);
    }

    const result = await uploadToCloudinary(req.file.buffer, 'instaclone/covers', {
      transformation: [{ width: 1200, height: 400, crop: 'fill' }],
    });

    user.coverPhoto = {
      url: result.secure_url,
      publicId: result.public_id,
    };
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Cover photo updated.',
      coverPhoto: user.coverPhoto,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/profile-picture - Delete profile picture
 */
export const deleteProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.profilePicture.publicId) {
      await deleteFromCloudinary(user.profilePicture.publicId);
    }
    user.profilePicture = { url: '', publicId: '' };
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Profile picture deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/cover-photo - Delete cover photo
 */
export const deleteCoverPhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.coverPhoto.publicId) {
      await deleteFromCloudinary(user.coverPhoto.publicId);
    }
    user.coverPhoto = { url: '', publicId: '' };
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Cover photo deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:id/follow - Follow a user
 */
export const followUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself.',
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check blocking
    const currentUser = await User.findById(currentUserId);
    if (currentUser.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'You have blocked this user. Unblock them first.' });
    }
    if (targetUser.blockedUsers.includes(currentUserId)) {
      return res.status(403).json({ success: false, message: 'You cannot follow this user.' });
    }

    // Check if already following
    if (targetUser.followers.includes(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user.',
      });
    }

    // If private, handle follow request
    if (targetUser.isPrivate) {
      if (targetUser.followRequests.includes(currentUserId)) {
        return res.status(400).json({ success: false, message: 'Follow request already sent.' });
      }
      targetUser.followRequests.push(currentUserId);
      await targetUser.save({ validateBeforeSave: false });

      // Create request notification
      await Notification.create({
        recipient: targetUserId,
        sender: currentUserId,
        type: 'follow_request',
        message: `${req.user.username} requested to follow you.`,
      });

      // Emit socket notification to target user about the request
      const io = req.app.get('io');
      if (io) {
        io.to(targetUserId).emit('notification', {
          type: 'follow_request',
          sender: {
            _id: currentUserId,
            username: req.user.username,
            profilePicture: req.user.profilePicture,
          },
          message: `${req.user.username} requested to follow you.`,
        });
      }

      return res.json({
        success: true,
        requested: true,
        message: 'Follow request sent.',
      });
    }

    // Public user: follow immediately
    targetUser.followers.push(currentUserId);
    await targetUser.save({ validateBeforeSave: false });

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetUserId },
    });

    // Create notification
    await Notification.create({
      recipient: targetUserId,
      sender: currentUserId,
      type: 'follow',
      message: `${req.user.username} started following you.`,
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(targetUserId).emit('notification', {
        type: 'follow',
        sender: {
          _id: currentUserId,
          username: req.user.username,
          profilePicture: req.user.profilePicture,
        },
        message: `${req.user.username} started following you.`,
      });
    }

    res.json({
      success: true,
      message: `You are now following ${targetUser.username}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:id/unfollow - Unfollow a user
 */
export const unfollowUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot unfollow yourself.',
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    targetUser.followers = targetUser.followers.filter(
      (f) => f.toString() !== currentUserId.toString()
    );
    // Also cancel any pending follow request
    targetUser.followRequests = targetUser.followRequests.filter(
      (f) => f.toString() !== currentUserId.toString()
    );
    await targetUser.save({ validateBeforeSave: false });

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetUserId },
    });

    // Clean up any follow_request notification
    await Notification.deleteMany({ recipient: targetUserId, sender: currentUserId, type: 'follow_request' });

    res.json({
      success: true,
      message: `You unfollowed ${targetUser.username}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id/follower - Remove a follower
 */
export const removeFollower = async (req, res, next) => {
  try {
    const followerId = req.params.id;
    const currentUserId = req.user._id;

    const follower = await User.findById(followerId);
    if (!follower) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Remove current user from follower's following array
    follower.following = follower.following.filter(
      (id) => id.toString() !== currentUserId.toString()
    );
    await follower.save({ validateBeforeSave: false });

    // Remove follower from current user's followers array
    req.user.followers = req.user.followers.filter(
      (id) => id.toString() !== followerId.toString()
    );
    await req.user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Follower removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:id/accept-follow - Accept follow request
 */
export const acceptFollowRequest = async (req, res, next) => {
  try {
    const requesterId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user.followRequests.includes(requesterId)) {
      return res.status(400).json({ success: false, message: 'No follow request from this user.' });
    }

    user.followRequests = user.followRequests.filter(id => id.toString() !== requesterId);
    user.followers.push(requesterId);
    await user.save({ validateBeforeSave: false });

    await User.findByIdAndUpdate(requesterId, {
      $addToSet: { following: userId }
    });

    await Notification.deleteMany({ recipient: userId, sender: requesterId, type: 'follow_request' });
    await Notification.create({
      recipient: requesterId,
      sender: userId,
      type: 'follow_accept',
      message: `${user.username} accepted your follow request.`,
    });

    // Emit socket notification to requester
    const io = req.app.get('io');
    if (io) {
      io.to(requesterId).emit('notification', {
        type: 'follow_accept',
        sender: {
          _id: userId,
          username: user.username,
          profilePicture: user.profilePicture,
        },
        message: `${user.username} accepted your follow request.`,
      });
    }

    res.json({ success: true, message: 'Follow request accepted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:id/reject-follow - Reject follow request
 */
export const rejectFollowRequest = async (req, res, next) => {
  try {
    const requesterId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user.followRequests.includes(requesterId)) {
      return res.status(400).json({ success: false, message: 'No follow request from this user.' });
    }

    user.followRequests = user.followRequests.filter(id => id.toString() !== requesterId);
    await user.save({ validateBeforeSave: false });

    await Notification.deleteMany({ recipient: userId, sender: requesterId, type: 'follow_request' });

    res.json({ success: true, message: 'Follow request rejected.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:id/block - Block user
 */
export const blockUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    if (targetId === userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
    }

    const user = await User.findById(userId);
    if (user.blockedUsers.includes(targetId)) {
      return res.status(400).json({ success: false, message: 'User is already blocked.' });
    }

    user.blockedUsers.push(targetId);
    user.followers = user.followers.filter(f => f.toString() !== targetId);
    user.following = user.following.filter(f => f.toString() !== targetId);
    await user.save({ validateBeforeSave: false });

    const targetUser = await User.findById(targetId);
    if (targetUser) {
      targetUser.followers = targetUser.followers.filter(f => f.toString() !== userId.toString());
      targetUser.following = targetUser.following.filter(f => f.toString() !== userId.toString());
      await targetUser.save({ validateBeforeSave: false });
    }

    res.json({ success: true, message: 'User blocked successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:id/unblock - Unblock user
 */
export const unblockUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetId);
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'User unblocked successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/check-username/:username - Check username availability
 */
export const checkUsernameAvailability = async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase() });
    res.json({ success: true, available: !user });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:username/followers - Get followers list
 */
export const getFollowers = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username name profilePicture');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, followers: user.followers });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:username/following - Get following list
 */
export const getFollowing = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('following', 'username name profilePicture');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, following: user.following });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/search?q=query - Search users
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { q, query } = req.query;
    const searchTerm = q || query;
    if (!searchTerm || searchTerm.trim().length < 1) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { name: { $regex: searchTerm, $options: 'i' } },
      ],
    })
      .select('username name profilePicture')
      .limit(20);

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/suggestions - Get suggested users
 */
export const getSuggestions = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const following = currentUser.following;

    const suggestions = await User.find({
      _id: { $ne: req.user._id, $nin: following },
    })
      .select('username name profilePicture')
      .limit(10)
      .sort({ createdAt: -1 });

    res.json({ success: true, users: suggestions });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:username/posts - Get user's posts
 */
export const getUserPosts = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: user._id, isArchived: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name profilePicture');

    const total = await Post.countDocuments({ author: user._id, isArchived: false });

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/saved-posts - Get saved posts
 */
export const getSavedPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id)
      .populate({
        path: 'savedPosts',
        options: { sort: { createdAt: -1 }, skip, limit },
        populate: { path: 'author', select: 'username name profilePicture' },
      });

    res.json({
      success: true,
      posts: user.savedPosts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/close-friends - Get close friends list
 */
export const getCloseFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('closeFriends', 'username name profilePicture');
    res.json({ success: true, closeFriends: user.closeFriends });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:id/close-friends - Add to close friends
 */
export const addCloseFriend = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    if (targetId === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot add yourself.' });
    }

    await User.findByIdAndUpdate(userId, { $addToSet: { closeFriends: targetId } });
    res.json({ success: true, message: 'Added to close friends.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id/close-friends - Remove from close friends
 */
export const removeCloseFriend = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, { $pull: { closeFriends: targetId } });
    res.json({ success: true, message: 'Removed from close friends.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/follow-requests - Get pending follow requests
 */
export const getFollowRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followRequests', 'username name profilePicture');
    res.json({ success: true, followRequests: user.followRequests });
  } catch (error) {
    next(error);
  }
};
