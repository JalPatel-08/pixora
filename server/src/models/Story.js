import mongoose from 'mongoose';

const viewerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true, maxlength: 12 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const elementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['text', 'drawing', 'emoji', 'gif', 'mention', 'location', 'link', 'music'], required: true },
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
    width: { type: Number, default: 30 },
    height: { type: Number, default: 12 },
    rotation: { type: Number, default: 0 },
    zIndex: { type: Number, default: 1 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    media: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      mediaType: { type: String, enum: ['image', 'video'], required: true },
      duration: { type: Number, default: null },
    },
    caption: {
      type: String,
      maxlength: [200, 'Caption cannot exceed 200 characters'],
      default: '',
      trim: true,
    },
    viewers: { type: [viewerSchema], default: [] },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactions: { type: [reactionSchema], default: [] },
    elements: { type: [elementSchema], default: [] },
    audience: {
      type: String,
      enum: ['everyone', 'followers', 'close_friends'],
      default: 'everyone',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    isDraft: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Stories deliberately remain in MongoDB after expiry so owners can archive them
// and add them to highlights. Active feeds always query expiresAt explicitly.
storySchema.index({ expiresAt: 1 });
storySchema.index({ author: 1, createdAt: -1 });

storySchema.virtual('viewCount').get(function () {
  return this.viewers ? this.viewers.length : 0;
});

storySchema.virtual('likeCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

const Story = mongoose.model('Story', storySchema);
export default Story;
