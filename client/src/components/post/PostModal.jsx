import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { postService } from '../../services/api';
import { PostCard } from './PostCard';
import { PostSkeleton } from './PostSkeleton';

export const PostModal = ({ postId, onClose }) => {
  const overlayRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postService.getPost(postId).then((d) => d.post),
    enabled: !!postId,
  });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdrop = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        onClick={handleBackdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 py-8 px-4"
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="relative w-full max-w-[470px]"
        >
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {isLoading ? (
            <PostSkeleton />
          ) : data ? (
            <PostCard post={data} onDeleted={onClose} />
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
