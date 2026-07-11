import { useState, useRef, useCallback, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Loader2, RefreshCw } from 'lucide-react';
import { reelService } from '../services/api';
import { ReelCard, ReelSkeleton } from '../components/reels/ReelCard';

// ── Reel item wrapper ─────────────────────────────────────────────────────────
const ReelItem = ({ reel, index, isActive, globalMuted, onMuteToggle, itemRef }) => (
  <div
    ref={itemRef}
    data-index={index}
    className="relative h-[calc(100vh-56px)] w-full flex-shrink-0 snap-start snap-always md:h-screen"
    role="article"
    aria-label={`Reel ${index + 1} by ${reel.author?.username ?? 'unknown'}`}
  >
    <ReelCard
      reel={reel}
      isActive={isActive}
      globalMuted={globalMuted}
      onMuteToggle={onMuteToggle}
    />
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="flex h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 md:h-screen">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border"
    >
      <Film className="h-9 w-9 text-primary" strokeWidth={1.5} />
    </motion.div>
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="text-lg font-semibold text-text"
    >
      No reels yet
    </motion.p>
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="text-sm text-text-secondary"
    >
      Tap <span className="font-semibold text-primary">+</span> to share the first reel!
    </motion.p>
  </div>
);

// ── Error state ───────────────────────────────────────────────────────────────
const ErrorState = ({ onRetry }) => (
  <div className="flex h-[calc(100vh-56px)] flex-col items-center justify-center gap-4 md:h-screen">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 border border-danger/20"
    >
      <Film className="h-9 w-9 text-danger" strokeWidth={1.5} />
    </motion.div>
    <p className="text-base font-semibold text-text">Failed to load reels</p>
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onRetry}
      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25"
    >
      <RefreshCw className="h-4 w-4" />
      Try again
    </motion.button>
  </div>
);

// ── Loading skeleton (first load) ─────────────────────────────────────────────
const LoadingState = () => (
  <div className="h-[calc(100vh-56px)] md:h-screen">
    <ReelSkeleton />
  </div>
);

// ── Reels page ────────────────────────────────────────────────────────────────
export const Reels = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalMuted, setGlobalMuted] = useState(true);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  // Touch swipe state
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['reels-feed'],
    queryFn: ({ pageParam = 1 }) => reelService.getFeed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? last.pagination.page + 1 : undefined,
    staleTime: 60 * 1000,
  });

  const reels = data?.pages.flatMap((p) => p.reels) ?? [];

  // ── IntersectionObserver: track active reel ───────────────────────────────
  useEffect(() => {
    const els = itemRefs.current.filter(Boolean);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(Number(entry.target.dataset.index));
          }
        });
      },
      { threshold: 0.6 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.length]);

  // ── Prefetch next page when near end ─────────────────────────────────────
  useEffect(() => {
    if (activeIndex >= reels.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [activeIndex, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const setItemRef = useCallback((el, i) => {
    itemRefs.current[i] = el;
  }, []);

  // ── Programmatic scroll ───────────────────────────────────────────────────
  const scrollTo = useCallback((idx) => {
    const el = itemRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Touch swipe: fast flick navigates prev/next ───────────────────────────
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dt = Date.now() - touchStartTime.current;
    // Flick: >40px displacement in <350ms
    if (Math.abs(dy) > 40 && dt < 350) {
      if (dy > 0 && activeIndex < reels.length - 1) scrollTo(activeIndex + 1);
      else if (dy < 0 && activeIndex > 0) scrollTo(activeIndex - 1);
    }
    touchStartY.current = null;
  }, [activeIndex, reels.length, scrollTo]);

  // ── Keyboard navigation (desktop) ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowDown' && activeIndex < reels.length - 1) scrollTo(activeIndex + 1);
      if (e.key === 'ArrowUp' && activeIndex > 0) scrollTo(activeIndex - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIndex, reels.length, scrollTo]);

  // ── Render states ─────────────────────────────────────────────────────────
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (reels.length === 0) return <EmptyState />;

  return (
    <div
      ref={containerRef}
      role="feed"
      aria-label="Reels feed"
      className="relative h-[calc(100vh-56px)] overflow-y-scroll snap-y snap-mandatory md:h-screen"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {reels.map((reel, i) => (
        <ReelItem
          key={reel._id}
          reel={reel}
          index={i}
          isActive={activeIndex === i}
          globalMuted={globalMuted}
          onMuteToggle={() => setGlobalMuted((v) => !v)}
          itemRef={(el) => setItemRef(el, i)}
        />
      ))}

      {/* Fetch-next-page indicator */}
      <AnimatePresence>
        {isFetchingNextPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-20 items-center justify-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-white/60" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reels;
