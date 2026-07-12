import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import {
  Home, Search, Compass, MessageCircle, Bell,
  PlusSquare, User, LogOut, Sun, Moon, Film, ArrowLeft,
} from 'lucide-react';
import { SearchPanel } from './SearchPanel';
import { messageService, notificationService } from '../services/api';

// ── Ripple ────────────────────────────────────────────────────────────────────
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
    background:currentColor;opacity:0.12;transform:scale(0);
    animation:_ripple 0.55s cubic-bezier(.4,0,.2,1) forwards;
  `;
  if (!document.getElementById('_ripple_kf')) {
    const s = document.createElement('style');
    s.id = '_ripple_kf';
    s.textContent = '@keyframes _ripple{to{transform:scale(1);opacity:0}}';
    document.head.appendChild(s);
  }
  el.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
}

// ── Unread messages hook ──────────────────────────────────────────────────────
const useUnreadCount = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: messageService.getUnreadCount,
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!socket) return;
    const increment = () =>
      queryClient.setQueryData(['unreadCount'], (old) => ({ ...old, count: (old?.count ?? 0) + 1 }));
    const decrement = () =>
      queryClient.setQueryData(['unreadCount'], (old) => ({ ...old, count: Math.max(0, (old?.count ?? 0) - 1) }));
    socket.on('unreadCountChanged', increment);
    socket.on('messagesRead', decrement);
    return () => {
      socket.off('unreadCountChanged', increment);
      socket.off('messagesRead', decrement);
    };
  }, [socket, queryClient]);

  return data?.count ?? 0;
};

// ── Unread notifications hook ─────────────────────────────────────────────────
const useUnreadNotifCount = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifUnreadCount'],
    queryFn: notificationService.getUnreadCount,
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!socket) return;
    const handler = () =>
      queryClient.setQueryData(['notifUnreadCount'], (old) => ({ ...old, count: (old?.count ?? 0) + 1 }));
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, queryClient]);

  return data?.count ?? 0;
};

// ── Badge ─────────────────────────────────────────────────────────────────────
const Badge = ({ count }) => {
  if (!count) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.3, 0.9, 1], opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-[3px] text-[10px] font-bold leading-none text-white shadow-sm shadow-danger/40"
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
};

// ── Logo ──────────────────────────────────────────────────────────────────────
const PixoraLogo = () => (
  <Link to="/" className="flex items-center gap-2.5 px-2 py-1 group">
    <motion.div
      whileHover={{ scale: 1.08, rotate: -4 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-secondary to-accent shadow-lg shadow-primary/30"
    >
      <span className="font-logo text-sm text-white">P</span>
    </motion.div>
    <span className="font-logo text-xl gradient-text">Pixora</span>
  </Link>
);

// ── Desktop Nav item ──────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, to, active, badge, onClick }) => {
  const inner = (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.96 }}
      onPointerDown={spawnRipple}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`relative overflow-hidden flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition-colors duration-150 cursor-pointer select-none ${
        active
          ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
          : 'text-text font-normal hover:bg-background hover:text-primary'
      }`}
    >
      <span className="relative flex-shrink-0">
        <motion.span
          animate={active ? { scale: 1.1 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="inline-flex"
        >
          <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
        </motion.span>
        {badge}
      </span>
      <span className="text-sm">{label}</span>
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="nav-active-dot"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (onClick) return <button onClick={onClick} className="w-full text-left">{inner}</button>;
  return <Link to={to}>{inner}</Link>;
};

// ── Desktop Sidebar ───────────────────────────────────────────────────────────
export const Sidebar = ({ onCreateClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const panelRef = useRef(null);
  const unreadCount = useUnreadCount();
  const notifCount = useUnreadNotifCount();

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  useEffect(() => { setSearchOpen(false); }, [location.pathname]);

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navItems = [
    { name: 'Home',          path: '/',                          icon: Home },
    { name: 'Reels',         path: '/reels',                     icon: Film },
    { name: 'Explore',       path: '/explore',                   icon: Compass },
    { name: 'Messages',      path: '/messages',                  icon: MessageCircle },
    { name: 'Notifications', path: '/notifications',             icon: Bell },
    { name: 'Profile',       path: `/profile/${user?.username}`, icon: User },
  ];

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-surface dark:bg-surface md:flex">
        <div className="flex h-full flex-col px-3 py-6">
          <div className="mb-8 px-1">
            <PixoraLogo />
          </div>

          <nav className="flex flex-1 flex-col gap-0.5">
            <NavItem
              icon={Search}
              label="Search"
              active={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            />
            {navItems.map((item) => (
              <NavItem
                key={item.name}
                icon={item.icon}
                label={item.name}
                to={item.path}
                active={isActive(item.path)}
                badge={
                  item.name === 'Messages'
                    ? <Badge key={unreadCount} count={unreadCount} />
                    : item.name === 'Notifications'
                    ? <Badge key={notifCount} count={notifCount} />
                    : null
                }
              />
            ))}

            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.96 }}
              onPointerDown={spawnRipple}
              onClick={onCreateClick}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="relative overflow-hidden flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-sm font-normal text-text transition-colors hover:bg-background hover:text-primary"
            >
              <PlusSquare className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
              Create
            </motion.button>
          </nav>

          <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-4">
            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.96 }}
              onPointerDown={spawnRipple}
              onClick={toggleTheme}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="relative overflow-hidden flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-sm text-text transition-colors hover:bg-background hover:text-primary"
            >
              <motion.span
                key={theme}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="inline-flex"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </motion.span>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </motion.button>

            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.96 }}
              onPointerDown={spawnRipple}
              onClick={logout}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="relative overflow-hidden flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-sm text-text transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              Log out
            </motion.button>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed left-64 top-0 z-30 hidden h-screen w-80 flex-col border-r border-border bg-surface shadow-xl dark:bg-surface md:flex"
          >
            <SearchPanel onClose={() => setSearchOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Mobile Top App Bar ────────────────────────────────────────────────────────
export const MobileTopBar = ({ onCreateClick }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const unreadCount = useUnreadCount();
  const notifCount = useUnreadNotifCount();
  const isMessages = location.pathname.startsWith('/messages');

  return (
    <motion.header
      key={isMessages ? 'messages-bar' : 'default-bar'}
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface/90 backdrop-blur-md px-4 md:hidden"
    >
      {isMessages ? (
        /* ── Messages header variant ── */
        <>
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-background hover:text-text transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <span className="font-semibold text-text">Messages</span>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.88 }}
            onClick={toggleTheme}
            className="relative rounded-full p-2 text-text-secondary hover:bg-background hover:text-text transition-colors"
            aria-label="Toggle theme"
          >
            <motion.span
              key={theme}
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.22 }}
              className="inline-flex"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.span>
          </motion.button>
        </>
      ) : (
        /* ── Default header ── */
        <>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-secondary to-accent shadow-md shadow-primary/30">
              <span className="font-logo text-xs text-white">P</span>
            </div>
            <span className="font-logo text-lg gradient-text">Pixora</span>
          </Link>

          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              onClick={toggleTheme}
              className="relative rounded-full p-2 text-text-secondary hover:bg-background hover:text-text transition-colors"
            >
              <motion.span
                key={theme}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.22 }}
                className="inline-flex"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </motion.span>
            </motion.button>

            <Link to="/messages" className="relative rounded-full p-2 text-text-secondary hover:bg-background hover:text-text transition-colors">
              <motion.span whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} className="relative block">
                <MessageCircle className="h-5 w-5" strokeWidth={2} />
                <Badge count={unreadCount} />
              </motion.span>
            </Link>

            <Link to="/notifications" className="relative rounded-full p-2 text-text-secondary hover:bg-background hover:text-text transition-colors">
              <motion.span whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} className="relative block">
                <Bell className="h-5 w-5" strokeWidth={2} />
                <Badge count={notifCount} />
              </motion.span>
            </Link>
          </div>
        </>
      )}
    </motion.header>
  );
};

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────
// Home | Search(/explore) | Create(+) | Reels | Profile
export const BottomNav = ({ onCreateClick }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const leftItems = [
    { name: 'Home',   path: '/',        icon: Home },
    { name: 'Search', path: '/explore', icon: Search },
  ];

  const rightItems = [
    { name: 'Reels',   path: '/reels',                     icon: Film },
    { name: 'Profile', path: `/profile/${user?.username}`, icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border bg-surface/90 backdrop-blur-md dark:bg-surface/90 md:hidden">
      {leftItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link key={item.name} to={item.path} className="p-2">
            <motion.span
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              className="relative block"
            >
              <item.icon
                className={`h-6 w-6 transition-colors ${active ? 'text-primary' : 'text-text-secondary'}`}
                strokeWidth={active ? 2.5 : 2}
              />
            </motion.span>
          </Link>
        );
      })}

      {/* Create button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        onClick={onCreateClick}
        className="p-2"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30">
          <PlusSquare className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
      </motion.button>

      {rightItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link key={item.name} to={item.path} className="p-2">
            <motion.span
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              className="block"
            >
              <item.icon
                className={`h-6 w-6 transition-colors ${active ? 'text-primary' : 'text-text-secondary'}`}
                strokeWidth={active ? 2.5 : 2}
              />
            </motion.span>
          </Link>
        );
      })}
    </nav>
  );
};
