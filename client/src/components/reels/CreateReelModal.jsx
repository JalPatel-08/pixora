import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Film, Hash, Loader2 } from 'lucide-react';
import { reelService } from '../../services/api';

export const CreateReelModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
    setTagsInput('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('video', file);
      fd.append('caption', caption.trim());
      const tags = tagsInput.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
      tags.forEach((t) => fd.append('tags', t));
      return reelService.create(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels-feed'] });
      handleClose();
    },
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="w-full sm:max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-text">New Reel</h2>
            </div>
            <button onClick={handleClose} className="rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Video picker */}
            {!preview ? (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background py-12 text-text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                <Upload className="h-10 w-10" strokeWidth={1.5} />
                <div className="text-center">
                  <p className="font-semibold text-sm">Click to select a video</p>
                  <p className="text-xs mt-0.5">MP4, MOV, WebM · up to 200 MB</p>
                </div>
              </motion.button>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-black aspect-[9/16] max-h-64 flex items-center justify-center">
                <video src={preview} className="h-full w-full object-contain" controls muted />
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />

            {/* Caption */}
            <div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption… use @mentions and #hashtags"
                maxLength={2200}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text outline-none placeholder:text-text-secondary/60 focus:border-primary transition-colors"
              />
              <p className="mt-0.5 text-right text-xs text-text-secondary">{caption.length}/2200</p>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
              <Hash className="h-4 w-4 flex-shrink-0 text-text-secondary" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Tags, comma-separated (e.g. travel, food)"
                className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-secondary/60"
              />
            </div>

            {/* Upload progress */}
            {uploadMutation.isPending && (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  />
                </div>
                <p className="text-center text-xs text-text-secondary">Uploading reel…</p>
              </div>
            )}

            {uploadMutation.isError && (
              <p className="text-center text-xs text-danger">Upload failed. Please try again.</p>
            )}

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
              ) : (
                <><Film className="h-4 w-4" />Share Reel</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateReelModal;
