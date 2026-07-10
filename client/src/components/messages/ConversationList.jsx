import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Video } from 'lucide-react';
import { ProfileAvatar } from '../ProfileAvatar';
import { timeAgo } from '../../utils/formatters';

function getOtherParticipant(conversation, currentUserId) {
  return conversation.participants.find(
    (p) => p._id !== currentUserId && p._id?.toString() !== currentUserId
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export const ConversationListSkeleton = ({ count = 6 }) => (
  <div className="flex flex-col gap-0 w-full">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05, duration: 0.25 }}
        className="flex items-center gap-3 px-4 py-3"
      >
        <div className="h-10 w-10 rounded-full shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 shimmer rounded" />
          <div className="h-2.5 w-40 shimmer rounded" />
        </div>
      </motion.div>
    ))}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
export const ConversationEmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center"
  >
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
      className="text-5xl select-none"
      aria-hidden
    >
      💬
    </motion.div>
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="font-semibold text-text"
    >
      No conversations yet
    </motion.p>
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24 }}
      className="text-sm text-text-secondary"
    >
      Start chatting with friends.
    </motion.p>
  </motion.div>
);

// ── Conversation item ─────────────────────────────────────────────────────────
export const ConversationItem = ({ conversation, currentUserId, isActive, onClick, index = 0 }) => {
  const other = getOtherParticipant(conversation, currentUserId);
  const lastMsg = conversation.lastMessage;

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 380, damping: 28 }}
      whileHover={{ backgroundColor: 'var(--color-background)', x: 2 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive ? 'bg-primary/5 border-r-2 border-primary' : ''
      }`}
    >
      {/* Avatar with online-style ring on active */}
      <div className={`relative flex-shrink-0 rounded-full transition-all ${
        isActive ? 'ring-2 ring-primary/40 ring-offset-1 ring-offset-card' : ''
      }`}>
        <ProfileAvatar user={other} size="sm" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold transition-colors ${
          isActive ? 'text-primary' : 'text-text'
        }`}>
          {other?.username}
        </p>
        {lastMsg && (
          <p className="truncate text-xs text-text-secondary flex items-center gap-1">
            {lastMsg.image?.url && !lastMsg.text && <><ImageIcon className="h-3 w-3 flex-shrink-0" /><span>Photo</span></>}
            {lastMsg.video?.url && !lastMsg.text && <><Video className="h-3 w-3 flex-shrink-0" /><span>Video</span></>}
            {lastMsg.text && <span className="truncate">{lastMsg.text}</span>}
            <span className="flex-shrink-0">· {timeAgo(lastMsg.createdAt)}</span>
          </p>
        )}
      </div>

      {/* Active indicator dot */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="h-2 w-2 flex-shrink-0 rounded-full bg-primary"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};
