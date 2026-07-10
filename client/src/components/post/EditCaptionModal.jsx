import { useState } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { postService } from '../../services/api';

export const EditCaptionModal = ({ post, onClose }) => {
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState(post.caption || '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const tags = [...new Set(
        (caption.match(/#([a-zA-Z0-9_]+)/g) || []).map((t) => t.slice(1))
      )];
      return postService.update(post._id, { caption, tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
      onClose();
    },
    onError: (e) => setError(e.response?.data?.message || 'Update failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors">
            <X className="h-4 w-4" />
          </motion.button>
          <h2 className="font-semibold text-text">Edit caption</h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="text-sm font-semibold text-primary hover:text-secondary transition-colors disabled:opacity-40"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </motion.button>
        </div>

        <div className="p-5">
          {error && (
            <p className="mb-3 rounded-xl bg-danger/10 border border-danger/20 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={2200}
            rows={5}
            placeholder="Write a caption…"
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-text outline-none transition-all placeholder:text-text-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-right text-xs text-text-secondary">{caption.length}/2,200</p>
        </div>
      </motion.div>
    </div>
  );
};
