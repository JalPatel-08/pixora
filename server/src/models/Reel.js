import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    caption: {
      type: String,
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
      default: '',
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reelSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

reelSchema.virtual('viewsCount').get(function () {
  return this.views ? this.views.length : 0;
});

reelSchema.index({ createdAt: -1 });
reelSchema.index({ author: 1, createdAt: -1 });

const Reel = mongoose.model('Reel', reelSchema);
export default Reel;
