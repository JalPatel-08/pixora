import { useState, useRef, useCallback } from 'react';
import { X, ImagePlus, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { postService } from '../../services/api';
import { ProfileAvatar } from '../ProfileAvatar';

const MAX_FILES = 10;
const MAX_SIZE_MB = 10;

// ── File Picker (initial empty state) ────────────────────────────────────────

const FilePicker = ({ onFiles }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = (fileList) => {
    const valid = Array.from(fileList)
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .slice(0, MAX_FILES);
    if (valid.length) onFiles(valid);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
      className={`flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center transition-all ${
        dragOver ? 'bg-primary/5' : 'bg-background'
      }`}
    >
      <motion.div
        animate={{ scale: dragOver ? 1.1 : 1 }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border"
      >
        <ImagePlus className="h-9 w-9 text-primary" strokeWidth={1.5} />
      </motion.div>
      <div>
        <p className="text-base font-medium text-text">Drag photos and videos here</p>
        <p className="mt-1 text-xs text-text-secondary">Up to {MAX_FILES} files · {MAX_SIZE_MB} MB each</p>
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30"
      >
        Select from computer
      </motion.button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => processFiles(e.target.files)}
      />
    </div>
  );
};

// ── Post Editor (preview + caption) ──────────────────────────────────────────

const PostEditor = ({ files, previews, onBack, onSubmit, onAddMore, onRemove, isPending }) => {
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const addMoreRef = useRef(null);

  // Keep idx in bounds when files are removed
  const safeIdx = Math.min(idx, previews.length - 1);

  const handleSubmit = () => {
    const oversized = files.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversized) { setError(`"${oversized.name}" exceeds ${MAX_SIZE_MB} MB`); return; }
    setError('');
    onSubmit({ files, caption, location });
  };

  const handleRemove = (i) => {
    onRemove(i);
    // Adjust active index so we don't go out of bounds
    if (i <= safeIdx && safeIdx > 0) setIdx(safeIdx - 1);
  };

  const handleAddMoreFiles = (fileList) => {
    const incoming = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (!incoming.length) return;
    onAddMore(incoming);
    // Jump to the first newly added item
    setIdx(files.length);
  };

  const preview = previews[safeIdx];
  const isVideo = files[safeIdx]?.type?.startsWith('video/');

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* ── Preview pane ── */}
      <div
        className="relative flex flex-1 items-center justify-center bg-black"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleAddMoreFiles(e.dataTransfer.files);
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={safeIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex h-full w-full items-center justify-center"
          >
            {isVideo ? (
              <video src={preview} controls className="max-h-[500px] w-full object-contain" />
            ) : (
              <img src={preview} alt="preview" className="max-h-[500px] w-full object-contain" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Carousel controls */}
        {previews.length > 1 && (
          <>
            {safeIdx > 0 && (
              <button
                onClick={() => setIdx(safeIdx - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {safeIdx < previews.length - 1 && (
              <button
                onClick={() => setIdx(safeIdx + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {previews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === safeIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Media count badge */}
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {safeIdx + 1} / {previews.length}
        </span>

        {/* Remove current media button */}
        <button
          onClick={() => handleRemove(safeIdx)}
          className="absolute left-3 top-3 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-red-500/80 transition-colors"
          aria-label="Remove this media"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {/* Add more media button — only shown when under the limit */}
        {files.length < MAX_FILES && (
          <button
            onClick={() => addMoreRef.current?.click()}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-primary/80 transition-colors"
            aria-label="Add more media"
          >
            <Plus className="h-3.5 w-3.5" />
            Add more
          </button>
        )}

        {/* Hidden file input for "add more" */}
        <input
          ref={addMoreRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleAddMoreFiles(e.target.files)}
        />
      </div>

      {/* ── Caption pane ── */}
      <div className="flex w-full flex-col bg-card md:w-[340px] md:border-l md:border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            onClick={onBack}
            className="text-sm text-text-secondary hover:text-text transition-colors"
          >
            Back
          </button>
          <h2 className="text-sm font-semibold text-text">New post</h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={isPending}
            className="text-sm font-semibold text-primary hover:text-secondary transition-colors disabled:opacity-40"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share'}
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <ProfileAvatar user={user} size="xs" />
            <span className="text-sm font-semibold text-text">{user?.username}</span>
          </div>

          {error && (
            <p className="rounded-xl bg-danger/10 border border-danger/20 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption… Use #hashtags"
            maxLength={2200}
            rows={5}
            className="w-full resize-none bg-transparent text-sm text-text outline-none placeholder:text-text-secondary/60"
          />
          <p className="text-right text-xs text-text-secondary">{caption.length}/2,200</p>

          <div className="border-t border-border pt-3">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary/60"
            />
          </div>

          {/* Media thumbnail strip */}
          {previews.length > 1 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Media ({files.length}/{MAX_FILES})
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {previews.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      i === safeIdx ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {files[i]?.type?.startsWith('video/') ? (
                      <video src={p} className="h-full w-full object-cover" />
                    ) : (
                      <img src={p} alt="" className="h-full w-full object-cover" />
                    )}
                    {/* Remove individual thumbnail */}
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-text-secondary">
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </p>
        </div>
      </div>
    </div>
  );
};

// ── CreatePostModal ───────────────────────────────────────────────────────────

export const CreatePostModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  // FIX 2: files + previews state lives here so PostEditor can mutate them
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const reset = useCallback(() => {
    // Revoke all object URLs to avoid memory leaks
    setPreviews((prev) => { prev.forEach((p) => URL.revokeObjectURL(p)); return []; });
    setFiles([]);
  }, []);

  const handleClose = () => { reset(); onClose(); };

  // Initial file selection — replaces everything
  const handleFiles = (selected) => {
    reset();
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  // FIX 2: merge additional files into existing selection
  const handleAddMore = useCallback((incoming) => {
    setFiles((prev) => {
      const merged = [...prev, ...incoming].slice(0, MAX_FILES);
      return merged;
    });
    setPreviews((prev) => {
      const newUrls = incoming.map((f) => URL.createObjectURL(f));
      return [...prev, ...newUrls].slice(0, MAX_FILES);
    });
  }, []);

  // FIX 2: remove a single file by index
  const handleRemove = useCallback((i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[i]);
      return prev.filter((_, idx) => idx !== i);
    });
  }, []);

  const mutation = useMutation({
    mutationFn: ({ files: fs, caption, location }) => {
      const fd = new FormData();
      fs.forEach((f) => fd.append('media', f));
      fd.append('caption', caption);
      if (location) fd.append('location', location);
      const tags = [...new Set(
        (caption.match(/#([a-zA-Z0-9_]+)/g) || []).map((t) => t.slice(1))
      )];
      if (tags.length) fd.append('tags', tags.join(','));
      return postService.create(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
      handleClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative flex h-[90vh] max-h-[700px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="w-8" />
          <h1 className="font-semibold text-text">Create new post</h1>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleClose}
            className="rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {files.length === 0 ? (
            <FilePicker onFiles={handleFiles} />
          ) : (
            <PostEditor
              files={files}
              previews={previews}
              onBack={reset}
              onAddMore={handleAddMore}
              onRemove={handleRemove}
              onSubmit={(data) => mutation.mutate(data)}
              isPending={mutation.isPending}
            />
          )}
        </div>

        {mutation.isError && (
          <div className="border-t border-border bg-danger/5 px-5 py-3 text-sm text-danger">
            {mutation.error?.response?.data?.message || 'Upload failed. Please try again.'}
          </div>
        )}
      </motion.div>
    </div>
  );
};
