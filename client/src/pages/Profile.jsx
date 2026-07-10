import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Grid, Bookmark, Heart, MessageCircle, Loader2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { userService, messageService } from '../services/api';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { EditProfileModal } from '../components/EditProfileModal';
import { UserListModal } from '../components/UserListModal';

// ── Ripple helper ─────────────────────────────────────────────────────────────
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
    background:currentColor;opacity:0.15;transform:scale(0);
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

// ── Stat button ───────────────────────────────────────────────────────────────
const Stat = ({ count, label, onClick }) => (
  <motion.button
    whileHover={onClick ? { scale: 1.05 } : {}}
    whileTap={onClick ? { scale: 0.95 } : {}}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 text-sm ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
  >
    <motion.span
      key={count}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="font-semibold text-text"
    >
      {count ?? 0}
    </motion.span>
    <span className="text-text-secondary text-xs md:text-sm">{label}</span>
  </motion.button>
);

// ── Post grid tile ────────────────────────────────────────────────────────────
const PostTile = ({ post, index }) => {
  const media = post.media?.[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
      whileHover={{ scale: 1.03, zIndex: 1 }}
      className="group relative aspect-square cursor-pointer overflow-hidden bg-surface"
    >
      {media ? (
        media.mediaType === 'video' ? (
          <video src={media.url} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" muted />
        ) : (
          <img src={media.url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        )
      ) : (
        <div className="h-full w-full bg-border" />
      )}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 flex items-center justify-center gap-5 bg-black/45 text-white"
      >
        <span className="flex items-center gap-1.5 font-semibold drop-shadow">
          <Heart className="h-5 w-5 fill-white" />
          {post.likes?.length ?? 0}
        </span>
        <span className="flex items-center gap-1.5 font-semibold drop-shadow">
          <MessageCircle className="h-5 w-5 fill-white" />
          {post.commentsCount ?? 0}
        </span>
      </motion.div>
    </motion.div>
  );
};

// ── Grid skeleton ─────────────────────────────────────────────────────────────
const GridSkeleton = () => (
  <div className="grid grid-cols-3 gap-px pt-px">
    {[...Array(9)].map((_, i) => (
      <div key={i} className="aspect-square shimmer rounded-none" />
    ))}
  </div>
);

// ── Empty grid state ──────────────────────────────────────────────────────────
const EmptyGrid = ({ icon: Icon, heading, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
      className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border"
    >
      <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
    </motion.div>
    <motion.h2
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="text-xl font-bold text-text"
    >
      {heading}
    </motion.h2>
    {sub && (
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="mt-1 text-sm text-text-secondary"
      >
        {sub}
      </motion.p>
    )}
  </motion.div>
);

// ── Profile skeleton ──────────────────────────────────────────────────────────
const ProfileSkeleton = () => (
  <div className="mx-auto w-full max-w-[935px] px-0 md:px-4 pt-4 md:pt-8">
    {/* Cover */}
    <div className="mb-0 h-36 w-full shimmer rounded-none md:mb-6 md:h-48 md:rounded-2xl" />
    <header className="flex flex-col items-center gap-4 border-b border-border px-4 pb-6 pt-4 md:flex-row md:items-start md:gap-16 md:pt-0">
      <div className="h-24 w-24 md:h-36 md:w-36 flex-shrink-0 rounded-full shimmer -mt-12 md:-mt-16" />
      <div className="flex flex-1 flex-col items-center gap-4 md:items-start w-full">
        <div className="flex gap-3 items-center">
          <div className="h-6 w-32 shimmer rounded-lg" />
          <div className="h-8 w-24 shimmer rounded-xl" />
          <div className="h-8 w-8 shimmer rounded-xl" />
        </div>
        <div className="flex gap-8">
          <div className="h-4 w-10 shimmer rounded" />
          <div className="h-4 w-14 shimmer rounded" />
          <div className="h-4 w-14 shimmer rounded" />
        </div>
        <div className="space-y-2 w-full max-w-xs">
          <div className="h-3 w-24 shimmer rounded" />
          <div className="h-3 w-48 shimmer rounded" />
          <div className="h-3 w-36 shimmer rounded" />
        </div>
      </div>
    </header>
    <GridSkeleton />
  </div>
);

// ── Profile page ──────────────────────────────────────────────────────────────
export const Profile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('posts');
  const [modal, setModal] = useState(null);

  const isOwn = currentUser?.username === username;
  const navigate = useNavigate();

  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => userService.getProfile(username).then((d) => d.user),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['profile-posts', username],
    queryFn: () => userService.getUserPosts(username).then((d) => d.posts),
    enabled: !!profileUser,
  });

  const { data: savedPosts, isLoading: savedLoading } = useQuery({
    queryKey: ['saved-posts'],
    queryFn: () => userService.getSavedPosts().then((d) => d.posts),
    enabled: isOwn && tab === 'saved',
  });

  const { data: followers } = useQuery({
    queryKey: ['followers', username],
    queryFn: () => userService.getFollowers(username).then((d) => d.followers),
    enabled: modal === 'followers',
  });

  const { data: following } = useQuery({
    queryKey: ['following', username],
    queryFn: () => userService.getFollowing(username).then((d) => d.following),
    enabled: modal === 'following',
  });

  const messageMutation = useMutation({
    mutationFn: () => messageService.getOrCreate(profileUser._id),
    onSuccess: (data) => navigate(`/messages?c=${data.conversation._id}`),
  });

  const followMutation = useMutation({
    mutationFn: () =>
      profileUser.isFollowing
        ? userService.unfollow(profileUser._id)
        : userService.follow(profileUser._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', username] }),
  });

  if (profileLoading) return <ProfileSkeleton />;

  if (!profileUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-64 flex-col items-center justify-center gap-3"
      >
        <div className="text-5xl select-none">👤</div>
        <p className="text-xl font-semibold text-text">User not found</p>
        <Link to="/" className="text-sm text-primary hover:underline">Go home</Link>
      </motion.div>
    );
  }

  const gridPosts = tab === 'saved' ? (savedPosts ?? []) : (posts ?? []);
  const gridLoading = tab === 'saved' ? savedLoading : postsLoading;

  return (
    <div className="mx-auto w-full max-w-[935px] px-0 md:px-4 pt-4 md:pt-8">

      {/* Cover photo */}
      {profileUser.coverPhoto?.url && (
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-0 h-36 w-full overflow-hidden rounded-none md:mb-6 md:h-48 md:rounded-2xl group/cover relative"
        >
          <img
            src={profileUser.coverPhoto.url}
            alt="cover"
            className="h-full w-full object-cover transition-transform duration-500 group-hover/cover:scale-105"
          />
          {/* subtle gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover/cover:opacity-100" />
        </motion.div>
      )}

      {/* Profile header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex flex-col items-center gap-4 border-b border-border px-4 pb-6 pt-4 md:flex-row md:items-start md:gap-16 md:pt-0"
      >
        <div className={`flex-shrink-0 ${profileUser.coverPhoto?.url ? '-mt-12 md:-mt-16' : ''}`}>
          <div className="rounded-full ring-4 ring-card transition-shadow hover:ring-primary/20">
            <ProfileAvatar user={profileUser} size="lg" />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-3 md:items-start">

          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <h1 className="text-xl font-semibold text-text">{profileUser.username}</h1>

            {isOwn ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onPointerDown={spawnRipple}
                  onClick={() => setModal('edit')}
                  className="relative overflow-hidden rounded-xl border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-text transition-colors hover:bg-border hover:border-text-secondary/40 dark:hover:bg-surface/80"
                >
                  Edit profile
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 15 }}
                  whileTap={{ scale: 0.92 }}
                  onPointerDown={spawnRipple}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="relative overflow-hidden rounded-xl border border-border bg-surface p-1.5 text-text transition-colors hover:bg-border dark:hover:bg-surface/80"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onPointerDown={spawnRipple}
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className={`relative overflow-hidden rounded-xl px-6 py-1.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                    profileUser.isFollowing
                      ? 'border border-border bg-surface text-text hover:bg-border dark:hover:bg-surface/80'
                      : 'bg-primary text-white hover:bg-secondary shadow-sm shadow-primary/30 hover:shadow-primary/50'
                  }`}
                >
                  {followMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : profileUser.isFollowing ? 'Following' : 'Follow'
                  }
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onPointerDown={spawnRipple}
                  onClick={() => messageMutation.mutate()}
                  disabled={messageMutation.isPending}
                  className="relative overflow-hidden rounded-xl border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-text transition-colors hover:bg-border disabled:opacity-60 dark:hover:bg-surface/80"
                >
                  {messageMutation.isPending ? 'Opening…' : 'Message'}
                </motion.button>
                {messageMutation.isError && (
                  <p className="text-xs text-danger">Failed to open chat</p>
                )}
              </>
            )}
          </div>

          {/* Desktop stats */}
          <div className="hidden gap-8 md:flex">
            <Stat count={profileUser.postsCount} label="posts" />
            <Stat count={profileUser.followersCount} label="followers" onClick={() => setModal('followers')} />
            <Stat count={profileUser.followingCount} label="following" onClick={() => setModal('following')} />
          </div>

          {/* Bio */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-center text-sm md:text-left"
          >
            {profileUser.name && <p className="font-semibold text-text">{profileUser.name}</p>}
            {profileUser.location && (
              <p className="text-text-secondary text-xs mt-0.5">{profileUser.location}</p>
            )}
            {profileUser.bio && (
              <p className="mt-1 whitespace-pre-wrap leading-snug text-text">{profileUser.bio}</p>
            )}
            {profileUser.website && (
              <a
                href={profileUser.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block font-semibold text-primary hover:underline transition-colors hover:text-secondary"
              >
                {profileUser.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* Mobile stats */}
      <div className="flex justify-around border-b border-border py-3 md:hidden">
        <Stat count={profileUser.postsCount} label="posts" />
        <Stat count={profileUser.followersCount} label="followers" onClick={() => setModal('followers')} />
        <Stat count={profileUser.followingCount} label="following" onClick={() => setModal('following')} />
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-border">
        {[
          { key: 'posts', icon: Grid, label: 'Posts' },
          ...(isOwn ? [{ key: 'saved', icon: Bookmark, label: 'Saved' }] : []),
        ].map(({ key, icon: Icon, label }) => (
          <motion.button
            key={key}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-t-2 px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
              tab === key
                ? 'border-text text-text'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </motion.button>
        ))}
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {gridLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GridSkeleton />
          </motion.div>
        ) : gridPosts.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {tab === 'saved' ? (
              <EmptyGrid icon={Bookmark} heading="No saved posts" sub="Save posts to see them here." />
            ) : (
              <EmptyGrid
                icon={Grid}
                heading="No posts yet"
                sub={isOwn ? 'Share your first photo or video.' : 'Nothing here yet.'}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`grid-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-3 gap-px pb-10 pt-px"
          >
            {gridPosts.map((post, i) => (
              <PostTile key={post._id} post={post} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {modal === 'edit' && (
        <EditProfileModal user={profileUser} onClose={() => setModal(null)} />
      )}
      {modal === 'followers' && (
        <UserListModal
          title="Followers"
          users={followers}
          profileUsername={username}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'following' && (
        <UserListModal
          title="Following"
          users={following}
          profileUsername={username}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default Profile;
