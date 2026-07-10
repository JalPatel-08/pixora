import { useEffect, useRef } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    background:currentColor;opacity:0.15;transform:scale(0);
    animation:_ripple 0.55s cubic-bezier(.4,0,.2,1) forwards;
  `;
  el.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
}

export const PostOptionsMenu = ({ isOwner, onEdit, onDelete, onClose }) => {
  const sheetRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) onClose();
    };
    // slight delay so the click that opened the menu doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        ref={sheetRef}
        initial={{ y: 80, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-card border border-border shadow-2xl sm:rounded-2xl"
      >
        {isOwner && (
          <>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onPointerDown={spawnRipple}
              onClick={onEdit}
              className="relative overflow-hidden flex w-full items-center gap-3 border-b border-border px-5 py-4 text-sm font-medium text-text transition-colors hover:bg-background"
            >
              <Pencil className="h-4 w-4 text-text-secondary" />
              Edit caption
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onPointerDown={spawnRipple}
              onClick={onDelete}
              className="relative overflow-hidden flex w-full items-center gap-3 border-b border-border px-5 py-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
            >
              <Trash2 className="h-4 w-4" />
              Delete post
            </motion.button>
          </>
        )}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onPointerDown={spawnRipple}
          onClick={onClose}
          className="relative overflow-hidden flex w-full items-center justify-center gap-2 px-5 py-4 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
        >
          <X className="h-4 w-4" />
          Cancel
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
