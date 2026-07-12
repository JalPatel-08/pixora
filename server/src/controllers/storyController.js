import Story from '../models/Story.js';
import StoryHighlight from '../models/StoryHighlight.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

const AUTHOR_SELECT = 'username name profilePicture';
const AUDIENCES = ['everyone', 'followers', 'close_friends'];
const ELEMENT_TYPES = new Set(['text', 'drawing', 'emoji', 'gif', 'mention', 'location', 'link', 'music']);

const idEquals = (left, right) => left?.toString() === right?.toString();

const parseElements = (value) => {
  if (!value) return [];
  try {
    const elements = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(elements)) return [];
    return elements.slice(0, 40).map((element, index) => ({
      id: String(element.id || `${Date.now()}-${index}`).slice(0, 80),
      type: ELEMENT_TYPES.has(element.type) ? element.type : 'text',
      x: Math.max(0, Math.min(100, Number(element.x) || 50)),
      y: Math.max(0, Math.min(100, Number(element.y) || 50)),
      width: Math.max(4, Math.min(100, Number(element.width) || 30)),
      height: Math.max(3, Math.min(100, Number(element.height) || 12)),
      rotation: Math.max(-360, Math.min(360, Number(element.rotation) || 0)),
      zIndex: Math.max(0, Math.min(100, Number(element.zIndex) || index + 1)),
      data: typeof element.data === 'object' && element.data ? element.data : {},
    }));
  } catch {
    return [];
  }
};

const canViewStory = (story, viewer) => {
  if (!story || !viewer || idEquals(story.author?._id || story.author, viewer._id)) return true;
  const author = story.author;
  if (!author || typeof author !== 'object') return false;
  const viewerId = viewer._id.toString();
  if (author.blockedUsers?.some((id) => idEquals(id, viewerId)) || viewer.blockedUsers?.some((id) => idEquals(id, author._id))) return false;
  if (story.audience === 'followers') return author.followers?.some((id) => idEquals(id, viewerId));
  if (story.audience === 'close_friends') return author.closeFriends?.some((id) => idEquals(id, viewerId));
  return true;
};

const ensureAccess = async (story, viewer) => {
  const author = await User.findById(story.author).select('followers closeFriends blockedUsers');
  if (!author || !canViewStory({ ...story.toObject(), author }, viewer)) return false;
  return true;
};

const withSeen = (story, userId) => {
  const obj = story.toObject();
  return {
    ...obj,
    seen: (story.viewers ?? []).some((view) => idEquals(view.user, userId)),
    liked: (story.likes ?? []).some((id) => idEquals(id, userId)),
    reactions: story.reactions ?? [],
  };
};

const storyPayload = (story, userId) => withSeen(story, userId);

export const createStory = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please provide an image or video.' });
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    const result = await uploadToCloudinary(req.file.buffer, 'instaclone/stories', { resource_type: mediaType });
    const isDraft = req.body.isDraft === 'true' || req.body.isDraft === true;
    const story = await Story.create({
      author: req.user._id,
      media: { url: result.secure_url, publicId: result.public_id, mediaType, duration: result.duration ?? null },
      caption: req.body.caption?.trim() || '',
      audience: AUDIENCES.includes(req.body.audience) ? req.body.audience : 'everyone',
      elements: parseElements(req.body.elements),
      isDraft,
    });
    await story.populate('author', AUTHOR_SELECT);
    res.status(201).json({ success: true, message: isDraft ? 'Draft saved.' : 'Story created successfully.', story: storyPayload(story, req.user._id) });
  } catch (error) { next(error); }
};

export const getFeedStories = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id).select('following blockedUsers');
    const authorIds = [req.user._id, ...(currentUser.following ?? [])];
    const stories = await Story.find({ author: { $in: authorIds }, expiresAt: { $gt: new Date() }, isDraft: false })
      .sort({ createdAt: 1 })
      .populate('author', `${AUTHOR_SELECT} followers closeFriends blockedUsers`);
    const groups = new Map();
    stories.filter((story) => canViewStory(story, currentUser)).forEach((story) => {
      const authorId = story.author._id.toString();
      if (!groups.has(authorId)) groups.set(authorId, { user: story.author, stories: [] });
      groups.get(authorId).stories.push(storyPayload(story, req.user._id));
    });
    const ownId = req.user._id.toString();
    const ordered = [...groups.entries()].sort(([aId, a], [bId, b]) => {
      if (aId === ownId) return -1;
      if (bId === ownId) return 1;
      return new Date(b.stories.at(-1).createdAt) - new Date(a.stories.at(-1).createdAt);
    }).map(([, group]) => ({ ...group, user: { _id: group.user._id, username: group.user.username, name: group.user.name, profilePicture: group.user.profilePicture } }));
    res.json({ success: true, stories: ordered });
  } catch (error) { next(error); }
};

export const getUserStories = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(`${AUTHOR_SELECT} followers closeFriends blockedUsers`);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const stories = await Story.find({ author: user._id, expiresAt: { $gt: new Date() }, isDraft: false }).sort({ createdAt: 1 }).populate('author', AUTHOR_SELECT);
    if (!stories.every((story) => canViewStory({ ...story.toObject(), author: user }, req.user))) return res.status(403).json({ success: false, message: 'This story is not available to you.' });
    res.json({ success: true, user: { _id: user._id, username: user.username, name: user.name, profilePicture: user.profilePicture }, stories: stories.map((story) => storyPayload(story, req.user._id)) });
  } catch (error) { next(error); }
};

export const getDrafts = async (req, res, next) => {
  try {
    const drafts = await Story.find({ author: req.user._id, isDraft: true }).sort({ updatedAt: -1 }).populate('author', AUTHOR_SELECT);
    res.json({ success: true, drafts: drafts.map((story) => storyPayload(story, req.user._id)) });
  } catch (error) { next(error); }
};

export const publishDraft = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, author: req.user._id, isDraft: true });
    if (!story) return res.status(404).json({ success: false, message: 'Draft not found.' });
    story.isDraft = false;
    story.audience = AUDIENCES.includes(req.body.audience) ? req.body.audience : story.audience;
    story.caption = req.body.caption?.trim() ?? story.caption;
    story.elements = parseElements(req.body.elements);
    story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await story.save();
    await story.populate('author', AUTHOR_SELECT);
    res.json({ success: true, message: 'Story published.', story: storyPayload(story, req.user._id) });
  } catch (error) { next(error); }
};

export const discardDraft = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, author: req.user._id, isDraft: true });
    if (!story) return res.status(404).json({ success: false, message: 'Draft not found.' });
    await deleteFromCloudinary(story.media.publicId, story.media.mediaType);
    await story.deleteOne();
    res.json({ success: true, message: 'Draft discarded.' });
  } catch (error) { next(error); }
};

export const updateDraft = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, author: req.user._id, isDraft: true });
    if (!story) return res.status(404).json({ success: false, message: 'Draft not found.' });
    story.audience = AUDIENCES.includes(req.body.audience) ? req.body.audience : story.audience;
    story.elements = parseElements(req.body.elements);
    await story.save();
    res.json({ success: true, message: 'Draft updated.', story: storyPayload(story, req.user._id) });
  } catch (error) { next(error); }
};

export const viewStory = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, isDraft: false, expiresAt: { $gt: new Date() } });
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });
    if (!(await ensureAccess(story, req.user))) return res.status(403).json({ success: false, message: 'This story is not available to you.' });
    if (!story.viewers.some((view) => idEquals(view.user, req.user._id))) { story.viewers.push({ user: req.user._id }); await story.save({ validateBeforeSave: false }); }
    res.json({ success: true, viewCount: story.viewers.length });
  } catch (error) { next(error); }
};

export const likeStory = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, isDraft: false, expiresAt: { $gt: new Date() } });
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });
    if (!(await ensureAccess(story, req.user))) return res.status(403).json({ success: false, message: 'This story is not available to you.' });
    const index = story.likes.findIndex((id) => idEquals(id, req.user._id));
    const liked = index < 0;
    liked ? story.likes.push(req.user._id) : story.likes.splice(index, 1);
    await story.save({ validateBeforeSave: false });
    res.json({ success: true, liked, likeCount: story.likes.length });
  } catch (error) { next(error); }
};

export const reactToStory = async (req, res, next) => {
  try {
    const emoji = String(req.body.emoji || '').trim();
    if (!emoji || [...emoji].length > 4) return res.status(400).json({ success: false, message: 'Choose a valid reaction.' });
    const story = await Story.findOne({ _id: req.params.id, isDraft: false, expiresAt: { $gt: new Date() } });
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });
    if (!(await ensureAccess(story, req.user))) return res.status(403).json({ success: false, message: 'This story is not available to you.' });
    story.reactions = story.reactions.filter((reaction) => !idEquals(reaction.user, req.user._id));
    story.reactions.push({ user: req.user._id, emoji });
    await story.save({ validateBeforeSave: false });
    if (!idEquals(story.author, req.user._id)) {
      await Notification.create({ recipient: story.author, sender: req.user._id, type: 'story_reaction', story: story._id, message: `${req.user.username} reacted ${emoji} to your story.` });
      req.app.get('io')?.to(story.author.toString()).emit('notification', { type: 'story_reaction', storyId: story._id, message: `${req.user.username} reacted ${emoji} to your story.` });
    }
    res.json({ success: true, reactions: story.reactions });
  } catch (error) { next(error); }
};

export const replyToStory = async (req, res, next) => {
  try {
    const text = req.body.text?.trim();
    if (!text) return res.status(400).json({ success: false, message: 'Reply text is required.' });
    const story = await Story.findOne({ _id: req.params.id, isDraft: false, expiresAt: { $gt: new Date() } }).populate('author', AUTHOR_SELECT);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });
    if (!(await ensureAccess(story, req.user))) return res.status(403).json({ success: false, message: 'This story is not available to you.' });
    if (idEquals(story.author._id, req.user._id)) return res.status(400).json({ success: false, message: 'Cannot reply to your own story.' });
    let conversation = await Conversation.findOne({ participants: { $all: [req.user._id, story.author._id], $size: 2 } });
    if (!conversation) conversation = await Conversation.create({ participants: [req.user._id, story.author._id] });
    const message = await Message.create({ conversation: conversation._id, sender: req.user._id, text, storyReply: { storyId: story._id, mediaUrl: story.media.url, mediaType: story.media.mediaType } });
    await message.populate('sender', AUTHOR_SELECT);
    conversation.lastMessage = message._id; conversation.lastMessageAt = message.createdAt; await conversation.save();
    await Notification.create({ recipient: story.author._id, sender: req.user._id, type: 'story_reply', story: story._id, message: `${req.user.username} replied to your story.` });
    const io = req.app.get('io'); io?.to(story.author._id.toString()).emit('newMessage', { conversationId: conversation._id, message }); io?.to(story.author._id.toString()).emit('notification', { type: 'story_reply', storyId: story._id, message: `${req.user.username} replied to your story.` });
    res.status(201).json({ success: true, message, conversationId: conversation._id });
  } catch (error) { next(error); }
};

export const getStoryViewers = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id).populate('viewers.user', AUTHOR_SELECT);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });
    if (!idEquals(story.author, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    res.json({ success: true, viewCount: story.viewers.length, viewers: story.viewers.map((view) => ({ user: view.user, viewedAt: view.viewedAt })) });
  } catch (error) { next(error); }
};

export const getArchive = async (req, res, next) => {
  try {
    const stories = await Story.find({ author: req.user._id, isDraft: false, expiresAt: { $lte: new Date() } }).sort({ createdAt: -1 });
    res.json({ success: true, stories: stories.map((story) => storyPayload(story, req.user._id)) });
  } catch (error) { next(error); }
};

export const getHighlights = async (req, res, next) => {
  try {
    const author = req.params.username ? await User.findOne({ username: req.params.username }).select('_id') : req.user;
    if (!author) return res.status(404).json({ success: false, message: 'User not found.' });
    const highlights = await StoryHighlight.find({ author: author._id }).sort({ updatedAt: -1 }).populate('stories');
    res.json({ success: true, highlights });
  } catch (error) { next(error); }
};

export const createHighlight = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.storyIds) ? req.body.storyIds : [];
    const stories = await Story.find({ _id: { $in: ids }, author: req.user._id, isDraft: false });
    if (!req.body.title?.trim() || !stories.length) return res.status(400).json({ success: false, message: 'A title and at least one of your stories are required.' });
    const highlight = await StoryHighlight.create({ author: req.user._id, title: req.body.title.trim(), coverUrl: req.body.coverUrl || stories[0].media.url, stories: stories.map((story) => story._id) });
    await highlight.populate('stories');
    res.status(201).json({ success: true, highlight });
  } catch (error) { next(error); }
};

export const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });
    if (!idEquals(story.author, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized to delete this story.' });
    await deleteFromCloudinary(story.media.publicId, story.media.mediaType);
    await StoryHighlight.updateMany({ stories: story._id }, { $pull: { stories: story._id } });
    await story.deleteOne();
    res.json({ success: true, message: 'Story deleted successfully.' });
  } catch (error) { next(error); }
};
