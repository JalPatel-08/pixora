import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * GET /api/conversations/unread-count
 * Returns the number of conversations that have at least one unread message
 * sent by the other participant.
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all conversation IDs the user participates in
    const conversations = await Conversation.find(
      { participants: userId },
      { _id: 1 }
    ).lean();

    const convIds = conversations.map((c) => c._id);

    // Count distinct conversations that have ≥1 unread message not sent by this user
    const unreadConvIds = await Message.distinct('conversation', {
      conversation: { $in: convIds },
      sender: { $ne: userId },
      read: false,
    });

    res.json({ success: true, count: unreadConvIds.length });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/conversations
 * Return all conversations for the current user, sorted by most recent message.
 */
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username name profilePicture')
      .populate('lastMessage');

    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/conversations
 * Find or create a conversation with another user.
 * Body: { recipientId }
 */
export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'recipientId is required.' });
    }

    if (recipientId === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself.' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Look for existing conversation between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, recipientId], $size: 2 },
    })
      .populate('participants', 'username name profilePicture')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, recipientId],
      });
      await conversation.populate('participants', 'username name profilePicture');
    }

    res.json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/conversations/:id/messages
 * Return paginated messages for a conversation.
 */
export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify the user is a participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversation: id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username name profilePicture');

    const total = await Message.countDocuments({ conversation: id });

    // Mark unread messages from the other participant as read
    const now = new Date();
    await Message.updateMany(
      { conversation: id, sender: { $ne: req.user._id }, read: false },
      { read: true, readAt: now }
    );

    // Notify the sender that their messages were read
    const io = req.app.get('io');
    if (io) {
      const otherParticipant = conversation.participants
        .find((p) => p.toString() !== req.user._id.toString())
        ?.toString();
      if (otherParticipant) {
        io.to(otherParticipant).emit('messagesRead', { conversationId: id, readAt: now });
      }
    }

    res.json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/conversations/:id/messages
 * Send a message. Emits socket event to recipient.
 * Body: { text }
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, sharedPost } = req.body;
    const parsedSharedPost = sharedPost
      ? (typeof sharedPost === 'string' ? JSON.parse(sharedPost) : sharedPost)
      : null;

    if (!text?.trim() && !req.file && !parsedSharedPost) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    let imageData = null;
    let videoData = null;

    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video/');
      const result = await uploadToCloudinary(
        req.file.buffer,
        'pixora/messages',
        { resource_type: isVideo ? 'video' : 'image' }
      );
      if (isVideo) {
        videoData = { url: result.secure_url, publicId: result.public_id };
      } else {
        imageData = { url: result.secure_url, publicId: result.public_id };
      }
    }

    const message = await Message.create({
      conversation: id,
      sender: req.user._id,
      text: text?.trim() || '',
      image: imageData,
      video: videoData,
      ...(parsedSharedPost && { sharedPost: parsedSharedPost }),
    });

    await message.populate('sender', 'username name profilePicture');

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      const senderId = req.user._id.toString();
      const recipientId = conversation.participants
        .find((p) => p.toString() !== senderId)
        ?.toString();

      const payload = { conversationId: id, message };

      // Emit to recipient
      if (recipientId) {
        io.to(recipientId).emit('newMessage', payload);
        // Notify recipient's unread badge if they're not in the conversation room
        const convRoom = io.sockets.adapter.rooms.get(`conv:${id}`);
        const recipientSockets = await io.in(recipientId).fetchSockets();
        const recipientInRoom = recipientSockets.some((s) => convRoom?.has(s.id));
        if (!recipientInRoom) {
          io.to(recipientId).emit('unreadCountChanged');
        }
      }

      // Also emit to sender's own room so other tabs / the sender's open chat updates
      io.to(senderId).emit('newMessage', payload);
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};
