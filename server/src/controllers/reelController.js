import Reel from '../models/Reel.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * POST /api/reels — Upload a new reel (video only)
 */
export const createReel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please provide a video file.' });
    }
    if (!req.file.mimetype.startsWith('video')) {
      return res.status(400).json({ success: false, message: 'Only video files are allowed for reels.' });
    }

    const { caption, tags } = req.body;

    const result = await uploadToCloudinary(req.file.buffer, 'pixora/reels', {
      resource_type: 'video',
      transformation: [{ quality: 'auto' }],
      eager: [{ format: 'jpg', transformation: [{ start_offset: '0' }] }],
      eager_async: true,
    });

    const reel = await Reel.create({
      author: req.user._id,
      videoUrl: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl: result.eager?.[0]?.secure_url ?? '',
      caption: caption || '',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean)) : [],
    });

    await reel.populate('author', 'username name profilePicture');

    res.status(201).json({ success: true, reel });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reels/feed — Paginated reel feed
 */
export const getReelFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reels = await Reel.find({ isArchived: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name profilePicture isPrivate');

    const total = await Reel.countDocuments({ isArchived: false });

    const userId = req.user?._id;
    const currentUser = userId ? await User.findById(userId).select('savedPosts following') : null;

    const reelsWithMeta = reels.map((r) => {
      const obj = r.toObject();
      if (userId) {
        obj.isLiked = r.likes.some((l) => l.toString() === userId.toString());
        obj.isSaved = currentUser?.savedPosts?.some((s) => s.toString() === r._id.toString()) ?? false;
        obj.isFollowing = currentUser?.following?.some((f) => f.toString() === r.author._id.toString()) ?? false;
      }
      return obj;
    });

    res.json({
      success: true,
      reels: reelsWithMeta,
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
 * GET /api/reels/user/:username — Get reels by a specific user
 */
export const getUserReels = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const reels = await Reel.find({ author: user._id, isArchived: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name profilePicture');

    const total = await Reel.countDocuments({ author: user._id, isArchived: false });

    res.json({
      success: true,
      reels,
      pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reels/:id — Get single reel
 */
export const getReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id).populate('author', 'username name profilePicture');
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const obj = reel.toObject();
    if (req.user) {
      obj.isLiked = reel.likes.some((l) => l.toString() === req.user._id.toString());
      const user = await User.findById(req.user._id).select('savedPosts');
      obj.isSaved = user.savedPosts.some((s) => s.toString() === reel._id.toString());
    }

    res.json({ success: true, reel: obj });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/reels/:id/like — Toggle like
 */
export const toggleLike = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const userId = req.user._id;
    const isLiked = reel.likes.some((l) => l.toString() === userId.toString());

    if (isLiked) {
      reel.likes = reel.likes.filter((l) => l.toString() !== userId.toString());
    } else {
      reel.likes.push(userId);

      if (reel.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: reel.author,
          sender: userId,
          type: 'like',
          message: `${req.user.username} liked your reel.`,
        });

        const io = req.app.get('io');
        if (io) {
          io.to(reel.author.toString()).emit('notification', {
            type: 'like',
            sender: { _id: userId, username: req.user.username, profilePicture: req.user.profilePicture },
            message: `${req.user.username} liked your reel.`,
          });
        }
      }
    }

    await reel.save({ validateBeforeSave: false });
    res.json({ success: true, isLiked: !isLiked, likesCount: reel.likes.length });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/reels/:id/save — Toggle save (stored on User.savedPosts — reels share the same field)
 */
export const toggleSave = async (req, res, next) => {
  try {
    const reelId = req.params.id;
    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const user = await User.findById(req.user._id);
    const isSaved = user.savedPosts.some((s) => s.toString() === reelId);

    if (isSaved) {
      user.savedPosts = user.savedPosts.filter((s) => s.toString() !== reelId);
    } else {
      user.savedPosts.push(reelId);
    }

    await user.save({ validateBeforeSave: false });
    res.json({ success: true, isSaved: !isSaved });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/reels/:id/view — Record a view (once per user)
 */
export const recordView = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const userId = req.user._id;
    const alreadyViewed = reel.views.some((v) => v.toString() === userId.toString());
    if (!alreadyViewed) {
      reel.views.push(userId);
      await reel.save({ validateBeforeSave: false });
    }

    res.json({ success: true, viewsCount: reel.views.length });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reels/:id — Delete a reel
 */
export const deleteReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    if (reel.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await deleteFromCloudinary(reel.publicId, 'video');
    await Comment.deleteMany({ post: reel._id });
    await User.updateMany({ savedPosts: reel._id }, { $pull: { savedPosts: reel._id } });
    await Notification.deleteMany({ post: reel._id });
    await reel.deleteOne();

    res.json({ success: true, message: 'Reel deleted.' });
  } catch (error) {
    next(error);
  }
};
