import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import Reel from '../models/Reel.js';
import Notification from '../models/Notification.js';

/**
 * POST /api/posts/:postId/comments - Add a comment
 */
export const addComment = async (req, res, next) => {
  try {
    const { text, parentComment } = req.body;
    const postId = req.params.postId;

    // Support both posts and reels (reels reuse the Comment model via the same postId field)
    const post = await Post.findById(postId) || await Reel.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      text,
      parentComment: parentComment || null,
    });

    // Update comment count
    post.commentsCount += 1;
    await post.save({ validateBeforeSave: false });

    await comment.populate('author', 'username name profilePicture');

    // Create notification (if commenting on someone else's post)
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        post: postId,
        comment: comment._id,
        message: `${req.user.username} commented: "${text.substring(0, 50)}"`,
      });

      const io = req.app.get('io');
      if (io) {
        io.to(post.author.toString()).emit('notification', {
          type: 'comment',
          sender: {
            _id: req.user._id,
            username: req.user.username,
            profilePicture: req.user.profilePicture,
          },
          post: postId,
          message: `${req.user.username} commented on your post.`,
        });
      }
    }

    res.status(201).json({
      success: true,
      comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/posts/:postId/comments - Get comments for a post
 */
export const getComments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Fetch pinned comment first (if any), then the rest sorted newest-first
    const [pinned, rest] = await Promise.all([
      Comment.findOne({ post: req.params.postId, parentComment: null, isPinned: true })
        .populate('author', 'username name profilePicture'),
      Comment.find({
        post: req.params.postId,
        parentComment: null,
        isPinned: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username name profilePicture'),
    ]);

    const total = await Comment.countDocuments({
      post: req.params.postId,
      parentComment: null,
    });

    const comments = pinned ? [pinned, ...rest] : rest;

    res.json({
      success: true,
      comments,
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
 * GET /api/comments/:commentId/replies - Get replies for a comment
 */
export const getReplies = async (req, res, next) => {
  try {
    const replies = await Comment.find({
      parentComment: req.params.commentId,
    })
      .sort({ createdAt: 1 })
      .populate('author', 'username name profilePicture');

    res.json({ success: true, replies });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/comments/:commentId - Delete a comment
 */
export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Only comment author or post/reel author can delete
    const post = await Post.findById(comment.post) || await Reel.findById(comment.post);
    if (
      comment.author.toString() !== req.user._id.toString() &&
      post.author.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment.',
      });
    }

    // Delete replies too
    const repliesCount = await Comment.countDocuments({ parentComment: comment._id });
    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();

    // Update comment count
    post.commentsCount = Math.max(0, post.commentsCount - 1 - repliesCount);
    await post.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Comment deleted.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/comments/:commentId/pin - Pin/unpin a comment (reel/post owner only)
 */
export const pinComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });

    const parent = await Post.findById(comment.post) || await Reel.findById(comment.post);
    if (!parent) return res.status(404).json({ success: false, message: 'Post not found.' });

    if (parent.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the post owner can pin comments.' });
    }

    const willPin = !comment.isPinned;

    // Unpin any currently pinned comment on this post first
    if (willPin) {
      await Comment.updateMany(
        { post: comment.post, isPinned: true },
        { $set: { isPinned: false } }
      );
    }

    comment.isPinned = willPin;
    await comment.save({ validateBeforeSave: false });

    res.json({ success: true, isPinned: willPin });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/comments/:commentId/like - Toggle like on a comment
 */
export const toggleCommentLike = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    const userId = req.user._id;
    const isLiked = comment.likes.some((l) => l.toString() === userId.toString());

    if (isLiked) {
      comment.likes = comment.likes.filter((l) => l.toString() !== userId.toString());
    } else {
      comment.likes.push(userId);
    }

    await comment.save({ validateBeforeSave: false });

    res.json({
      success: true,
      isLiked: !isLiked,
      likesCount: comment.likes.length,
    });
  } catch (error) {
    next(error);
  }
};
