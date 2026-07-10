import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { storyService } from '../../services/api';
import { ProfileAvatar } from '../ProfileAvatar';
import { StoryViewer } from './StoryViewer';

// ── Animated gradient ring ────────────────────────────────────────────────────
const StoryRing = ({ seen, children, onClick, className = '' }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.94 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className={`relative rounded-full p-0.5 ${className} ${
      seen
        ? 'bg-border'
        : 'bg-gradient-to-tr from-primary via-accent to-warning'
    }`}
  >
    {/* Glow pulse for unseen */}
    {!seen && (
      <motion.span
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-accent to-warning"
        animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    )}
    <div className="relative rounded-full bg-card p-0.5">
      {children}
    </div>
  </motion.button>
);

// ── Skeleton item ─────────────────────────────────────────────────────────────
const StorySkeleton = ({ count = 5 }) => (
  <div className="mb-5 flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.06, duration: 0.3 }}
        className="flex flex-col items-center gap-2 flex-shrink-0"
      >
        <div className="h-14 w-14 shimmer rounded-full" />
        <div className="h-2 w-10 shimmer rounded" />
      </motion.div>
    ))}
  </div>
);

// ── StoriesBar ────────────────────────────────────────────────────────────────
export const StoriesBar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [startGroup, setStartGroup] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stories'],
    queryFn: storyService.getFeed,
    staleTime: 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('media', file);
      return storyService.create(fd);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stories'] }),
  });

  const groups = data?.stories ?? [];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  const openViewer = (idx) => { setStartGroup(idx); setViewerOpen(true); };

  const ownGroupIdx = groups.findIndex(
    (g) => g.user._id === user?._id || g.user.username === user?.username
  );
  const hasOwnStory = ownGroupIdx !== -1;

  if (isLoading) return <StorySkeleton count={5} />;

  // On error, still show the "Add story" slot so the user can post
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mb-5 flex gap-4 overflow-x-auto pb-2 hide-scrollbar"
      >
        {/* Own story slot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div className="relative">
            <StoryRing
              seen={!hasOwnStory}
              onClick={() => hasOwnStory ? openViewer(ownGroupIdx) : fileRef.current?.click()}
            >
              <ProfileAvatar user={user} size="sm" />
            </StoryRing>

            {/* Add / upload button */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              disabled={uploadMutation.isPending}
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white border-2 border-card shadow-sm disabled:opacity-70"
            >
              {uploadMutation.isPending
                ? <div className="h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" />
                : <Plus className="h-2.5 w-2.5" strokeWidth={3} />
              }
            </motion.button>
          </div>

          <span className="max-w-[56px] truncate text-[11px] font-medium text-text-secondary">
            {hasOwnStory ? 'Your story' : 'Add story'}
          </span>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
        </motion.div>

        {/* Other users' stories */}
        {!isError && groups.map((group, idx) => {
          if (group.user.username === user?.username || group.user._id === user?._id) return null;
          const allSeen = group.stories.every((s) => s.seen);
          return (
            <motion.div
              key={group.user._id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22, delay: idx * 0.04 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <StoryRing seen={allSeen} onClick={() => openViewer(idx)}>
                <ProfileAvatar user={group.user} size="sm" />
              </StoryRing>
              <span className="max-w-[56px] truncate text-[11px] font-medium text-text-secondary">
                {group.user.username}
              </span>
            </motion.div>
          );
        })}

        {/* Empty state — no stories from others */}
        {!isError && groups.filter(
          (g) => g.user.username !== user?.username && g.user._id !== user?._id
        ).length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center self-center text-xs text-text-secondary/60 italic pl-1"
          >
            Follow people to see their stories
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {viewerOpen && groups.length > 0 && (
          <StoryViewer
            groups={groups}
            startGroupIndex={startGroup}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
