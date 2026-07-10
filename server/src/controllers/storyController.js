import Story from '../models/Story.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

const AUTHOR_SELECT = 'username name profilePicture';

const withSeen = (story, userId) => {
  const obj = story.toObject();
  const uid = userId?.toString();
  return {
    ...obj,
    seen: uid ? (story.viewers ?? []).some((v) => v?.user != null && v.user.toString() === uid) : false,
    liked: uid ? (story.likes ?? []).some((id) => id != null && id.toString() === uid) : false,
  };
};

// POST /api/stories
export const createStory = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please provide an image or video.' });
    }

    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    const result = await uploadToCloudinary(req.file.buffer, 'instaclone/stories', {
      resource_type: mediaType,
    });

    const story = await Story.create({
      author: req.user._id,
      media: {
        url: result.secure_url,
        publicId: result.public_id,
        mediaType,
        duration: result.duration ?? null,
      },
      caption: req.body.caption?.trim() || '',
    });

    await story.populate('author', AUTHOR_SELECT);
    res.status(201).json({ success: true, message: 'Story created successfully.', story });
  } catch (error) {
    next(error);
  }
};

// GET /api/stories/feed
export const getFeedStories = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const authorIds = [req.user._id, ...currentUser.following];

    const stories = await Story.find({
      author: { $in: authorIds },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate('author', AUTHOR_SELECT);

    const grouped = new Map();
    for (const story of stories) {
      const uid = story.author._id.toString();
      if (!grouped.has(uid)) grouped.set(uid, { user: story.author, stories: [] });
      grouped.get(uid).stories.push(withSeen(story, req.user._id));
    }

    const ownId = req.user._id.toString();
    const result = [];
    if (grouped.has(ownId)) result.push(grouped.get(ownId));

    const others = [...grouped.entries()]
      .filter(([uid]) => uid !== ownId)
      .sort(([, a], [, b]) => {
        const latestA = a.stories[a.stories.length - 1]?.createdAt;
        const latestB = b.stories[b.stories.length - 1]?.createdAt;
        return new Date(latestB) - new Date(latestA);
      });

    for (const [, group] of others) result.push(group);
    res.json({ success: true, stories: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/stories/user/:username
export const getUserStories = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const stories = await Story.find({
      author: user._id,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate('author', AUTHOR_SELECT);

    res.json({
      success: true,
      user: { _id: user._id, username: user.username, name: user.name, profilePicture: user.profilePicture },
      stories: stories.map((s) => withSeen(s, req.user._id)),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/stories/:id/view
export const viewStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    const alreadySeen = (story.viewers ?? []).some((v) => v.user.toString() === req.user._id.toString());
    if (!alreadySeen) {
      story.viewers.push({ user: req.user._id, viewedAt: new Date() });
      await story.save({ validateBeforeSave: false });
    }

    res.json({ success: true, viewCount: story.viewers.length });
  } catch (error) {
    next(error);
  }
};

// PUT /api/stories/:id/like  — toggle like
export const likeStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    const uid = req.user._id.toString();
    const idx = (story.likes ?? []).findIndex((id) => id.toString() === uid);
    let liked;

    if (idx === -1) {
      story.likes.push(req.user._id);
      liked = true;

      // Notify the story author via socket (skip if own story)
      if (story.author.toString() !== uid) {
        const io = req.app.get('io');
        io?.to(story.author.toString()).emit('storyLiked', {
          storyId: story._id,
          userId: req.user._id,
        });
      }
    } else {
      story.likes.splice(idx, 1);
      liked = false;
    }

    await story.save({ validateBeforeSave: false });
    res.json({ success: true, liked, likeCount: story.likes.length });
  } catch (error) {
    next(error);
  }
};

// POST /api/stories/:id/reply  — send a DM reply to the story author
export const replyToStory = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text is required.' });
    }

    const story = await Story.findById(req.params.id).populate('author', AUTHOR_SELECT);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    const authorId = story.author._id.toString();
    const senderId = req.user._id.toString();

    if (authorId === senderId) {
      return res.status(400).json({ success: false, message: 'Cannot reply to your own story.' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, authorId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({ participants: [senderId, authorId] });
    }

    // Prefix message with story context
    const messageText = text.trim();
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: messageText,
      storyReply: { storyId: story._id, mediaUrl: story.media.url, mediaType: story.media.mediaType },
    });

    await message.populate('sender', AUTHOR_SELECT);

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    // Emit to story author
    const io = req.app.get('io');
    if (io) {
      io.to(authorId).emit('newMessage', { conversationId: conversation._id, message });
      io.to(authorId).emit('storyReply', {
        storyId: story._id,
        senderId,
        senderUsername: req.user.username,
        text: messageText,
      });
    }

    res.status(201).json({ success: true, message, conversationId: conversation._id });
  } catch (error) {
    next(error);
  }
};

// GET /api/stories/:id/viewers
export const getStoryViewers = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id).populate('viewers.user', AUTHOR_SELECT);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({
      success: true,
      viewCount: story.viewers.length,
      viewers: story.viewers.map((v) => ({ user: v.user, viewedAt: v.viewedAt })),
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/stories/:id
export const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this story.' });
    }

    await deleteFromCloudinary(story.media.publicId, story.media.mediaType);
    await story.deleteOne();
    res.json({ success: true, message: 'Story deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
