import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/api';
import { ProfileAvatar } from './ProfileAvatar';

export const UserListModal = ({ title, users, profileUsername, onClose }) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState(new Set());

  const followingSet = new Set(
    (currentUser?.following ?? []).map((id) => id?.toString?.() ?? id)
  );

  const toggle = async (u) => {
    const id = u._id;
    if (pendingIds.has(id)) return;
    setPendingIds((s) => new Set(s).add(id));
    try {
      const alreadyFollowing = followingSet.has(id.toString());
      if (alreadyFollowing) {
        await userService.unfollow(id);
      } else {
        await userService.follow(id);
      }
      queryClient.invalidateQueries({ queryKey: ['followers', profileUsername] });
      queryClient.invalidateQueries({ queryKey: ['following', profileUsername] });
      queryClient.invalidateQueries({ queryKey: ['profile', profileUsername] });
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    } catch {
      // silent
    } finally {
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="w-8" />
          <h2 className="font-semibold text-text">{title}</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        {/* List */}
        <ul className="max-h-[420px] overflow-y-auto">
          {!users ? (
            <li className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            </li>
          ) : users.length === 0 ? (
            <li className="py-8 text-center text-sm text-text-secondary">No users yet</li>
          ) : (
            users.map((u) => {
              const isSelf = currentUser?._id?.toString() === u._id?.toString();
              const isFollowing = followingSet.has(u._id?.toString());
              const isPending = pendingIds.has(u._id);

              return (
                <li
                  key={u._id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-background transition-colors"
                >
                  <Link
                    to={`/profile/${u.username}`}
                    onClick={onClose}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <ProfileAvatar user={u} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{u.username}</p>
                      {u.name && (
                        <p className="truncate text-xs text-text-secondary">{u.name}</p>
                      )}
                    </div>
                  </Link>

                  {!isSelf && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggle(u)}
                      disabled={isPending}
                      className={`flex-shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        isFollowing
                          ? 'border border-border bg-surface text-text hover:bg-border'
                          : 'bg-primary text-white hover:bg-secondary shadow-sm shadow-primary/20'
                      }`}
                    >
                      {isPending ? '…' : isFollowing ? 'Following' : 'Follow'}
                    </motion.button>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </motion.div>
    </div>
  );
};
