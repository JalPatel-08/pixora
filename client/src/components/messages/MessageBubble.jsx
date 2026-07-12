import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ExternalLink, X, Play, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { timeAgo } from '../../utils/formatters';

// ── Typing indicator ──────────────────────────────────────────────────────────
export const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 8, scale: 0.88 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 8, scale: 0.88 }}
    transition={{ type: 'spring', stiffness: 400, damping: 26 }}
    className="flex justify-start"
  >
    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-background border border-border px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-text-secondary"
          animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.17, ease: 'easeInOut' }}
        />
      ))}
    </div>
  </motion.div>
);

// ── Fullscreen media viewer ───────────────────────────────────────────────────
const MediaViewer = ({ src, type, onClose }) => {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/25 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] max-w-[92vw] items-center justify-center">
        {type === 'video' ? (
          <div className="relative">
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              playsInline
              muted={muted}
              className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain"
            />
            <button
              onClick={() => setMuted((v) => !v)}
              className="absolute bottom-12 right-3 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <img
            src={src}
            alt=""
            className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            draggable={false}
          />
        )}
      </div>
    </motion.div>
  );
};

// ── Shared post card ──────────────────────────────────────────────────────────
const SharedPostCard = ({ sharedPost, isOwn }) => (
  <Link
    to={`/post/${sharedPost.postId}`}
    className={`group flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:opacity-80 ${
      isOwn ? 'border-white/20 bg-white/10' : 'border-border bg-surface'
    }`}
  >
    {sharedPost.thumbnail ? (
      <img
        src={sharedPost.thumbnail}
        alt="shared post"
        className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
        loading="lazy"
      />
    ) : (
      <div className={`h-12 w-12 flex-shrink-0 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-background'}`} />
    )}
    <div className="min-w-0 flex-1">
      <p className={`text-xs font-semibold truncate ${isOwn ? 'text-white' : 'text-text'}`}>
        {sharedPost.authorUsername}
      </p>
      {sharedPost.caption && (
        <p className={`text-xs truncate mt-0.5 ${isOwn ? 'text-white/70' : 'text-text-secondary'}`}>
          {sharedPost.caption}
        </p>
      )}
      <p className={`text-[10px] mt-1 flex items-center gap-1 ${isOwn ? 'text-white/50' : 'text-text-secondary'}`}>
        <ExternalLink className="h-2.5 w-2.5" /> View post
      </p>
    </div>
  </Link>
);

// ── Image bubble content ──────────────────────────────────────────────────────
const ImageContent = ({ url, onOpen }) => (
  <div
    className="relative cursor-zoom-in overflow-hidden rounded-xl"
    onClick={onOpen}
  >
    <img
      src={url}
      alt=""
      className="max-h-64 w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
      loading="lazy"
    />
    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
      <Maximize2 className="h-6 w-6 text-white drop-shadow" />
    </div>
  </div>
);

// ── Video bubble content ──────────────────────────────────────────────────────
const VideoContent = ({ url, onOpen }) => (
  <div
    className="relative cursor-pointer overflow-hidden rounded-xl"
    onClick={onOpen}
  >
    <video
      src={url}
      className="max-h-64 w-full object-cover"
      preload="metadata"
      muted
      playsInline
    />
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
        <Play className="h-5 w-5 text-gray-900 ml-0.5" />
      </div>
    </div>
  </div>
);

// ── Message bubble ────────────────────────────────────────────────────────────
export const MessageBubble = ({ message, isOwn, isFirst, isLast, onAddToStory }) => {
  const [viewer, setViewer] = useState(null); // { src, type }

  const ownCorners =
    isFirst && isLast ? 'rounded-2xl' :
    isFirst            ? 'rounded-2xl rounded-br-sm' :
    isLast             ? 'rounded-2xl rounded-tr-sm' :
                         'rounded-2xl rounded-r-sm';

  const otherCorners =
    isFirst && isLast ? 'rounded-2xl' :
    isFirst            ? 'rounded-2xl rounded-bl-sm' :
    isLast             ? 'rounded-2xl rounded-tl-sm' :
                         'rounded-2xl rounded-l-sm';

  const hasImage = !!message.image?.url;
  const hasVideo = !!message.video?.url;
  const hasMedia = hasImage || hasVideo;
  const hasText = !!message.text?.trim();
  const isSharedPost = !!message.sharedPost?.postId;
  const isStoryMention = !!message.storyMention?.storyId;
  const isStoryReply = !!message.storyReply?.storyId;

  // Media-only bubbles have no padding; text+media or text-only have padding
  const bubbleBase = `text-sm shadow-sm ${isSharedPost || isStoryReply || isStoryMention || hasMedia ? 'max-w-[80%]' : 'max-w-[72%]'}`;
  const bubbleColor = isOwn
    ? `bg-primary text-white ${ownCorners}`
    : `bg-background text-text border border-border ${otherCorners}`;

  // For media-only: no px/py on outer div, media fills edge-to-edge with rounded corners
  const bubblePadding = hasMedia && !hasText ? 'overflow-hidden' : 'px-3 py-2';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.94, x: isOwn ? 12 : -12 }}
        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 440, damping: 30 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <motion.div
          whileHover={{ scale: 1.012 }}
          transition={{ duration: 0.14 }}
          className={`${bubbleBase} ${bubbleColor} ${bubblePadding}`}
        >
          {/* Shared post */}
          {isSharedPost && (
            <div className="p-2">
              <SharedPostCard sharedPost={message.sharedPost} isOwn={isOwn} />
            </div>
          )}

          {/* Story mention card */}
          {isStoryMention && (
            <div className="overflow-hidden rounded-xl border border-white/20 bg-black/20">
              {message.storyMention.mediaType === 'video'
                ? <video src={message.storyMention.mediaUrl} className="h-40 w-full object-cover" muted playsInline preload="metadata" />
                : <img src={message.storyMention.mediaUrl} alt="Story" className="h-40 w-full object-cover" loading="lazy" />}
              <div className="px-2 py-1.5">
                <p className="text-xs opacity-80">@{message.storyMention.authorUsername} mentioned you in their story</p>
                {!isOwn && message.storyMention.allowReshare && (
                  <button
                    onClick={() => onAddToStory?.(message.storyMention)}
                    className="mt-1.5 w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-white"
                  >
                    Add to Your Story
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Story reply preview */}
          {isStoryReply && (
            <div className="overflow-hidden rounded-xl border border-white/20 bg-black/20">
              {message.storyReply.mediaType === 'video' ? <video src={message.storyReply.mediaUrl} className="h-32 w-full object-cover" muted playsInline preload="metadata" /> : <img src={message.storyReply.mediaUrl} alt="Story preview" className="h-32 w-full object-cover" loading="lazy" />}
              <p className="px-2 py-1.5 text-xs opacity-80">Story reply</p>
            </div>
          )}

          {/* Image */}
          {hasImage && (
            <ImageContent
              url={message.image.url}
              onOpen={() => setViewer({ src: message.image.url, type: 'image' })}
            />
          )}

          {/* Video */}
          {hasVideo && (
            <VideoContent
              url={message.video.url}
              onOpen={() => setViewer({ src: message.video.url, type: 'video' })}
            />
          )}

          {/* Text (shown below media if both present) */}
          {hasText && (
            <p className={`break-words leading-relaxed ${hasMedia ? 'px-3 pt-2 pb-1' : ''}`}>
              {message.text}
            </p>
          )}

          {/* Timestamp */}
          {!isSharedPost && (
            <p className={`text-right text-[10px] ${
              hasMedia && !hasText ? 'absolute bottom-1.5 right-2 text-white drop-shadow' :
              hasMedia ? 'px-3 pb-1' : 'mt-0.5'
            } ${isOwn ? 'text-white/55' : 'text-text-secondary'}`}>
              {timeAgo(message.createdAt)}
            </p>
          )}

          {/* Timestamp for shared post */}
          {isSharedPost && (
            <p className={`px-2 pb-2 text-right text-[10px] ${isOwn ? 'text-white/55' : 'text-text-secondary'}`}>
              {timeAgo(message.createdAt)}
            </p>
          )}
        </motion.div>
      </motion.div>

      {/* Fullscreen viewer */}
      <AnimatePresence>
        {viewer && (
          <MediaViewer
            src={viewer.src}
            type={viewer.type}
            onClose={() => setViewer(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
