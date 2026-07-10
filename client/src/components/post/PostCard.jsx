import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Share2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { postService } from '../../services/api';
import { timeAgo } from '../../utils/formatters';
import { ProfileAvatar } from '../ProfileAvatar';
import { MediaCarousel } from './MediaCarousel';
import { PostOptionsMenu } from './PostOptionsMenu';
import { EditCaptionModal } from './EditCaptionModal';
import { CommentSection } from './CommentSection';
import { ShareModal } from './ShareModal';

// ── Ripple helper ─────────────────────────────────────────────────────────────
function spawnRipple(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const span = document.createElement('span');
  span.style.cssText = `
    position:absolute;border-radius:50%;pointer-events:none;
    width:${size}px;height:${size}px;left:${x}px;top:${y}px;
    background:currentColor;opacity:0.18;transform:scale(0);
    animation:_ripple 0.55s cubic-bezier(.4,0,.2,1) forwards;
  `;
  if (!document.getElementById('_ripple_kf')) {
    const s = document.createElement('style');
    s.id = '_ripple_kf';
    s.textContent = '@keyframes _ripple{to{transform:scale(1);opacity:0}}';
    document.head.appendChild(s);
  }
  el.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
}

// ── Animated heart icon ───────────────────────────────────────────────────────
const HeartIcon = ({ liked, animating }) => (
  <motion.span
    animate={animating ? { scale: [1, 1.55, 0.82, 1.12, 1] } : { scale: 1 }}
    transition={{ duration: 0.42, ease: 'easeOut' }}
    className="inline-flex"
  >
    <Heart
      className={`h-6 w-6 transition-colors duration-200 ${
        liked ? 'fill-red-500 text-red-500' : 'text-text'
      }`}
    />
  </motion.span>
);

// ── PostCard ──────────────────────────────────────────────────────────────────
export const PostCard = ({ post, onDeleted }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const postId = post._id;
  const isOwner = user?._id === post.author?._id;

  const [isLiked, setIsLiked]       = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes?.length ?? 0);
  const [isSaved, setIsSaved]       = useState(post.isSaved ?? false);
  const [heartAnim, setHeartAnim]   = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions]   = useState(false);
  const [showEdit, setShowEdit]         = useState(false);
  const [showShare, setShowShare]       = useState(false);

  // Single vs double click/tap discrimination
  const clickTimerRef = useRef(null);
  const lastTouchRef  = useRef(0);

  const triggerHeartAnim = useCallback(() => {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 450);
  }, []);

  const triggerDoubleTapHeart = useCallback(() => {
    setDoubleTapHeart(true);
    setTimeout(() => setDoubleTapHeart(false), 900);
  }, []);

  const likeMutation = useMutation({
    mutationFn: () => postService.toggleLike(postId),
    onMutate: () => {
      const next = !isLiked;
      setIsLiked(next);
      setLikesCount((c) => (next ? c + 1 : c - 1));
      if (next) triggerHeartAnim();
    },
    onError: () => {
      setIsLiked((v) => !v);
      setLikesCount((c) => (isLiked ? c + 1 : c - 1));
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => postService.toggleSave(postId),
    onMutate: () => setIsSaved((v) => !v),
    onError: () => setIsSaved((v) => !v),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postService.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
      onDeleted?.(postId);
    },
  });

  const handleDelete = () => {
    if (window.confirm('Delete this post? This cannot be undone.')) {
      setShowOptions(false);
      deleteMutation.mutate();
    }
  };

  // Desktop: single click → open viewer (handled inside MediaCarousel)
  // Desktop: double click → like
  const handleMediaDoubleClick = useCallback(() => {
    // Cancel any pending single-click action
    clearTimeout(clickTimerRef.current);
    if (!isLiked) likeMutation.mutate();
    triggerDoubleTapHeart();
  }, [isLiked, likeMutation, triggerDoubleTapHeart]);

  // Mobile: double tap → like (single tap handled inside MediaCarousel)
  const handleMediaTouchEnd = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTouchRef.current;
    lastTouchRef.current = now;
    if (delta < 300 && delta > 0) {
      if (!isLiked) likeMutation.mutate();
      triggerDoubleTapHeart();
    }
  }, [isLiked, likeMutation, triggerDoubleTapHeart]);

  const handleShare = useCallback(() => setShowShare(true), []);

  const author = post.author ?? {};

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md dark:shadow-black/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={`/profile/${author.username}`} className="flex items-center gap-3 group">
            <div className="rounded-full ring-2 ring-transparent transition-all group-hover:ring-primary/30">
              <ProfileAvatar user={author} size="xs" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-text group-hover:text-primary transition-colors">
                {author.username}
              </p>
              {post.location && (
                <p className="text-xs text-text-secondary leading-tight">{post.location}</p>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{timeAgo(post.createdAt)}</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onPointerDown={spawnRipple}
              onClick={() => setShowOptions(true)}
              className="relative overflow-hidden rounded-full p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text"
              aria-label="Post options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        {/* Media — double-tap/click zone */}
        <div
          className="relative select-none"
          onDoubleClick={handleMediaDoubleClick}
          onTouchEnd={handleMediaTouchEnd}
        >
          <MediaCarousel media={post.media} />

          {/* Center heart overlay on double-tap */}
          <AnimatePresence>
            {doubleTapHeart && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{
                  enter: { type: 'spring', stiffness: 400, damping: 20 },
                  exit: { duration: 0.4, ease: 'easeOut' },
                }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <Heart
                  className="h-24 w-24 fill-white text-white"
                  style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.5))' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action bar */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {/* Like */}
              <motion.button
                whileTap={{ scale: 0.82 }}
                onPointerDown={spawnRipple}
                onClick={() => likeMutation.mutate()}
                aria-label={isLiked ? 'Unlike' : 'Like'}
                className="relative overflow-hidden rounded-full p-2 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <HeartIcon liked={isLiked} animating={heartAnim} />
              </motion.button>

              {/* Comment */}
              <motion.button
                whileTap={{ scale: 0.82 }}
                onPointerDown={spawnRipple}
                onClick={() => setShowComments((v) => !v)}
                aria-label="Comments"
                className="relative overflow-hidden rounded-full p-2 transition-colors hover:bg-surface"
              >
                <MessageCircle
                  className={`h-6 w-6 transition-colors ${
                    showComments ? 'fill-text text-text' : 'text-text hover:text-primary'
                  }`}
                />
              </motion.button>

              {/* Share */}
              <motion.button
                whileTap={{ scale: 0.82 }}
                onPointerDown={spawnRipple}
                onClick={handleShare}
                aria-label="Share"
                className="relative overflow-hidden rounded-full p-2 transition-colors hover:bg-surface"
              >
                <Share2 className="h-6 w-6 text-text transition-colors hover:text-primary" />
              </motion.button>
            </div>

            {/* Save */}
            <motion.button
              whileTap={{ scale: 0.82 }}
              onPointerDown={spawnRipple}
              onClick={() => saveMutation.mutate()}
              aria-label={isSaved ? 'Unsave' : 'Save'}
              className="relative overflow-hidden rounded-full p-2 transition-colors hover:bg-surface"
            >
              <motion.span
                animate={isSaved ? { scale: [1, 1.35, 0.88, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="inline-flex"
              >
                <Bookmark
                  className={`h-6 w-6 transition-all duration-200 ${
                    isSaved ? 'fill-text text-text' : 'text-text hover:text-primary'
                  }`}
                />
              </motion.span>
            </motion.button>
          </div>

          {/* Likes count — animated on change */}
          <AnimatePresence mode="popLayout">
            {likesCount > 0 && (
              <motion.p
                key={likesCount}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                className="mt-2 text-sm font-semibold text-text"
              >
                {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Caption */}
          {post.caption && (
            <p className="mt-1.5 text-sm leading-snug text-text">
              <Link to={`/profile/${author.username}`} className="mr-1 font-semibold hover:underline">
                {author.username}
              </Link>
              {post.caption}
            </p>
          )}

          {/* Hashtags */}
          {post.tags?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs font-medium text-primary hover:underline cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Comments toggle */}
          {!showComments && post.commentsCount > 0 && (
            <button
              onClick={() => setShowComments(true)}
              className="mt-1.5 text-sm text-text-secondary hover:text-text transition-colors"
            >
              View all {post.commentsCount} comments
            </button>
          )}
        </div>

        {/* Comments section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CommentSection postId={postId} commentsCount={post.commentsCount} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      {showOptions && (
        <PostOptionsMenu
          isOwner={isOwner}
          onEdit={() => { setShowOptions(false); setShowEdit(true); }}
          onDelete={handleDelete}
          onClose={() => setShowOptions(false)}
        />
      )}

      {showEdit && (
        <EditCaptionModal post={post} onClose={() => setShowEdit(false)} />
      )}

      <AnimatePresence>
        {showShare && (
          <ShareModal post={post} onClose={() => setShowShare(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default PostCard;
