import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Heart, MessageCircle, UserPlus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { notificationService } from '../services/api';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { timeAgo } from '../utils/formatters';
import { EmptyState } from '../components/common/EmptyState';
import { NotificationSkeleton } from '../components/common/Skeletons';

const ICONS = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  follow_request: UserPlus,
  follow_accept: UserPlus,
  mention: MessageCircle,
};

const ICON_COLORS = {
  like: 'text-red-500',
  comment: 'text-primary',
  follow: 'text-success',
  follow_request: 'text-warning',
  follow_accept: 'text-success',
  mention: 'text-secondary',
};

export const Notifications = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, status, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
    staleTime: 30 * 1000,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[600px]">
        <div className="mb-5 h-7 w-36 shimmer rounded-lg" />
        <NotificationSkeleton count={6} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="py-16 text-center text-danger">
        Failed to load notifications: {error.message}
      </div>
    );
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="mx-auto max-w-[600px]">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-text">
          Notifications
          {unreadCount > 0 && (
            <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text transition-colors hover:bg-border disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Mark all read
          </motion.button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title="You're all caught up!"
          subtitle="We'll notify you when something happens."
        />
      ) : (
        <ul className="space-y-1">
          {notifications.map((n, i) => {
            const Icon = ICONS[n.type] ?? Bell;
            const iconColor = ICON_COLORS[n.type] ?? 'text-text-secondary';
            return (
              <motion.li
                key={n._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-surface ${
                  !n.isRead ? 'bg-primary/5 border border-primary/10' : 'border border-transparent'
                }`}
              >
                <Link to={`/profile/${n.sender?.username}`} className="flex-shrink-0">
                  <ProfileAvatar user={n.sender} size="xs" />
                </Link>
                <div className="min-w-0 flex-1 text-sm">
                  <Link
                    to={`/profile/${n.sender?.username}`}
                    className="font-semibold text-text hover:text-primary transition-colors"
                  >
                    {n.sender?.username}
                  </Link>{' '}
                  <span className="text-text-secondary">{n.message}</span>
                  <p className="mt-0.5 text-xs text-text-secondary">{timeAgo(n.createdAt)}</p>
                </div>
                <Icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
                {n.post?.media?.[0] && (
                  <img
                    src={n.post.media[0].url}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded-lg object-cover border border-border"
                  />
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
