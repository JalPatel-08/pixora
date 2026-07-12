import { useState, useRef } from 'react';
import { Archive, Plus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { storyService } from '../../services/api';
import { ProfileAvatar } from '../ProfileAvatar';
import { StoryViewer } from './StoryViewer';
import { StoryEditor } from './StoryEditor';

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

const StoryLibrary = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [title, setTitle] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['storyArchive'], queryFn: storyService.getArchive });
  const createHighlight = useMutation({ mutationFn: storyService.createHighlight, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['storyHighlights'] }); setSelected([]); setTitle(''); } });
  const archive = data?.stories || [];
  return <div className="fixed inset-0 z-[9999] flex items-end bg-black/60 p-0 sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
    <div className="max-h-[82dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-4 text-text sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Story archive</h2><p className="text-xs text-text-secondary">Select archived stories to create a highlight.</p></div><button onClick={onClose} aria-label="Close archive"><X /></button></div>
      {isLoading ? <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map((item) => <div key={item} className="aspect-[9/16] shimmer rounded-lg" />)}</div> : archive.length === 0 ? <p className="py-10 text-center text-sm text-text-secondary">Your expired stories will appear here.</p> : <><div className="grid grid-cols-3 gap-2">{archive.map((story) => <button key={story._id} onClick={() => setSelected((items) => items.includes(story._id) ? items.filter((id) => id !== story._id) : [...items, story._id])} className={`relative aspect-[9/16] overflow-hidden rounded-lg ${selected.includes(story._id) ? 'ring-2 ring-primary' : ''}`}>{story.media.mediaType === 'video' ? <video src={story.media.url} className="h-full w-full object-cover" muted /> : <img src={story.media.url} alt="Archived story" className="h-full w-full object-cover" loading="lazy" />}</button>)}</div><div className="mt-4 flex gap-2"><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={30} placeholder="Highlight name" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button disabled={!title.trim() || !selected.length || createHighlight.isPending} onClick={() => createHighlight.mutate({ title, storyIds: selected })} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button></div></>}</div>
  </div>;
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
  const [editingDraft, setEditingDraft] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stories'],
    queryFn: storyService.getFeed,
    staleTime: 60 * 1000,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, audience, elements, draftId, saveOnly }) => {
      if (draftId) return saveOnly ? storyService.updateDraft(draftId, { audience, elements }) : storyService.publishDraft(draftId, { audience, elements });
      const fd = new FormData();
      fd.append('media', file);
      fd.append('audience', audience);
      fd.append('elements', JSON.stringify(elements || []));
      if (saveOnly) fd.append('isDraft', 'true');
      return storyService.create(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['storyDrafts'] });
      clearPending();
      setEditingDraft(null);
    },
    // Do NOT call clearPending on error — keep the editor open so the user can retry
  });

  const handlePublish = (payload) => {
    uploadMutation.mutate(payload);
  };

  const draftsQuery = useQuery({ queryKey: ['storyDrafts'], queryFn: storyService.getDrafts, staleTime: 30 * 1000 });
  const discardDraft = useMutation({ mutationFn: storyService.discardDraft, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['storyDrafts'] }); setEditingDraft(null); } });

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
              onClick={() => {
                if (pendingFile) return;
                hasOwnStory ? openViewer(ownGroupIdx) : fileRef.current?.click();
              }}
            >
              <ProfileAvatar user={user} size="sm" />
            </StoryRing>

            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); if (!pendingFile) fileRef.current?.click(); }}
              disabled={uploadMutation.isPending || !!pendingFile}
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

        <button onClick={() => setLibraryOpen(true)} className="flex flex-shrink-0 flex-col items-center gap-1.5" aria-label="Open story archive"><div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border bg-card"><Archive className="h-5 w-5 text-text-secondary" /></div><span className="text-[11px] text-text-secondary">Archive</span></button>

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

        {draftsQuery.data?.drafts?.map((draft) => (
          <button key={draft._id} onClick={() => setEditingDraft(draft)} className="flex flex-shrink-0 flex-col items-center gap-1.5" aria-label="Continue story draft">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-dashed border-primary p-0.5">
              {draft.media.mediaType === 'video' ? <video src={draft.media.url} className="h-full w-full rounded-full object-cover" muted /> : <img src={draft.media.url} alt="Draft" className="h-full w-full rounded-full object-cover" />}
            </div><span className="max-w-[56px] truncate text-[11px] font-medium text-text-secondary">Draft</span>
          </button>
        ))}

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

      {/* Story editor — shown after file is selected */}
      <AnimatePresence>
        {pendingFile && pendingPreview && (
          <StoryEditor
            file={pendingFile}
            preview={pendingPreview}
            onPublish={handlePublish}
            onSaveDraft={(payload) => handlePublish({ ...payload, saveOnly: true })}
            onCancel={clearPending}
            isUploading={uploadMutation.isPending}
          />
        )}
        {editingDraft && (
          <StoryEditor
            draft={editingDraft}
            onPublish={handlePublish}
            onSaveDraft={(payload) => handlePublish({ ...payload, saveOnly: true })}
            onDiscard={() => discardDraft.mutate(editingDraft._id)}
            onCancel={() => setEditingDraft(null)}
            isUploading={uploadMutation.isPending || discardDraft.isPending}
          />
        )}
      </AnimatePresence>

      {libraryOpen && <StoryLibrary onClose={() => setLibraryOpen(false)} />}

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
