/**
 * seedReels.js
 * Inserts 8–10 dummy reels for development.
 * Safe to run multiple times — skips if dummy reels already exist.
 *
 * Usage:
 *   cd server
 *   node scripts/seedReels.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Reel from '../src/models/Reel.js';
import User from '../src/models/User.js';

// ── Public-domain / royalty-free sample videos (hosted by sample-videos.com
//    and file-examples.com — no copyright, safe for development) ──────────────
const DUMMY_REELS = [
  {
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: '',
    caption: 'Golden hour vibes 🌅 Nothing beats watching the sun dip below the horizon. #sunset #goldenhour #nature #travel',
    tags: ['sunset', 'goldenhour', 'nature', 'travel'],
    likes: 312,
    views: 4820,
    commentsCount: 18,
  },
  {
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    thumbnailUrl: '',
    caption: 'City lights never sleep ✨ Late night walks hit different. #citylife #nightphotography #urban #vibes',
    tags: ['citylife', 'nightphotography', 'urban', 'vibes'],
    likes: 874,
    views: 12300,
    commentsCount: 43,
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: '',
    caption: 'Morning coffee ritual ☕ The only way to start the day right. #coffee #morningroutine #coffeelover #aesthetic',
    tags: ['coffee', 'morningroutine', 'coffeelover', 'aesthetic'],
    likes: 1540,
    views: 22100,
    commentsCount: 67,
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: '',
    caption: 'Ocean therapy 🌊 Let the waves wash everything away. #ocean #beach #waves #mindfulness #travel',
    tags: ['ocean', 'beach', 'waves', 'mindfulness', 'travel'],
    likes: 2210,
    views: 38500,
    commentsCount: 91,
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: '',
    caption: 'Cooking from scratch 🍝 Homemade pasta is always worth the effort. #cooking #homemade #pasta #foodie #recipe',
    tags: ['cooking', 'homemade', 'pasta', 'foodie', 'recipe'],
    likes: 987,
    views: 15600,
    commentsCount: 55,
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: '',
    caption: 'Road trip season is here 🚗 Windows down, music up. #roadtrip #adventure #freedom #summer',
    tags: ['roadtrip', 'adventure', 'freedom', 'summer'],
    likes: 3100,
    views: 51000,
    commentsCount: 128,
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: '',
    caption: 'Gym grind never stops 💪 Consistency is the key to everything. #fitness #gym #workout #motivation #gains',
    tags: ['fitness', 'gym', 'workout', 'motivation', 'gains'],
    likes: 4450,
    views: 73200,
    commentsCount: 204,
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    thumbnailUrl: '',
    caption: 'Autumn forest walk 🍂 The crunch of leaves underfoot is pure ASMR. #autumn #forest #nature #asmr #peaceful',
    tags: ['autumn', 'forest', 'nature', 'asmr', 'peaceful'],
    likes: 1870,
    views: 29400,
    commentsCount: 76,
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnailUrl: '',
    caption: 'Rooftop sunset session 🎸 Music sounds better up here. #music #rooftop #sunset #guitar #livemusic',
    tags: ['music', 'rooftop', 'sunset', 'guitar', 'livemusic'],
    likes: 5620,
    views: 94800,
    commentsCount: 312,
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    thumbnailUrl: '',
    caption: 'Street food tour 🌮 Found the best tacos in the city — no contest. #streetfood #tacos #foodtour #foodie #travel',
    tags: ['streetfood', 'tacos', 'foodtour', 'foodie', 'travel'],
    likes: 2780,
    views: 44600,
    commentsCount: 143,
  },
];

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌  Refusing to seed in production. Set NODE_ENV=development.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  // Check if dummy reels already exist (keyed by the first video URL)
  const firstUrl = DUMMY_REELS[0].videoUrl;
  const existing = await Reel.countDocuments({ videoUrl: firstUrl });
  if (existing > 0) {
    console.log('ℹ️   Dummy reels already exist — skipping seed.');
    await mongoose.disconnect();
    return;
  }

  // Fetch all verified users to distribute reels among them
  const users = await User.find({ isVerified: true }).select('_id').lean();
  if (users.length === 0) {
    console.error('❌  No verified users found. Register and verify at least one account first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const docs = DUMMY_REELS.map((r) => {
    const author = pick(users)._id;
    // Build fake likes/views arrays using random user IDs (just need the count)
    const likeIds = Array.from({ length: r.likes }, () => new mongoose.Types.ObjectId());
    const viewIds = Array.from({ length: r.views }, () => new mongoose.Types.ObjectId());
    return {
      author,
      videoUrl: r.videoUrl,
      publicId: `pixora/reels/seed_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      thumbnailUrl: r.thumbnailUrl,
      caption: r.caption,
      tags: r.tags,
      likes: likeIds,
      views: viewIds,
      commentsCount: r.commentsCount,
    };
  });

  await Reel.insertMany(docs);
  console.log(`✅  Inserted ${docs.length} dummy reels.`);

  await mongoose.disconnect();
  console.log('✅  Done.');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
