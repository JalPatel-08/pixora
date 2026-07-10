import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, ArrowLeft, Paperclip, Smile, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../contexts/SocketContext';
import { useMessageToast } from '../contexts/MessageToastContext';
import { messageService } from '../services/api';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { MessageBubble, TypingIndicator } from '../components/messages/MessageBubble';
import {
  ConversationItem,
  ConversationListSkeleton,
  ConversationEmptyState,
} from '../components/messages/ConversationList';

function getOtherParticipant(conversation, currentUserId) {
  return conversation.participants.find(
    (p) => p._id !== currentUserId && p._id?.toString() !== currentUserId
  );
}

// ── Messages skeleton (chat area) ────────────────────────────────────────────
const MessageAreaSkeleton = () => (
  <div className="flex flex-col gap-3 px-4 py-4 w-full">
    {[52, 72, 40, 64, 48, 80, 44, 60].map((w, i) => {
      const isOwn = i % 3 === 0;
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: isOwn ? 12 : -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.22 }}
          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className="h-9 shimmer rounded-2xl"
            style={{ width: `${w}%`, maxWidth: '72%' }}
          />
        </motion.div>
      );
    })}
  </div>
);

// ── No-conversation selected state ────────────────────────────────────────────
const NoChatSelected = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className="flex h-full flex-col items-center justify-center gap-3 text-center bg-background"
  >
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 20 }}
      className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border"
    >
      <MessageCircle className="h-9 w-9 text-primary" strokeWidth={1.5} />
    </motion.div>
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="text-lg font-semibold text-text"
    >
      Your messages
    </motion.p>
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24 }}
      className="text-sm text-text-secondary"
    >
      Select a conversation to start chatting.
    </motion.p>
  </motion.div>
);

// ── Empty chat state ──────────────────────────────────────────────────────────
const EmptyChat = ({ other }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="flex h-full flex-col items-center justify-center gap-3 text-center"
  >
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.08, type: 'spring', stiffness: 320, damping: 22 }}
    >
      <ProfileAvatar user={other} size="md" />
    </motion.div>
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      className="font-semibold text-text"
    >
      {other?.username}
    </motion.p>
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="text-sm text-text-secondary"
    >
      No messages yet. Say hello! 👋
    </motion.p>
  </motion.div>
);

// ── Group messages by sender for bubble corner rounding ───────────────────────
function groupMessages(messages, currentUserId) {
  return messages.map((msg, i) => {
    const isOwn = msg.sender._id === currentUserId || msg.sender._id?.toString() === currentUserId;
    const prevSame = i > 0 && (
      messages[i - 1].sender._id === msg.sender._id ||
      messages[i - 1].sender._id?.toString() === msg.sender._id?.toString()
    );
    const nextSame = i < messages.length - 1 && (
      messages[i + 1].sender._id === msg.sender._id ||
      messages[i + 1].sender._id?.toString() === msg.sender._id?.toString()
    );
    return { msg, isOwn, isFirst: !prevSame, isLast: !nextSame };
  });
}

// ── Built-in emoji picker (no external dependency) ──────────────────────────
const EMOJI_ROWS = [
  ['😀','😂','🥲','😍','🥰','😘','😎','🤩','🥳','😏'],
  ['😢','😭','😤','😡','🤬','😱','😨','😰','🤯','😳'],
  ['🙏','👍','👎','👏','🤝','✌️','🤞','💪','🫶','❤️'],
  ['🔥','✨','💯','🎉','🎊','🎁','🏆','⭐','💫','🌈'],
  ['😴','🤔','🤭','🤫','🤥','😬','🙄','😮','🤐','😷'],
  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯'],
  ['🍕','🍔','🌮','🍜','🍣','🍩','🍪','🎂','🍫','☕'],
  ['⚽','🏀','🎮','🎵','🎬','📸','💻','📱','🚀','🌍'],
];

const BuiltinEmojiPicker = ({ onEmojiClick }) => (
  <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden" style={{ width: 300 }}>
    <div className="max-h-64 overflow-y-auto p-2">
      {EMOJI_ROWS.map((row, ri) => (
        <div key={ri} className="flex">
          {row.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onEmojiClick({ emoji })}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-background transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ── Media preview bar ─────────────────────────────────────────────────────────
const MediaPreview = ({ file, preview, uploadProgress, onRemove }) => {
  const isVideo = file.type.startsWith('video/');
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="relative mx-4 mb-2 overflow-hidden rounded-xl border border-border bg-background"
    >
      <div className="relative flex items-center gap-3 p-2">
        {isVideo ? (
          <video src={preview} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" muted playsInline />
        ) : (
          <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text truncate">{file.name}</p>
          <p className="text-[10px] text-text-secondary">
            {isVideo ? 'Video' : 'Image'} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-1.5 h-1 w-full rounded-full bg-border overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 rounded-full p-1 text-text-secondary hover:bg-border hover:text-text transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

// ── ChatWindow ────────────────────────────────────────────────────────────────
const ChatWindow = ({ conversation, currentUserId, onBack }) => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [sendAnim, setSendAnim] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);      // File object
  const [mediaPreview, setMediaPreview] = useState(null); // object URL
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const convId = conversation._id;
  const other = getOtherParticipant(conversation, currentUserId);

  const { data, isLoading } = useQuery({
    queryKey: ['messages', convId],
    queryFn: () => messageService.getMessages(convId),
    staleTime: 0,
  });

  const sendMutation = useMutation({
    mutationFn: ({ text: t, file }) => {
      if (file) {
        const fd = new FormData();
        if (t) fd.append('text', t);
        fd.append('media', file);
        return messageService.sendMediaMessage(convId, fd, (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      return messageService.sendMessage(convId, t);
    },
    onSuccess: (res) => {
      queryClient.setQueryData(['messages', convId], (old) => ({
        ...old,
        messages: [...(old?.messages ?? []), res.message],
      }));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setUploadProgress(0);
    },
    onError: () => setUploadProgress(0),
  });

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  useEffect(() => {
    if (!socket || !data) return;
    socket.emit('messagesRead', { conversationId: convId });
  }, [socket, convId, data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages, otherTyping]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('joinConversation', { conversationId: convId });
    return () => socket.emit('leaveConversation', { conversationId: convId });
  }, [socket, convId]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, message }) => {
      if (conversationId !== convId) return;
      queryClient.setQueryData(['messages', convId], (old) => ({
        ...old,
        messages: [...(old?.messages ?? []), message],
      }));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };
    socket.on('newMessage', handler);
    return () => socket.off('newMessage', handler);
  }, [socket, convId, queryClient]);

  useEffect(() => {
    if (!socket) return;
    const onTyping = ({ conversationId }) => {
      if (conversationId === convId) setOtherTyping(true);
    };
    const onStop = ({ conversationId }) => {
      if (conversationId === convId) setOtherTyping(false);
    };
    socket.on('typingInConversation', onTyping);
    socket.on('stopTypingInConversation', onStop);
    return () => {
      socket.off('typingInConversation', onTyping);
      socket.off('stopTypingInConversation', onStop);
    };
  }, [socket, convId]);

  // Revoke object URL on unmount / file change
  useEffect(() => {
    return () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); };
  }, [mediaPreview]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!socket) return;
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typingInConversation', { conversationId: convId });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stopTypingInConversation', { conversationId: convId });
    }, 1500);
  };

  const handleEmojiClick = (emojiData) => {
    const input = inputRef.current;
    if (!input) { setText((t) => t + emojiData.emoji); return; }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emojiData.emoji + text.slice(end);
    setText(next);
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + emojiData.emoji.length;
      input.setSelectionRange(pos, pos);
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setUploadProgress(0);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const hasText = text.trim();
    if (!hasText && !mediaFile) return;
    if (sendMutation.isPending) return;
    const t = hasText;
    const file = mediaFile;
    setText('');
    removeMedia();
    clearTimeout(typingTimerRef.current);
    setIsTyping(false);
    socket?.emit('stopTypingInConversation', { conversationId: convId });
    setSendAnim(true);
    setTimeout(() => setSendAnim(false), 400);
    sendMutation.mutate({ text: t, file });
  };

  const isUploading = sendMutation.isPending && !!mediaFile;
  const canSend = (text.trim() || mediaFile) && !sendMutation.isPending;

  const messages = data?.messages ?? [];
  const grouped = groupMessages(messages, currentUserId);

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card"
      >
        <motion.button
          whileHover={{ scale: 1.08, backgroundColor: 'var(--color-background)' }}
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          className="mr-1 rounded-full p-1.5 text-text-secondary transition-colors md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </motion.button>

        <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
          <ProfileAvatar user={other} size="xs" />
        </motion.div>

        <div>
          <p className="text-sm font-semibold text-text">{other?.username}</p>
          <AnimatePresence mode="wait">
            {otherTyping ? (
              <motion.p
                key="typing"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-xs text-primary italic"
              >
                typing…
              </motion.p>
            ) : (
              <motion.span key="empty" className="block h-4" />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
        {isLoading ? (
          <MessageAreaSkeleton />
        ) : messages.length === 0 ? (
          <EmptyChat other={other} />
        ) : (
          <div className="space-y-1">
            {grouped.map(({ msg, isOwn, isFirst, isLast }) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                isOwn={isOwn}
                isFirst={isFirst}
                isLast={isLast}
              />
            ))}

            <AnimatePresence>
              {otherTyping && <TypingIndicator key="typing-indicator" />}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Media preview */}
      <AnimatePresence>
        {mediaFile && (
          <MediaPreview
            file={mediaFile}
            preview={mediaPreview}
            uploadProgress={uploadProgress}
            onRemove={removeMedia}
          />
        )}
      </AnimatePresence>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-20 left-4 z-50"
          >
            <BuiltinEmojiPicker onEmojiClick={handleEmojiClick} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Input bar */}
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        onSubmit={handleSend}
        className="relative flex items-center gap-2 border-t border-border px-4 py-3 bg-card"
      >
        {/* Attachment button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 rounded-full p-2 text-text-secondary hover:bg-background hover:text-primary transition-colors"
          title="Attach image or video"
        >
          <Paperclip className="h-5 w-5" />
        </motion.button>

        {/* Emoji button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => setShowEmoji((v) => !v)}
          className={`flex-shrink-0 rounded-full p-2 transition-colors ${
            showEmoji ? 'text-primary bg-primary/10' : 'text-text-secondary hover:bg-background hover:text-primary'
          }`}
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </motion.button>

        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder={mediaFile ? 'Add a caption…' : 'Message…'}
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-text outline-none transition-all placeholder:text-text-secondary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          maxLength={2000}
        />

        {/* Send button */}
        <motion.button
          type="submit"
          disabled={!canSend}
          animate={sendAnim ? { scale: [1, 1.3, 0.88, 1.05, 1], rotate: [0, -12, 8, 0] } : { scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.38, ease: 'easeOut' }}
          className="flex-shrink-0 rounded-full bg-primary p-2 text-white hover:bg-secondary transition-colors disabled:opacity-40 shadow-sm shadow-primary/30"
        >
          {isUploading ? (
            <motion.div
              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </motion.button>
      </motion.form>
    </div>
  );
};

// ── MessagesPage ──────────────────────────────────────────────────────────────
export const MessagesPage = () => {
  const { user } = useAuth();
  const { setActiveConv } = useMessageToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConvId, setActiveConvId] = useState(searchParams.get('c') || null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setActiveConv(activeConvId);
    return () => setActiveConv(null);
  }, [activeConvId, setActiveConv]);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: messageService.getConversations,
    staleTime: 30 * 1000,
  });

  const conversations = data?.conversations ?? [];
  const activeConv = conversations.find((c) => c._id === activeConvId) ?? null;

  useEffect(() => {
    if (activeConvId && !isLoading && !activeConv) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [activeConvId, activeConv, isLoading, queryClient]);

  const selectConversation = useCallback((conv) => {
    setActiveConvId(conv._id);
    setSearchParams({ c: conv._id });
  }, [setSearchParams]);

  const clearConversation = useCallback(() => {
    setActiveConvId(null);
    setSearchParams({});
  }, [setSearchParams]);

  const showChat = !!activeConvId;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:h-[calc(100vh-2rem)]">

      {/* Conversation list panel */}
      <div className={`flex w-full flex-col border-r border-border md:w-80 md:flex-shrink-0 ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="border-b border-border px-5 py-4"
        >
          <h1 className="text-lg font-bold text-text">Messages</h1>
        </motion.div>

        {isLoading ? (
          <ConversationListSkeleton count={6} />
        ) : conversations.length === 0 ? (
          <ConversationEmptyState />
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {conversations.map((conv, i) => (
              <li key={conv._id}>
                <ConversationItem
                  conversation={conv}
                  currentUserId={user?._id}
                  isActive={conv._id === activeConvId}
                  onClick={() => selectConversation(conv)}
                  index={i}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chat window panel */}
      <div className={`flex-1 ${showChat ? 'flex' : 'hidden md:flex'} flex-col`}>
        <AnimatePresence mode="wait">
          {activeConv ? (
            <motion.div
              key={activeConv._id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex flex-1 flex-col h-full"
            >
              <ChatWindow
                conversation={activeConv}
                currentUserId={user?._id}
                onBack={clearConversation}
              />
            </motion.div>
          ) : (
            <motion.div
              key="no-chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col h-full"
            >
              <NoChatSelected />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MessagesPage;
