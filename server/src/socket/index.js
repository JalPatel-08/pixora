import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const initializeSocket = (httpServer) => {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL]
    : ['http://localhost:5173', 'http://localhost:5174', process.env.CLIENT_URL].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  const onlineUsers = new Map(); // userId -> Set of socketIds

  const broadcastOnline = () =>
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));

  io.on('connection', async (socket) => {
    const userId = socket.userId;

    socket.join(userId);

    // Track presence — a user may have multiple tabs open
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    broadcastOnline();

    // Clear lastSeen while online
    await User.findByIdAndUpdate(userId, { lastSeen: null }).catch(() => {});

    // ── Typing indicators ────────────────────────────────────────────────────
    socket.on('typing', ({ recipientId }) =>
      io.to(recipientId).emit('typing', { userId })
    );
    socket.on('stopTyping', ({ recipientId }) =>
      io.to(recipientId).emit('stopTyping', { userId })
    );

    // ── Conversation rooms ───────────────────────────────────────────────────
    socket.on('joinConversation', ({ conversationId }) =>
      socket.join(`conv:${conversationId}`)
    );
    socket.on('leaveConversation', ({ conversationId }) =>
      socket.leave(`conv:${conversationId}`)
    );

    socket.on('typingInConversation', ({ conversationId }) =>
      socket.to(`conv:${conversationId}`).emit('typingInConversation', { userId, conversationId })
    );
    socket.on('stopTypingInConversation', ({ conversationId }) =>
      socket.to(`conv:${conversationId}`).emit('stopTypingInConversation', { userId, conversationId })
    );

    // ── Read receipts ────────────────────────────────────────────────────────
    // Client emits this after getMessages marks messages read on the server.
    // Relay back to this socket (badge decrement) and to other tabs.
    socket.on('messagesRead', ({ conversationId, readAt }) => {
      socket.to(userId).emit('messagesRead', { conversationId, readAt });
      socket.emit('messagesRead', { conversationId, readAt });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          broadcastOnline();
          // Persist lastSeen so "last seen X ago" works after refresh
          await User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
        }
      }
    });
  });

  return io;
};
