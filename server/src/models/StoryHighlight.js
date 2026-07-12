import mongoose from 'mongoose';

const storyHighlightSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 30 },
    coverUrl: { type: String, default: '' },
    stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true }],
  },
  { timestamps: true }
);

storyHighlightSchema.index({ author: 1, updatedAt: -1 });

export default mongoose.model('StoryHighlight', storyHighlightSchema);
