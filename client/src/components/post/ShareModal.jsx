import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Send, Check, Copy, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { userService, messageService } from '../../services/api';
import { ProfileAvatar } from '../ProfileAvatar';

function spawnRipple(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const span = document.createElement('span');
  span.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;width:${size}px;height:${size}px;left:${x}px;top:${y}px;background:currentColor;opacity:0.15;transform:scale(0);animation:_ripple 0.55s cubic-bezier(.4,0,.2,1) forwards;`;
  if (!document.getElementById('_ripple_kf')) {
    const s = document.createElement('style');
    s.id = '_ripple_kf';
    s.textContent = '@keyframes _ripple{to{transform:scale(1);opacity:0}}';
    document.head.appendChild(s);
  }
  el.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
}

// ── External share platforms ──────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'copy',
    label: 'Copy Link',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    bg: 'bg-surface border border-border',
    color: 'text-text',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
    bg: 'bg-[#25D366]',
    color: 'text-white',
    href: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    bg: 'bg-[#2AABEE]',
    color: 'text-white',
    href: (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    bg: 'bg-black dark:bg-zinc-800',
    color: 'text-white',
    href: (url) => `https://x.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    bg: 'bg-[#1877F2]',
    color: 'text-white',
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'more',
    label: 'More',
    icon: <ChevronRight className="h-5 w-5" />,
    bg: 'bg-surface border border-border',
    color: 'text-text',
  },
];

// ── Recipient chip ────────────────────────────────────────────────────────────
const RecipientChip = ({ user, onRemove }) => (
  <motion.div
    layout
    initial={{ scale: 0.7, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.7, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
    className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 pl-1 pr-2 py-0.5"
  >
    <img
      src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=6366F1&color=fff&size=32`}
      alt={user.username}
      className="h-5 w-5 rounded-full object-cover"
      loading="lazy"
    />
    <span className="text-xs font-medium text-primary max-w-[80px] truncate">{user.username}</span>
    <button
      onClick={() => onRemove(user._id)}
      className="ml-0.5 rounded-full text-primary/60 hover:text-primary transition-colors"
      aria-label={`Remove ${user.username}`}
    >
      <X className="h-3 w-3" />
    </button>
  </motion.div>
);

// ── User row ──────────────────────────────────────────────────────────────────
const UserRow = ({ user, selected, onToggle }) => (
  <motion.button
    layout
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.15 }}
    onClick={() => onToggle(user)}
    onPointerDown={spawnRipple}
    className={`relative overflow-hidden flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
      selected ? 'bg-primary/8' : 'hover:bg-background'
    }`}
  >
    <div className="relative flex-shrink-0">
      <img
        src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=6366F1&color=fff&size=64`}
        alt={user.username}
        className="h-10 w-10 rounded-full object-cover"
        loading="lazy"
      />
      {user.isVerified && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[8px]">✓</span>
      )}
    </div>
    <div className="flex-1 min-w-0 text-left">
      <p className="text-sm font-semibold text-text truncate">{user.username}</p>
      {user.name && <p className="text-xs text-text-secondary truncate">{user.name}</p>}
    </div>
    <motion.div
      animate={selected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`h-5 w-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
        selected ? 'border-primary bg-primary' : 'border-border'
      }`}
    >
      {selected && <Check className="h-3 w-3 text-white" />}
    </motion.div>
  </motion.button>
);

// ── Post preview thumbnail ────────────────────────────────────────────────────
const PostPreview = ({ post }) => {
  const thumb = post?.media?.[0]?.url;
  const author = post?.author;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 mb-3">
      {thumb ? (
        <img src={thumb} alt="post" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" loading="lazy" />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-surface flex-shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text truncate">{author?.username}</p>
        {post?.caption && (
          <p className="text-xs text-text-secondary truncate mt-0.5">{post.caption}</p>
        )}
      </div>
    </div>
  );
};

// ── ShareModal ────────────────────────────────────────────────────────────────
export const ShareModal = ({ post, onClose }) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [selectedMap, setSelectedMap] = useState(new Map()); // id → user object
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const debounceRef = useRef(null);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);

  const postUrl = `${window.location.origin}/post/${post._id}`;

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!search.trim()) { setSearchQ(''); return; }
    debounceRef.current = setTimeout(() => setSearchQ(search.trim()), 320);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Lock body scroll + ESC
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  // Focus search on open
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  // Recent conversations → extract other participants
  const { data: convsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: messageService.getConversations,
    staleTime: 30_000,
  });

  const recentUsers = (convsData?.conversations ?? [])
    .slice(0, 12)
    .map((c) => c.participants.find((p) => p._id !== currentUser?._id && p._id?.toString() !== currentUser?._id))
    .filter(Boolean)
    .filter((u, i, arr) => arr.findIndex((x) => x._id === u._id) === i);

  // Search results
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['share-search', searchQ],
    queryFn: () => userService.search(searchQ),
    enabled: searchQ.length > 0,
    staleTime: 30_000,
  });

  const searchUsers = (searchData?.users ?? []).filter((u) => u._id !== currentUser?._id);

  const displayUsers = searchQ ? searchUsers : recentUsers;

  const toggleUser = useCallback((u) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.has(u._id) ? next.delete(u._id) : next.set(u._id, u);
      return next;
    });
  }, []);

  const removeUser = useCallback((id) => {
    setSelectedMap((prev) => { const next = new Map(prev); next.delete(id); return next; });
  }, []);

  // Build sharedPost payload from post prop
  const sharedPostPayload = {
    postId: post._id,
    thumbnail: post?.media?.[0]?.url ?? null,
    caption: post?.caption ?? null,
    authorUsername: post?.author?.username ?? null,
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const recipients = [...selectedMap.keys()];
      await Promise.all(
        recipients.map(async (recipientId) => {
          const conv = await messageService.getOrCreate(recipientId);
          return messageService.sendSharedPost(conv.conversation._id, sharedPostPayload);
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSent(true);
      setTimeout(onClose, 1100);
    },
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(postUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePlatform = async (platform) => {
    if (platform.id === 'copy') { handleCopy(); return; }
    if (platform.id === 'more') {
      if (navigator.share) {
        try { await navigator.share({ url: postUrl, title: 'Check this out on Pixora' }); } catch { /* cancelled */ }
      }
      return;
    }
    window.open(platform.href(postUrl), '_blank', 'noopener,noreferrer');
  };

  const selectedUsers = [...selectedMap.values()];

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <motion.div
        initial={{ y: 72, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 72, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl"
        style={{ background: 'var(--color-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-base font-bold text-text">Share</span>
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: 'var(--color-background)' }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="rounded-full p-1.5 text-text-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="max-h-[82vh] overflow-y-auto hide-scrollbar">
          {/* Post preview */}
          <div className="px-5 pt-4">
            <PostPreview post={post} />
          </div>

          {/* Search bar */}
          <div className="px-5 pb-3">
            <motion.div
              whileFocusWithin={{ boxShadow: '0 0 0 2px rgba(99,102,241,0.35)' }}
              className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-2.5 transition-all"
            >
              <Search className="h-4 w-4 flex-shrink-0 text-text-secondary" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people…"
                className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-secondary/55"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-text-secondary hover:text-text transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          </div>

          {/* Selected chips */}
          <AnimatePresence>
            {selectedUsers.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 px-5 pb-3">
                  <AnimatePresence mode="popLayout">
                    {selectedUsers.map((u) => (
                      <RecipientChip key={u._id} user={u} onRemove={removeUser} />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User list */}
          <div className="px-5 pb-2">
            {!searchQ && recentUsers.length > 0 && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Recent
              </p>
            )}

            {isFetching ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            ) : displayUsers.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <div className="space-y-0.5 max-h-52 overflow-y-auto hide-scrollbar">
                  {displayUsers.map((u) => (
                    <UserRow
                      key={u._id}
                      user={u}
                      selected={selectedMap.has(u._id)}
                      onToggle={toggleUser}
                    />
                  ))}
                </div>
              </AnimatePresence>
            ) : searchQ ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-4 text-center text-sm text-text-secondary"
              >
                No users found for "{searchQ}"
              </motion.p>
            ) : null}
          </div>

          {/* Send button */}
          <div className="px-5 pb-4">
            <AnimatePresence>
              {selectedUsers.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onPointerDown={spawnRipple}
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || sent}
                  className="relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <AnimatePresence mode="wait">
                    {sent ? (
                      <motion.span
                        key="sent"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" /> Sent!
                      </motion.span>
                    ) : sendMutation.isPending ? (
                      <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="send"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Send to {selectedUsers.length} {selectedUsers.length === 1 ? 'person' : 'people'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-border" />

          {/* External share platforms */}
          <div className="px-5 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Share via
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {PLATFORMS.map((p) => (
                <motion.button
                  key={p.id}
                  whileHover={{ scale: 1.06, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onPointerDown={spawnRipple}
                  onClick={() => handlePlatform(p)}
                  className={`relative overflow-hidden flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${p.bg} ${p.color}`}
                >
                  {p.id === 'copy' && copied ? (
                    <motion.span
                      initial={{ scale: 0.7 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Check className="h-5 w-5 text-success" />
                    </motion.span>
                  ) : (
                    p.icon
                  )}
                  <span className="text-[10px] font-medium leading-tight text-center">
                    {p.id === 'copy' && copied ? 'Copied!' : p.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ShareModal;
