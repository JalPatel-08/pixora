import multer from 'multer';

const storage = multer.memoryStorage();

const imageVideoFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
};

const videoOnlyFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) cb(null, true);
  else cb(new Error('Only video files are allowed for reels.'), false);
};

// General upload (posts, stories, avatars) — 10 MB
export const upload = multer({
  storage,
  fileFilter: imageVideoFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Reel upload — video only, 200 MB
export const reelUpload = multer({
  storage,
  fileFilter: videoOnlyFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
});

export default upload;
