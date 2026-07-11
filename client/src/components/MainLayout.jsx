import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Sidebar, BottomNav, MobileTopBar } from '../components/Navigation';
import { RightSidebar } from '../components/RightSidebar';
import { CreatePostModal } from '../components/feed/CreatePostModal';

export const MainLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const location = useLocation();
  const isMessages = location.pathname.startsWith('/messages');

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
      <Sidebar onCreateClick={() => setShowCreate(true)} />
      <MobileTopBar onCreateClick={() => setShowCreate(true)} />

      {/* pt-14 on mobile to clear the top bar; md:pt-0 since desktop has no top bar */}
      <main className="flex-1 pb-16 md:ml-64 md:pb-0 pt-14 md:pt-0">
        {isMessages ? (
          <div className="h-full px-4 pt-4">
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

      <BottomNav onCreateClick={() => setShowCreate(true)} />

      <CreatePostModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
};

export default MainLayout;
