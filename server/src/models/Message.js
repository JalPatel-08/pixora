import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    storyReply: {
      storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },
      mediaUrl: { type: String, default: null },
      mediaType: { type: String, enum: ['image', 'video', null], default: null },
    },
    video: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    sharedPost: {
      postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
      thumbnail: { type: String, default: null },
      caption: { type: String, default: null },
      authorUsername: { type: String, default: null },
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
