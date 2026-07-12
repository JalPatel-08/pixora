import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Film, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Sidebar, BottomNav, MobileTopBar } from '../components/Navigation';
import { RightSidebar } from '../components/RightSidebar';
import { CreatePostModal } from '../components/feed/CreatePostModal';
import { CreateReelModal } from '../components/reels/CreateReelModal';

// ── Create type picker ────────────────────────────────────────────────────────
const CreateMenu = ({ onPost, onReel, onClose }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="w-full sm:max-w-xs overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold text-text">Create</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="py-2">
          <button
            onClick={onPost}
            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-background transition-colors"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ImagePlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">Post</p>
              <p className="text-xs text-text-secondary">Share photos or videos</p>
            </div>
          </button>
          <button
            onClick={onReel}
            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-background transition-colors"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Film className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">Reel</p>
              <p className="text-xs text-text-secondary">Share a short video</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

export const MainLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  // null | 'menu' | 'post' | 'reel'
  const [createType, setCreateType] = useState(null);
  const location = useLocation();
  const isMessages = location.pathname.startsWith('/messages');
  const isReels = location.pathname.startsWith('/reels');

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/40">
            <span className="font-logo text-3xl text-white">P</span>
          </div>
          <p className="font-logo text-2xl gradient-text">Pixora</p>
          <div className="h-0.5 w-28 overflow-hidden rounded-full bg-border">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onCreateClick={() => setCreateType('menu')} />
      <MobileTopBar onCreateClick={() => setCreateType('menu')} />

      {/* pt-14 on mobile to clear the top bar; md:pt-0 since desktop has no top bar */}
      <main className="flex-1 pb-16 md:ml-64 md:pb-0 pt-14 md:pt-0">
        {isMessages || isReels ? (
          <div className={isMessages ? 'h-full' : 'h-full'}>
            <Outlet />
          </div>
        ) : (
          <div className="mx-auto max-w-[935px] px-4 pt-8 xl:flex xl:gap-8">
            <div className="min-w-0 flex-1">
              <Outlet />
            </div>
            <div className="hidden xl:block xl:w-[320px] xl:flex-shrink-0">
              <div className="sticky top-8">
                <RightSidebar />
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav onCreateClick={() => setCreateType('menu')} />

      {createType === 'menu' && (
        <CreateMenu
          onPost={() => setCreateType('post')}
          onReel={() => setCreateType('reel')}
          onClose={() => setCreateType(null)}
        />
      )}

      <CreatePostModal
        isOpen={createType === 'post'}
        onClose={() => setCreateType(null)}
      />

      <CreateReelModal
        isOpen={createType === 'reel'}
        onClose={() => setCreateType(null)}
      />
    </div>
  );
};

export default MainLayout;
