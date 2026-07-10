import Post from '../models/Post.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * POST /api/posts - Create a new post
 */
export const createPost = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one image or video.',
      });
    }

    const { caption, location, tags } = req.body;

    // Upload all files to Cloudinary
    const mediaPromises = req.files.map(async (file) => {
      const mediaType = file.mimetype.startsWith('video') ? 'video' : 'image';
      const result = await uploadToCloudinary(file.buffer, 'instaclone/posts', {
        resource_type: mediaType === 'video' ? 'video' : 'image',
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        mediaType,
        width: result.width,
        height: result.height,
      };
    });

    const media = await Promise.all(mediaPromises);

    const post = await Post.create({
      author: req.user._id,
      caption: caption || '',
      media,
      location: location || '',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
    });

    await post.populate('author', 'username name profilePicture');

    res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/posts/feed - Get user's feed (posts from followed users)
 */
export const getFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id);
    const followingIds = [...currentUser.following, req.user._id];

    const posts = await Post.find({
      author: { $in: followingIds },
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name profilePicture');

    const total = await Post.countDocuments({
      author: { $in: followingIds },
      isArchived: false,
    });

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
 * GET /api/posts/explore - Get explore/discover posts
 */
export const getExplorePosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get posts from users NOT followed by current user for discovery
    let excludeIds = [req.user._id];
    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      excludeIds = [...currentUser.following, req.user._id];
    }

    const posts = await Post.find({
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username name profilePicture');

    const total = await Post.countDocuments({ isArchived: false });

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
 * GET /api/posts/:id - Get single post
 */
export const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username name profilePicture');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const postObj = post.toObject();
    if (req.user) {
      postObj.isLiked = post.likes.some(
        (l) => l.toString() === req.user._id.toString()
      );
      const user = await User.findById(req.user._id);
      postObj.isSaved = user.savedPosts.some(
        (s) => s.toString() === post._id.toString()
      );
    }

    res.json({ success: true, post: postObj });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/posts/:id - Update a post (caption, location, tags)
 */
export const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post.',
      });
    }

    const { caption, location, tags } = req.body;

    if (caption !== undefined) post.caption = caption;
    if (location !== undefined) post.location = location;
    if (tags !== undefined) {
      post.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    }

    await post.save();
    await post.populate('author', 'username name profilePicture');

    res.json({
      success: true,
      message: 'Post updated successfully.',
      post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/posts/:id - Delete a post
 */
export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post.',
      });
    }

    // Delete media from Cloudinary
    for (const item of post.media) {
      await deleteFromCloudinary(item.publicId);
    }

    // Delete associated comments
    await Comment.deleteMany({ post: post._id });

    // Remove from saved posts of all users
    await User.updateMany(
      { savedPosts: post._id },
      { $pull: { savedPosts: post._id } }
    );

    // Delete notifications related to this post
    await Notification.deleteMany({ post: post._id });

    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/posts/:id/like - Toggle like on a post
 */
export const toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const userId = req.user._id;
    const isLiked = post.likes.some((l) => l.toString() === userId.toString());

    if (isLiked) {
      post.likes = post.likes.filter((l) => l.toString() !== userId.toString());
    } else {
      post.likes.push(userId);

      // Create notification (only if it's not the user's own post)
      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like',
          post: post._id,
          message: `${req.user.username} liked your post.`,
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
          io.to(post.author.toString()).emit('notification', {
            type: 'like',
            sender: {
              _id: userId,
              username: req.user.username,
              profilePicture: req.user.profilePicture,
            },
            post: post._id,
            message: `${req.user.username} liked your post.`,
          });
        }
      }
    }

    await post.save({ validateBeforeSave: false });

    res.json({
      success: true,
      isLiked: !isLiked,
      likesCount: post.likes.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/posts/:id/save - Toggle save on a post
 */
export const toggleSave = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const user = await User.findById(req.user._id);
    const isSaved = user.savedPosts.some((s) => s.toString() === postId);

    if (isSaved) {
      user.savedPosts = user.savedPosts.filter((s) => s.toString() !== postId);
    } else {
      user.savedPosts.push(postId);
    }

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      isSaved: !isSaved,
    });
  } catch (error) {
    next(error);
  }
};
