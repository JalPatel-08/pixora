import mongoose from 'mongoose';

const viewerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    viewedAt: { type: Date, default: Date.now },
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
    audience: {
      type: String,
      enum: ['everyone', 'followers', 'close_friends'],
      default: 'everyone',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ author: 1, createdAt: -1 });

storySchema.virtual('viewCount').get(function () {
  return this.viewers ? this.viewers.length : 0;
});

storySchema.virtual('likeCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

const Story = mongoose.model('Story', storySchema);
export default Story;
