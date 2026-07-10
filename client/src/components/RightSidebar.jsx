import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/api';
import { ProfileAvatar } from './ProfileAvatar';
import { SuggestionsSkeleton } from './common/Skeletons';

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
    background:currentColor;opacity:0.14;transform:scale(0);
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

export const RightSidebar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['suggestions'],
    queryFn: userService.getSuggestions,
    staleTime: 2 * 60 * 1000,
  });

  const followMutation = useMutation({
    mutationFn: (id) => userService.follow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suggestions'] }),
  });

  const suggestions = data?.users || [];

  return (
    <div className="text-sm">
      {/* Current user */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-5 flex items-center gap-3"
      >
        <Link to={`/profile/${user?.username}`} className="flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="rounded-full ring-2 ring-primary/20 transition-all hover:ring-primary/50"
          >
            <ProfileAvatar user={user} size="sm" />
          </motion.div>
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/profile/${user?.username}`}
            className="block truncate font-semibold text-text hover:text-primary transition-colors"
          >
            {user?.username}
          </Link>
          <p className="truncate text-xs text-text-secondary">{user?.name}</p>
        </div>
      </motion.div>

      {/* Suggestions */}
      {isLoading ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="h-2.5 w-28 shimmer rounded" />
            <div className="h-2.5 w-10 shimmer rounded" />
          </div>
          <SuggestionsSkeleton count={5} />
        </>
      ) : suggestions.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-3 flex items-center justify-between"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Suggested for you
            </span>
            <Link
              to="/explore"
              className="text-xs font-semibold text-text hover:text-primary transition-colors"
            >
              See all
            </Link>
          </motion.div>

          <ul className="space-y-2">
            {suggestions.slice(0, 5).map((s, i) => (
              <motion.li
                key={s._id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 360, damping: 26 }}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Link to={`/profile/${s.username}`} className="flex-shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <ProfileAvatar user={s} size="xs" />
                    </motion.div>
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={`/profile/${s.username}`}
                      className="block truncate text-xs font-semibold text-text hover:text-primary transition-colors"
                    >
                      {s.username}
                    </Link>
                    <p className="truncate text-[11px] text-text-secondary">{s.name}</p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  onPointerDown={spawnRipple}
                  onClick={() => followMutation.mutate(s._id)}
                  disabled={followMutation.isPending}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="relative overflow-hidden flex-shrink-0 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
                >
                  Follow
                </motion.button>
              </motion.li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 text-[11px] text-text-secondary/50">
        © 2025 Pixora · Where Moments Become Stories.
      </p>
    </div>
  );
};
