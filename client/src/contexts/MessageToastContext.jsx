import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from './SocketContext';
import { ProfileAvatar } from '../components/ProfileAvatar';

const MessageToastContext = createContext(null);

// ── Single Toast ──────────────────────────────────────────────────────────────

const Toast = ({ toast, onDismiss }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    onDismiss(toast.id);
    navigate(`/messages?c=${toast.conversationId}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="flex w-80 cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xl shadow-black/10 dark:shadow-black/40"
      onClick={handleClick}
      role="button"
      aria-label={`Message from ${toast.senderUsername}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <ProfileAvatar user={toast.sender} size="xs" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="h-3 w-3 text-primary flex-shrink-0" />
          <p className="text-xs font-bold text-primary">New message</p>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-text truncate">{toast.senderUsername}</p>
        <p className="text-xs text-text-secondary truncate">{toast.preview}</p>
        <p className="mt-0.5 text-[10px] text-text-secondary/60">Just now</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="flex-shrink-0 rounded-full p-1 text-text-secondary hover:bg-background hover:text-text transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
};

// ── Provider ──────────────────────────────────────────────────────────────────

export const MessageToastProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [toasts, setToasts] = useState([]);
  // We read the current URL search params to know which conversation is open
  const activeConvRef = useRef(null);

  // Keep activeConvRef in sync without re-subscribing the socket listener
  // We use a custom event approach: MainLayout / MessagesPage sets a global ref
  // via the context so we can check it inside the socket handler.
  const setActiveConv = useCallback((convId) => {
    activeConvRef.current = convId;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auto-dismiss after 4.5 s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts]);

  // Socket listener
  useEffect(() => {
    if (!socket || !user) return;

    const handler = ({ conversationId, message }) => {
      // Don't show toast for own messages
      const senderId = message.sender?._id ?? message.sender;
      if (senderId === user._id || senderId?.toString() === user._id?.toString()) return;

      // Don't show toast if the conversation is already open
      if (activeConvRef.current === conversationId) return;

      const id = `${conversationId}-${message._id ?? Date.now()}`;
      const senderUsername = message.sender?.username ?? 'Someone';
      const preview = message.text?.length > 60
        ? message.text.slice(0, 60) + '…'
        : message.text ?? '';

      setToasts((prev) => {
        // Deduplicate: replace existing toast for same conversation
        const filtered = prev.filter((t) => t.conversationId !== conversationId);
        // Cap at 4 stacked toasts
        return [...filtered, {
          id,
          conversationId,
          senderUsername,
          sender: message.sender,
          preview,
        }].slice(-4);
      });

      // Browser notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const n = new Notification(senderUsername, {
          body: preview,
          icon: message.sender?.profilePicture?.url ?? '/favicon.svg',
          tag: conversationId, // replaces previous notification for same conv
        });
        n.onclick = () => {
          window.focus();
          window.location.href = `/messages?c=${conversationId}`;
        };
      }
    };

    socket.on('newMessage', handler);
    return () => socket.off('newMessage', handler);
  }, [socket, user]);

  // Request browser notification permission once when user is logged in
  useEffect(() => {
    if (!user) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // Delay slightly so it doesn't fire immediately on login
      const t = setTimeout(() => Notification.requestPermission(), 3000);
      return () => clearTimeout(t);
    }
  }, [user]);

  return (
    <MessageToastContext.Provider value={{ setActiveConv }}>
      {children}

      {/* Toast stack — bottom-right on desktop, bottom-center on mobile */}
      <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 md:bottom-6 md:right-6">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </MessageToastContext.Provider>
  );
};

export const useMessageToast = () => useContext(MessageToastContext);
