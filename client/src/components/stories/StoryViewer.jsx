import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Eye, Heart, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { storyService } from '../../services/api';
import { ProfileAvatar } from '../ProfileAvatar';
import { timeAgo } from '../../utils/formatters';

const DURATION = 5000;
const BOTTOM_BAR_H = 64;

// ── Seen By Modal ─────────────────────────────────────────────────────────────
const SeenByModal = ({ storyId, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['storyViewers', storyId],
    queryFn: () => storyService.getViewers(storyId),
    staleTime: 30 * 1000,
  });

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="absolute inset-0 z-30 flex flex-col bg-black/92 sm:rounded-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-white">
          Seen by {data ? data.viewCount : '—'}
        </span>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="rounded-full p-1 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </motion.button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading && (
          <div className="flex flex-col gap-3 px-4 py-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full shimmer flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 shimmer rounded" />
                  <div className="h-2 w-16 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && data?.viewers?.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 py-10 text-center"
          >
            <span className="text-3xl select-none">👁️</span>
            <p className="text-sm text-white/50">No views yet</p>
          </motion.div>
        )}
        {data?.viewers?.map((v, i) => (
          <motion.div
            key={v.user._id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 px-4 py-2"
          >
            <ProfileAvatar user={v.user} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{v.user.username}</p>
              {v.user.name && <p className="text-xs text-white/50 truncate">{v.user.name}</p>}
            </div>
            <span className="text-xs text-white/40 flex-shrink-0">{timeAgo(v.viewedAt)}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ state, progress }) => {
  // state: 'done' | 'active' | 'pending'
  return (
    <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
      <motion.div
        className="h-full rounded-full bg-white"
        animate={{
          width: state === 'done' ? '100%' : state === 'active' ? `${progress}%` : '0%',
        }}
        transition={state === 'active' ? { duration: 0, ease: 'linear' } : { duration: 0.15 }}
      />
    </div>
  );
};

// ── Story Viewer ──────────────────────────────────────────────────────────────
export const StoryViewer = ({ groups, startGroupIndex = 0, onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seenByOpen, setSeenByOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);
  const [likeState, setLikeState] = useState({});
  // Track media transition direction for slide animation
  const [slideDir, setSlideDir] = useState(1);

  const intervalRef = useRef(null);
  const startRef = useRef(null);
  const elapsedRef = useRef(0);
  const inputRef = useRef(null);
  const inputFocused = useRef(false);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];
  const isOwn = user?._id === group?.user?._id || user?.username === group?.user?.username;

  const currentLiked = likeState[story?._id]?.liked ?? story?.liked ?? false;
  const currentLikeCount = likeState[story?._id]?.count ?? story?.likes?.length ?? 0;

  const timerPaused = paused || seenByOpen || inputFocused.current;

  const deleteMutation = useMutation({
    mutationFn: storyService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    },
  });

  const likeMutation = useMutation({
    mutationFn: (id) => storyService.like(id),
    onMutate: (id) => {
      setLikeState((prev) => {
        const cur = prev[id] ?? { liked: story?.liked ?? false, count: story?.likes?.length ?? 0 };
        return {
          ...prev,
          [id]: { liked: !cur.liked, count: cur.liked ? cur.count - 1 : cur.count + 1 },
        };
      });
    },
    onSuccess: (data, id) => {
      setLikeState((prev) => ({ ...prev, [id]: { liked: data.liked, count: data.likeCount } }));
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, text }) => storyService.reply(id, text),
    onSuccess: () => {
      setReplyText('');
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2000);
    },
  });

  const goToGroup = useCallback((newGroupIdx, newStoryIdx = 0, dir = 1) => {
    elapsedRef.current = 0;
    setProgress(0);
    setSeenByOpen(false);
    setReplyText('');
    setSlideDir(dir);
    clearInterval(intervalRef.current);
    setGroupIdx(newGroupIdx);
    setStoryIdx(newStoryIdx);
  }, []);

  const advance = useCallback(
    (dir) => {
      elapsedRef.current = 0;
      setProgress(0);
      setSeenByOpen(false);
      setReplyText('');
      setSlideDir(dir === 'next' ? 1 : -1);
      clearInterval(intervalRef.current);
      if (dir === 'next') {
        if (storyIdx < group.stories.length - 1) {
          setStoryIdx((i) => i + 1);
        } else if (groupIdx < groups.length - 1) {
          setGroupIdx((i) => i + 1);
          setStoryIdx(0);
        } else {
          onClose();
        }
      } else {
        if (storyIdx > 0) {
          setStoryIdx((i) => i - 1);
        } else if (groupIdx > 0) {
          setGroupIdx((i) => i - 1);
          setStoryIdx(0);
        }
      }
    },
    [storyIdx, groupIdx, group, groups, onClose]
  );

  useEffect(() => {
    if (story?._id && !story.seen && !isOwn) {
      storyService.view(story._id).catch(() => {});
    }
  }, [story?._id, isOwn]);

  useEffect(() => {
    if (!story || timerPaused) return;
    startRef.current = Date.now() - elapsedRef.current;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= DURATION) advance('next');
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [story?._id, timerPaused, advance]);

  useEffect(() => {
    const h = (e) => {
      if (document.activeElement === inputRef.current) return;
      if (e.key === 'ArrowRight') advance('next');
      else if (e.key === 'ArrowLeft') advance('prev');
      else if (e.key === 'Escape') {
        if (seenByOpen) setSeenByOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [advance, onClose, seenByOpen]);

  if (!group || !story) return null;

  const handleCardPauseStart = (e) => {
    if (e.target.closest('[data-no-pause]')) return;
    elapsedRef.current = Date.now() - (startRef.current ?? Date.now());
    setPaused(true);
  };
  const handleCardPauseEnd = (e) => {
    if (e.target.closest('[data-no-pause]')) return;
    setPaused(false);
  };

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim() || replyMutation.isPending) return;
    replyMutation.mutate({ id: story._id, text: replyText });
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    onClose();
    navigate(`/profile/${group.user.username}`);
  };

  const mediaVariants = {
    enter: (d) => ({ x: d > 0 ? '8%' : '-8%', opacity: 0, scale: 0.97 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d) => ({ x: d > 0 ? '-8%' : '8%', opacity: 0, scale: 0.97 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92"
    >
      {/* Close */}
      <motion.button
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.75)' }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded-full bg-black/50 p-2 text-white transition-colors"
      >
        <X className="h-5 w-5" />
      </motion.button>

      {/* Prev group arrow */}
      <AnimatePresence>
        {groupIdx > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.75)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => goToGroup(groupIdx - 1, 0, -1)}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hidden sm:flex transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Next group arrow */}
      <AnimatePresence>
        {groupIdx < groups.length - 1 && (
          <motion.button
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.75)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => goToGroup(groupIdx + 1, 0, 1)}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hidden sm:flex transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Card */}
      <motion.div
        key={groupIdx}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="relative h-full w-full max-h-[100dvh] max-w-sm overflow-hidden bg-black sm:rounded-2xl"
        onMouseDown={handleCardPauseStart}
        onMouseUp={handleCardPauseEnd}
        onTouchStart={handleCardPauseStart}
        onTouchEnd={handleCardPauseEnd}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-2">
          {group.stories.map((s, i) => (
            <ProgressBar
              key={s._id}
              state={i < storyIdx ? 'done' : i === storyIdx ? 'active' : 'pending'}
              progress={progress}
            />
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-10 flex items-center justify-between px-3 pt-2">
          <motion.button
            data-no-pause
            onClick={handleProfileClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded-full px-1 py-1 transition-opacity active:opacity-60"
            aria-label={`View ${group.user.username}'s profile`}
          >
            {/* Avatar with subtle ring on hover */}
            <div className="rounded-full ring-2 ring-transparent transition-all hover:ring-white/40">
              <ProfileAvatar user={group.user} size="xs" />
            </div>
            <span className="text-sm font-semibold text-white drop-shadow">{group.user.username}</span>
            <span className="text-xs text-white/60">{timeAgo(story.createdAt)}</span>
          </motion.button>

          <div className="flex items-center gap-1">
            {isOwn && (
              <motion.button
                data-no-pause
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); setSeenByOpen((v) => !v); }}
                className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-white hover:bg-black/60 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="text-xs">{story.viewers?.length ?? 0}</span>
              </motion.button>
            )}
            {isOwn && (
              <motion.button
                data-no-pause
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(story._id); }}
                disabled={deleteMutation.isPending}
                className="rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Tap zones */}
        <div
          className="absolute left-0 right-0 z-10 flex"
          style={{ top: 64, bottom: BOTTOM_BAR_H }}
        >
          <div className="flex-1 cursor-pointer" onClick={() => advance('prev')} />
          <div className="flex-1 cursor-pointer" onClick={() => advance('next')} />
        </div>

        {/* Media — animated slide transition */}
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden"
          style={{ paddingBottom: BOTTOM_BAR_H }}
        >
          <AnimatePresence custom={slideDir} mode="wait" initial={false}>
            <motion.div
              key={story._id}
              custom={slideDir}
              variants={mediaVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="h-full w-full flex items-center justify-center"
            >
              {story.media.mediaType === 'video' ? (
                <video
                  src={story.media.url}
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <img
                  src={story.media.url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        <AnimatePresence>
          {story.caption && (
            <motion.div
              key={story._id + '-caption'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="absolute z-10 left-0 right-0 px-4 text-center"
              style={{ bottom: BOTTOM_BAR_H + 8 }}
            >
              <p className="text-sm text-white drop-shadow">{story.caption}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom bar */}
        <div
          data-no-pause
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-3 py-3 bg-gradient-to-t from-black/70 to-transparent"
          style={{ height: BOTTOM_BAR_H }}
        >
          {isOwn ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-white/70 text-sm"
            >
              <Eye className="h-4 w-4" />
              <span>{story.viewers?.length ?? 0} views</span>
              <AnimatePresence>
                {currentLikeCount > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    className="flex items-center gap-1 ml-2"
                  >
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    <span>{currentLikeCount}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <>
              <form onSubmit={handleReplySubmit} className="flex flex-1 items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => {
                    inputFocused.current = true;
                    elapsedRef.current = Date.now() - (startRef.current ?? Date.now());
                    setPaused(true);
                  }}
                  onBlur={() => {
                    inputFocused.current = false;
                    setPaused(false);
                  }}
                  placeholder={replySent ? 'Sent! ✓' : `Reply to ${group.user.username}…`}
                  className="flex-1 rounded-full border border-white/40 bg-transparent px-4 py-1.5 text-sm text-white placeholder-white/50 outline-none focus:border-white/80 transition-colors"
                  maxLength={200}
                />
                <AnimatePresence>
                  {replyText.trim() && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      type="submit"
                      disabled={replyMutation.isPending}
                      className="flex-shrink-0 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </form>

              {/* Like button */}
              <motion.button
                data-no-pause
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.85 }}
                onClick={(e) => { e.stopPropagation(); likeMutation.mutate(story._id); }}
                disabled={likeMutation.isPending}
                className="flex-shrink-0 p-2"
              >
                <motion.span
                  animate={currentLiked ? { scale: [1, 1.4, 0.85, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex"
                >
                  <Heart
                    className={`h-6 w-6 transition-colors duration-200 ${
                      currentLiked ? 'fill-red-500 text-red-500' : 'text-white'
                    }`}
                  />
                </motion.span>
              </motion.button>
            </>
          )}
        </div>

        {/* Seen by modal */}
        <AnimatePresence>
          {seenByOpen && isOwn && (
            <SeenByModal storyId={story._id} onClose={() => setSeenByOpen(false)} />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
