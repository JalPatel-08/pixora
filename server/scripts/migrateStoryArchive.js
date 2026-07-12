import 'dotenv/config';
import mongoose from 'mongoose';
import Story from '../src/models/Story.js';

// One-time deployment migration: the legacy expiresAt TTL index removed stories,
// which makes an archive impossible. Run `node scripts/migrateStoryArchive.js`
// once before deploying the archive feature.
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const indexes = await Story.collection.indexes();
  const ttlIndex = indexes.find((index) => index.key?.expiresAt === 1 && index.expireAfterSeconds !== undefined);
  if (ttlIndex) {
    await Story.collection.dropIndex(ttlIndex.name);
    console.log(`Dropped legacy TTL index: ${ttlIndex.name}`);
  } else {
    console.log('No legacy Story TTL index found.');
  }
} finally {
  await mongoose.disconnect();
}
