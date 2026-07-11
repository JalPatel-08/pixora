import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX,
  Play, UserPlus, UserCheck, MoreHorizontal, Trash2, Eye,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { reelService, userService } from '../../services/api';
import { ProfileAvatar } from '../ProfileAvatar';
import { CommentSection } from '../post/CommentSection';
import { ShareModal } from '../post/ShareModal';
import { formatCount, timeAgo } from '../../utils/formatters';

// ── Hashtag / mention renderer ────────────────────────────────────────────────
const RichCaption = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/([@#][\w.]+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('#'))
          return (
            <Link
              key={i}
              to={`/explore?tag=${part.slice(1)}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-primary/90 hover:text-primary transition-colors"
            >
              {part}
            </Link>
          );
        if (part.startsWith('@'))
          return (
            <Link
              key={i}
              to={`/profile/${part.slice(1)}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-primary/90 hover:text-primary transition-colors"
            >
              {part}
            </Link>
          );
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// ── Action button ─────────────────────────────────────────────────────────────
const ActionBtn = ({ icon: Icon, label, onClick, active, activeClass = 'text-red-500', disabled }) => (
  <motion.button
    whileTap={{ scale: 0.78 }}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="flex flex-col items-center gap-1 disabled:opacity-50 focus:outline-none"
  >
    <motion.div
      animate={active ? { scale: [1, 1.35, 0.9, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <Icon
        className={`h-7 w-7 drop-shadow-md transition-colors ${active ? activeClass : 'text-white'}`}
        fill={active ? 'currentColor' : 'none'}
        strokeWidth={active ? 0 : 2}
      />
    </motion.div>
    {label !== undefined && label !== '' && (
      <span className="text-xs font-semibold text-white drop-shadow select-none">{label}</span>
    )}
  </motion.button>
);

// ── Reel skeleton (shown while video loads) ───────────────────────────────────
export const ReelSkeleton = () => (
  <div className="relative flex h-full w-full items-center justify-center bg-zinc-900">
    <div className="shimmer absolute inset-0" />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
    {/* Fake action bar */}
    <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 md:bottom-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-7 w-7 rounded-full shimmer" />
      ))}
    </div>
    {/* Fake author row */}
    <div className="absolute bottom-20 left-3 right-16 md:bottom-6">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full shimmer flex-shrink-0" />
        <div className="h-3 w-24 rounded shimmer" />
      </div>
      <div className="mt-2 h-3 w-48 rounded shimmer" />
    </div>
  </div>
);

// ── ReelCard ──────────────────────────────────────────────────────────────────
export const ReelCard = ({ reel: initialReel, isActive, globalMuted, onMuteToggle }) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const viewTimerRef = useRef(null);
  const lastTapRef = useRef(0);

  const [reel, setReel] = useState(initialReel);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const isOwn = currentUser?._id === reel.author?._id;

  // ── Sync mute imperatively (avoids re-render) ─────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = globalMuted;
  }, [globalMuted]);

  // ── Auto-play / pause + view timer ───────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setPaused(false);
      // Record view after 3 s of watching
      viewTimerRef.current = setTimeout(() => {
        reelService.recordView(reel._id).catch(() => {});
      }, 3000);
    } else {
      video.pause();
      clearTimeout(viewTimerRef.current);
      // Reset so next activation starts fresh
      setPaused(false);
    }
    return () => clearTimeout(viewTimerRef.current);
  }, [isActive, reel._id]);

  // ── Tap: single = pause/play, double = like ───────────────────────────────
  const handleVideoTap = useCallback((e) => {
    // Don't handle taps when comment drawer is open
    if (showComments) return;
    e.stopPropagation();

    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap → like
      if (!reel.isLiked) likeMutation.mutate();
      setDoubleTapLike(true);
      setTimeout(() => setDoubleTapLike(false), 900);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play().catch(() => {}); setPaused(false); }
    else { video.pause(); setPaused(true); }
  }, [showComments, reel.isLiked]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ─────────────────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: () => reelService.toggleLike(reel._id),
    onMutate: () => {
      const wasLiked = reel.isLiked;
      const prev = reel.likesCount ?? reel.likes?.length ?? 0;
      setReel((r) => ({ ...r, isLiked: !wasLiked, likesCount: wasLiked ? prev - 1 : prev + 1 }));
    },
    onSuccess: (data) => setReel((r) => ({ ...r, isLiked: data.isLiked, likesCount: data.likesCount })),
    onError: () => setReel((r) => ({
      ...r,
      isLiked: !r.isLiked,
      likesCount: (r.likesCount ?? 0) + (r.isLiked ? 1 : -1),
    })),
  });

  const saveMutation = useMutation({
    mutationFn: () => reelService.toggleSave(reel._id),
    onMutate: () => setReel((r) => ({ ...r, isSaved: !r.isSaved })),
    onSuccess: (data) => setReel((r) => ({ ...r, isSaved: data.isSaved })),
    onError: () => setReel((r) => ({ ...r, isSaved: !r.isSaved })),
  });

  const followMutation = useMutation({
    mutationFn: () =>
      reel.isFollowing
        ? userService.unfollow(reel.author._id)
        : userService.follow(reel.author._id),
    onMutate: () => setReel((r) => ({ ...r, isFollowing: !r.isFollowing })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', reel.author.username] }),
    onError: () => setReel((r) => ({ ...r, isFollowing: !r.isFollowing })),
  });

  const deleteMutation = useMutation({
    mutationFn: () => reelService.delete(reel._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels-feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-reels', reel.author.username] });
    },
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const likesCount = reel.likesCount ?? reel.likes?.length ?? 0;
  const viewsCount = reel.viewsCount ?? reel.views?.length ?? 0;
  const caption = reel.caption || '';
  const captionLong = caption.length > 80;

  const sharePost = {
    _id: reel._id,
    author: reel.author,
    caption: reel.caption,
    media: [{ url: reel.thumbnailUrl || reel.videoUrl }],
  };

  // ── Comment count optimistic update ──────────────────────────────────────
  const handleCommentAdded = useCallback(() => {
    setReel((r) => ({ ...r, commentsCount: (r.commentsCount ?? 0) + 1 }));
  }, []);

  const handleCommentDeleted = useCallback(() => {
    setReel((r) => ({ ...r, commentsCount: Math.max(0, (r.commentsCount ?? 0) - 1) }));
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black overflow-hidden">

      {/* Loading skeleton */}
      {!videoReady && !videoError && (
        <div className="absolute inset-0 z-10">
          <ReelSkeleton />
        </div>
      )}

      {/* Error state */}
      {videoError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-900">
          <p className="text-sm text-white/60">Failed to load video</p>
        </div>
      )}

      {/* Video — lazy: preload=auto only when active */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="h-full w-full object-cover"
        loop
        playsInline
        muted={globalMuted}
        preload={isActive ? 'auto' : 'none'}
        onClick={handleVideoTap}
        onCanPlay={() => setVideoReady(true)}
        onError={() => setVideoError(true)}
        aria-label={`Reel by ${reel.author?.username}`}
      />

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {doubleTapLike && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <Heart className="h-28 w-28 fill-white text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause indicator */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="rounded-full bg-black/40 p-5 backdrop-blur-sm">
              <Play className="h-10 w-10 fill-white text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />

      {/* Mute toggle */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
        aria-label={globalMuted ? 'Unmute' : 'Mute'}
        className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        {globalMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </motion.button>

      {/* Options menu — own reels only */}
      {isOwn && (
        <div className="absolute left-4 top-4">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); setShowOptions((v) => !v); }}
            aria-label="Reel options"
            className="rounded-full bg-black/40 p-2 text-white backdrop-blur-sm focus:outline-none"
          >
            <MoreHorizontal className="h-5 w-5" />
          </motion.button>
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-12 z-10 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
              >
                <button
                  onClick={() => { deleteMutation.mutate(); setShowOptions(false); }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-danger hover:bg-danger/10 transition-colors w-full whitespace-nowrap disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete reel'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Right action bar */}
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 md:bottom-8">
        <ActionBtn
          icon={Heart}
          label={formatCount(likesCount)}
          onClick={(e) => { e.stopPropagation(); likeMutation.mutate(); }}
          active={reel.isLiked}
          activeClass="text-red-500"
          disabled={likeMutation.isPending}
        />
        <ActionBtn
          icon={MessageCircle}
          label={formatCount(reel.commentsCount ?? 0)}
          onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
        />
        <ActionBtn
          icon={Bookmark}
          label=""
          onClick={(e) => { e.stopPropagation(); saveMutation.mutate(); }}
          active={reel.isSaved}
          activeClass="text-primary"
          disabled={saveMutation.isPending}
        />
        <ActionBtn
          icon={Share2}
          label=""
          onClick={(e) => { e.stopPropagation(); setShowShare(true); }}
        />
        {/* View count */}
        <div className="flex flex-col items-center gap-1" aria-label={`${viewsCount} views`}>
          <Eye className="h-6 w-6 text-white drop-shadow-md" />
          <span className="text-xs font-semibold text-white drop-shadow select-none">
            {formatCount(viewsCount)}
          </span>
        </div>
      </div>

      {/* Bottom info: author + caption + tags */}
      <div className="absolute bottom-20 left-3 right-16 md:bottom-6 md:right-20">
        {/* Author row */}
        <div className="mb-2 flex items-center gap-2.5 flex-wrap">
          <Link
            to={`/profile/${reel.author?.username}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`View ${reel.author?.username}'s profile`}
          >
            <ProfileAvatar user={reel.author} size="xs" />
          </Link>
          <Link
            to={`/profile/${reel.author?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-bold text-white drop-shadow hover:text-white/80 transition-colors"
          >
            {reel.author?.username}
          </Link>

          {/* Follow button — hidden for own reels */}
          {!isOwn && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); followMutation.mutate(); }}
              disabled={followMutation.isPending}
              aria-label={reel.isFollowing ? 'Unfollow' : 'Follow'}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                reel.isFollowing
                  ? 'border-white/40 bg-white/10 text-white backdrop-blur-sm'
                  : 'border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
              }`}
            >
              {reel.isFollowing
                ? <><UserCheck className="h-3 w-3 mr-0.5" />Following</>
                : <><UserPlus className="h-3 w-3 mr-0.5" />Follow</>
              }
            </motion.button>
          )}

          <span className="ml-auto text-xs text-white/60 drop-shadow">{timeAgo(reel.createdAt)}</span>
        </div>

        {/* Caption */}
        {caption && (
          <div className="text-sm leading-snug text-white drop-shadow-md">
            <RichCaption
              text={captionExpanded || !captionLong ? caption : caption.slice(0, 80) + '…'}
            />
            {captionLong && (
              <button
                onClick={(e) => { e.stopPropagation(); setCaptionExpanded((v) => !v); }}
                className="ml-1 text-xs font-semibold text-white/70 hover:text-white transition-colors"
              >
                {captionExpanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {reel.tags?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reel.tags.map((tag) => (
              <Link
                key={tag}
                to={`/explore?tag=${tag}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-primary/90 drop-shadow hover:text-primary transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Comment drawer ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-20 flex items-end"
            // Backdrop: close on pointer-down outside the sheet
            onPointerDown={() => setShowComments(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="w-full rounded-t-2xl bg-card border-t border-border shadow-2xl"
              style={{ maxHeight: '72vh' }}
              // Stop ALL pointer events from reaching the backdrop / video
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="font-semibold text-text">
                  Comments
                  {reel.commentsCount > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-text-secondary">
                      ({reel.commentsCount})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setShowComments(false)}
                  aria-label="Close comments"
                  className="rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(72vh - 56px)' }}>
                <CommentSection
                  postId={reel._id}
                  postOwnerId={reel.author?._id}
                  onCommentAdded={handleCommentAdded}
                  onCommentDeleted={handleCommentDeleted}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share modal */}
      <AnimatePresence>
        {showShare && <ShareModal post={sharePost} onClose={() => setShowShare(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default ReelCard;
