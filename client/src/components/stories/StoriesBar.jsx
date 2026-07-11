import { useState, useRef } from 'react';
import { Plus, Globe, Users, Star, X, ChevronRight } from 'lucide-react';
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

// ── Skeleton ──────────────────────────────────────────────────────────────────
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

// ── Audience option config ────────────────────────────────────────────────────
const AUDIENCE_OPTIONS = [
  {
    value: 'everyone',
    label: 'Everyone',
    sub: 'Visible to all your followers',
    icon: Globe,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    value: 'followers',
    label: 'Followers',
    sub: 'Only people who follow you',
    icon: Users,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    value: 'close_friends',
    label: 'Close Friends',
    sub: 'Only your close friends list',
    icon: Star,
    color: 'text-success',
    bg: 'bg-success/10',
  },
];

// ── Audience Picker Sheet ─────────────────────────────────────────────────────
const AudiencePicker = ({ file, preview, onConfirm, onCancel, isUploading }) => {
  const [audience, setAudience] = useState('everyone');
  const isVideo = file?.type?.startsWith('video/');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="w-full sm:max-w-sm overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview thumbnail */}
        <div className="relative h-36 w-full overflow-hidden bg-black">
          {isVideo ? (
            <video src={preview} className="h-full w-full object-cover opacity-80" muted playsInline />
          ) : (
            <img src={preview} alt="" className="h-full w-full object-cover opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          <button
            onClick={onCancel}
            className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="absolute bottom-3 left-4 text-sm font-semibold text-white drop-shadow">
            Share story with…
          </p>
        </div>

        {/* Options */}
        <div className="p-3 space-y-1.5">
          {AUDIENCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = audience === opt.value;
            return (
              <motion.button
                key={opt.value}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAudience(opt.value)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  selected
                    ? 'bg-primary/8 border border-primary/20'
                    : 'hover:bg-background border border-transparent'
                }`}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${opt.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${opt.color}`} strokeWidth={selected ? 2.5 : 2} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-text'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-text-secondary">{opt.sub}</p>
                </div>
                <div className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors ${
                  selected ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {selected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="h-full w-full rounded-full bg-white scale-[0.45]"
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Share button */}
        <div className="px-3 pb-4 pt-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onConfirm(audience)}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-secondary transition-colors disabled:opacity-60 shadow-sm shadow-primary/30"
          >
            {isUploading ? (
              <>
                <motion.div
                  className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                Sharing…
              </>
            ) : (
              <>
                Share story
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── StoriesBar ────────────────────────────────────────────────────────────────
export const StoriesBar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [startGroup, setStartGroup] = useState(0);
  // Pending file waiting for audience selection
  const [pendingFile, setPendingFile] = useState(null);   // File object
  const [pendingPreview, setPendingPreview] = useState(null); // object URL

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stories'],
    queryFn: storyService.getFeed,
    staleTime: 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, audience }) => {
      const fd = new FormData();
      fd.append('media', file);
      fd.append('audience', audience);
      return storyService.create(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      clearPending();
    },
    onError: () => clearPending(),
  });

  const groups = data?.stories ?? [];

  const clearPending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke any previous preview
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleConfirm = (audience) => {
    if (!pendingFile) return;
    uploadMutation.mutate({ file: pendingFile, audience });
  };

  const openViewer = (idx) => { setStartGroup(idx); setViewerOpen(true); };

  const ownGroupIdx = groups.findIndex(
    (g) => g.user._id === user?._id || g.user.username === user?.username
  );
  const hasOwnStory = ownGroupIdx !== -1;

  if (isLoading) return <StorySkeleton count={5} />;

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
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
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

        {/* Empty state */}
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

      {/* Audience picker — shown after file is selected */}
      <AnimatePresence>
        {pendingFile && pendingPreview && (
          <AudiencePicker
            file={pendingFile}
            preview={pendingPreview}
            onConfirm={handleConfirm}
            onCancel={clearPending}
            isUploading={uploadMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Story viewer */}
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
