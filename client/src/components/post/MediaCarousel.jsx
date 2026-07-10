import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Fullscreen Lightbox ───────────────────────────────────────────────────────
const Lightbox = ({ media, startIndex, onClose }) => {
  const [idx, setIdx] = useState(startIndex);
  const [dir, setDir] = useState(1);
  const overlayRef = useRef(null);
  const touchStartX = useRef(null);

  const prev = useCallback(() => {
    if (idx === 0) return;
    setDir(-1);
    setIdx((i) => i - 1);
  }, [idx]);

  const next = useCallback(() => {
    if (idx === media.length - 1) return;
    setDir(1);
    setIdx((i) => i + 1);
  }, [idx, media.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) next();
    else if (diff < -50) prev();
    touchStartX.current = null;
  };

  const item = media[idx];

  const variants = {
    enter: (d) => ({ x: d > 0 ? 80 : -80, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit:  (d) => ({ x: d > 0 ? -80 : 80, opacity: 0, scale: 0.95 }),
  };

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      {media.length > 1 && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white select-none">
          {idx + 1} / {media.length}
        </span>
      )}

      {/* Prev */}
      <AnimatePresence>
        {idx > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/25"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Next */}
      <AnimatePresence>
        {idx < media.length - 1 && (
          <motion.button
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/25"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Media */}
      <AnimatePresence custom={dir} mode="wait" initial={false}>
        <motion.div
          key={idx}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="flex max-h-[90vh] max-w-[92vw] items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {item.mediaType === 'video' ? (
            <video
              src={item.url}
              controls
              autoPlay
              playsInline
              className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain"
            />
          ) : (
            <img
              src={item.url}
              alt=""
              className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
              draggable={false}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators */}
      {media.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setDir(i > idx ? 1 : -1); setIdx(i); }}
              className={`rounded-full transition-all duration-200 ${
                i === idx ? 'h-2 w-6 bg-white' : 'h-2 w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ── MediaCarousel ─────────────────────────────────────────────────────────────
export const MediaCarousel = ({ media }) => {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(null);
  const touchStartTime = useRef(null);

  if (!media?.length) return null;

  const prev = (e) => {
    e?.stopPropagation();
    setDir(-1);
    setIdx((i) => Math.max(0, i - 1));
  };

  const next = (e) => {
    e?.stopPropagation();
    setDir(1);
    setIdx((i) => Math.min(media.length - 1, i + 1));
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const elapsed = Date.now() - touchStartTime.current;
    // Only swipe if horizontal movement is significant and not a tap
    if (Math.abs(diff) > 40 && elapsed < 400) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  };

  const item = media[idx];

  const variants = {
    enter: (d) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
  };

  return (
    <>
      <div
        className="relative w-full select-none bg-black outline-none overflow-hidden group/carousel"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Post media"
      >
        {/* Slide */}
        <div className="flex aspect-square w-full items-center justify-center sm:aspect-auto">
          <AnimatePresence custom={dir} mode="wait" initial={false}>
            <motion.div
              key={idx}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex w-full items-center justify-center"
            >
              {item.mediaType === 'video' ? (
                <video
                  src={item.url}
                  controls
                  playsInline
                  className="max-h-[600px] w-full object-contain"
                />
              ) : (
                <img
                  src={item.url}
                  alt=""
                  className="max-h-[600px] w-full object-contain cursor-zoom-in"
                  loading="lazy"
                  onClick={() => setLightboxOpen(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Zoom hint — images only */}
        {item.mediaType !== 'video' && (
          <motion.button
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            onClick={() => setLightboxOpen(true)}
            className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover/carousel:opacity-100 hover:bg-black/60"
            aria-label="View fullscreen"
          >
            <ZoomIn className="h-4 w-4" />
          </motion.button>
        )}

        {/* Arrows */}
        {media.length > 1 && (
          <>
            <AnimatePresence>
              {idx > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {idx < media.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  transition={{ duration: 0.15 }}
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {media.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setDir(i > idx ? 1 : -1); setIdx(i); }}
                  animate={{ width: i === idx ? 16 : 6, opacity: i === idx ? 1 : 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="h-1.5 rounded-full bg-white"
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Counter badge */}
            <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm select-none">
              {idx + 1}/{media.length}
            </span>
          </>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <Lightbox
            media={media}
            startIndex={idx}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
