import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Grid, Bookmark, Heart, MessageCircle, Loader2, Lock, UserCheck, UserX, Star, Users, X, Search, LogOut, Sun, Moon, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { userService, messageService } from '../services/api';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { EditProfileModal } from '../components/EditProfileModal';
import { UserListModal } from '../components/UserListModal';
import { PostModal } from '../components/post/PostModal';

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
const PostTile = ({ post, index, onClick }) => {
  const media = post.media?.[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
      whileHover={{ scale: 1.03, zIndex: 1 }}
      onClick={onClick}
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
  const { user: currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('posts');
  const [modal, setModal] = useState(null);
  const [activePostId, setActivePostId] = useState(null);

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

  // ── Follow requests (own profile only) ───────────────────────────────────
  const { data: followRequestsData } = useQuery({
    queryKey: ['followRequests'],
    queryFn: () => userService.getFollowRequests(),
    enabled: isOwn,
    staleTime: 30 * 1000,
  });
  const followRequests = followRequestsData?.followRequests ?? [];

  const acceptMutation = useMutation({
    mutationFn: (id) => userService.acceptFollowRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followRequests'] });
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => userService.rejectFollowRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followRequests'] }),
  });

  // ── Close friends (own profile only) ─────────────────────────────────────
  const { data: closeFriendsData } = useQuery({
    queryKey: ['closeFriends'],
    queryFn: () => userService.getCloseFriends(),
    enabled: isOwn && modal === 'closeFriends',
    staleTime: 30 * 1000,
  });
  const closeFriends = closeFriendsData?.closeFriends ?? [];

  const addCFMutation = useMutation({
    mutationFn: (id) => userService.addCloseFriend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['closeFriends'] }),
  });

  const removeCFMutation = useMutation({
    mutationFn: (id) => userService.removeCloseFriend(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['closeFriends'] }),
  });

  // ── Cancel follow request (unfollow endpoint also clears pending request) ─
  const cancelRequestMutation = useMutation({
    mutationFn: () => userService.unfollow(profileUser._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', username] }),
  });

  // ── Close friends search state ────────────────────────────────────────────
  const [cfSearch, setCfSearch] = useState('');

  // Followers list for adding to close friends (fetched when CF modal opens)
  const { data: followersForCF } = useQuery({
    queryKey: ['followers', username],
    queryFn: () => userService.getFollowers(username).then((d) => d.followers),
    enabled: isOwn && modal === 'closeFriends',
    staleTime: 60 * 1000,
  });

  const cfFollowers = useMemo(() => {
    const list = followersForCF ?? [];
    if (!cfSearch.trim()) return list;
    const q = cfSearch.toLowerCase();
    return list.filter(
      (u) => u.username.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)
    );
  }, [followersForCF, cfSearch]);

  const closeFriendIds = useMemo(
    () => new Set(closeFriends.map((cf) => cf._id)),
    [closeFriends]
  );

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

  // Private account: non-follower sees lock screen instead of grid
  const isLocked = !isOwn && profileUser.isPrivate && !profileUser.isFollowing;

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
            {profileUser.isPrivate && (
              <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-secondary">
                <Lock className="h-3 w-3" /> Private
              </span>
            )}

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
                  onClick={() => setModal('settings')}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="relative overflow-hidden rounded-xl border border-border bg-surface p-1.5 text-text transition-colors hover:bg-border dark:hover:bg-surface/80"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </motion.button>
                {/* Follow requests badge */}
                {followRequests.length > 0 && (
                  <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onPointerDown={spawnRipple}
                    onClick={() => setModal('followRequests')}
                    className="relative overflow-hidden flex items-center gap-1.5 rounded-xl border border-warning/40 bg-warning/10 px-3 py-1.5 text-sm font-semibold text-warning transition-colors hover:bg-warning/20"
                  >
                    <Users className="h-4 w-4" />
                    {followRequests.length} request{followRequests.length !== 1 ? 's' : ''}
                  </motion.button>
                )}
              </>
            ) : (
              <>
                {/* Follow / Requested / Following button */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onPointerDown={spawnRipple}
                  onClick={() => {
                    if (profileUser.hasRequested) {
                      cancelRequestMutation.mutate();
                    } else {
                      followMutation.mutate();
                    }
                  }}
                  disabled={followMutation.isPending || cancelRequestMutation.isPending}
                  className={`relative overflow-hidden rounded-xl px-6 py-1.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                    profileUser.isFollowing
                      ? 'border border-border bg-surface text-text hover:bg-border dark:hover:bg-surface/80'
                      : profileUser.hasRequested
                      ? 'border border-border bg-surface text-text-secondary hover:bg-border dark:hover:bg-surface/80'
                      : 'bg-primary text-white hover:bg-secondary shadow-sm shadow-primary/30 hover:shadow-primary/50'
                  }`}
                >
                  {(followMutation.isPending || cancelRequestMutation.isPending)
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : profileUser.isFollowing
                    ? 'Following'
                    : profileUser.hasRequested
                    ? 'Requested'
                    : 'Follow'
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

      {/* Tabs — hidden when locked */}
      {!isLocked && (
        <div className="flex justify-center border-b border-border">
          {[
            { key: 'posts', icon: Grid, label: 'Posts' },
            ...(isOwn ? [{ key: 'saved', icon: Bookmark, label: 'Saved' }] : []),
            ...(isOwn ? [{ key: 'closeFriends', icon: Star, label: 'Close Friends' }] : []),
          ].map(({ key, icon: Icon, label }) => (
            <motion.button
              key={key}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => key === 'closeFriends' ? setModal('closeFriends') : setTab(key)}
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
      )}

      {/* Private lock screen */}
      {isLocked ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center gap-4 py-20 text-center"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface"
          >
            <Lock className="h-7 w-7 text-text-secondary" strokeWidth={1.5} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-lg font-semibold text-text"
          >
            This account is private
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="text-sm text-text-secondary"
          >
            Follow this account to see their photos and videos.
          </motion.p>
        </motion.div>
      ) : (
        /* Grid */
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
                <PostTile key={post._id} post={post} index={i} onClick={() => setActivePostId(post._id)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Modals */}
      {activePostId && (
        <PostModal postId={activePostId} onClose={() => setActivePostId(null)} />
      )}

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

      {/* Follow Requests modal */}
      <AnimatePresence>
        {modal === 'followRequests' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-semibold text-text">Follow Requests</h2>
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                  {followRequests.length}
                </span>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {followRequests.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Users className="h-8 w-8 text-text-secondary" strokeWidth={1.5} />
                    <p className="text-sm text-text-secondary">No pending requests</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {followRequests.map((requester) => (
                      <li key={requester._id} className="flex items-center gap-3 px-4 py-3">
                        <Link to={`/profile/${requester.username}`} onClick={() => setModal(null)}>
                          <ProfileAvatar user={requester} size="xs" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/profile/${requester.username}`}
                            onClick={() => setModal(null)}
                            className="block truncate text-sm font-semibold text-text hover:text-primary transition-colors"
                          >
                            {requester.username}
                          </Link>
                          {requester.name && (
                            <p className="truncate text-xs text-text-secondary">{requester.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => acceptMutation.mutate(requester._id)}
                            disabled={acceptMutation.isPending}
                            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary transition-colors disabled:opacity-50"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Confirm
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => rejectMutation.mutate(requester._id)}
                            disabled={rejectMutation.isPending}
                            className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-border transition-colors disabled:opacity-50"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Delete
                          </motion.button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close Friends modal — full add/remove with follower search */}
      <AnimatePresence>
        {modal === 'closeFriends' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setModal(null); setCfSearch(''); }}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
              style={{ maxHeight: '80vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-3 flex-shrink-0">
                <Star className="h-4 w-4 text-success" />
                <h2 className="font-semibold text-text">Close Friends</h2>
                <span className="ml-auto text-xs text-text-secondary">{closeFriends.length} added</span>
                <button
                  onClick={() => { setModal(null); setCfSearch(''); }}
                  className="ml-2 rounded-full p-1 text-text-secondary hover:bg-background hover:text-text transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-2 flex-shrink-0">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                  <Search className="h-4 w-4 flex-shrink-0 text-text-secondary" />
                  <input
                    type="text"
                    value={cfSearch}
                    onChange={(e) => setCfSearch(e.target.value)}
                    placeholder="Search followers…"
                    className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-secondary/60"
                  />
                  {cfSearch && (
                    <button onClick={() => setCfSearch('')} className="text-text-secondary hover:text-text">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {/* Current close friends section */}
                {closeFriends.length > 0 && !cfSearch && (
                  <>
                    <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                      In your list
                    </p>
                    <ul>
                      {closeFriends.map((cf) => (
                        <li key={cf._id} className="flex items-center gap-3 px-4 py-2.5">
                          <ProfileAvatar user={cf} size="xs" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text">{cf.username}</p>
                            {cf.name && <p className="truncate text-xs text-text-secondary">{cf.name}</p>}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => removeCFMutation.mutate(cf._id)}
                            disabled={removeCFMutation.isPending}
                            className="flex-shrink-0 rounded-lg border border-border bg-surface px-3 py-1 text-xs font-semibold text-text hover:bg-border transition-colors disabled:opacity-50"
                          >
                            Remove
                          </motion.button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Followers to add */}
                {cfFollowers.length > 0 && (
                  <>
                    <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                      {cfSearch ? 'Results' : 'Your followers'}
                    </p>
                    <ul>
                      {cfFollowers.map((follower) => {
                        const isAdded = closeFriendIds.has(follower._id);
                        return (
                          <li key={follower._id} className="flex items-center gap-3 px-4 py-2.5">
                            <ProfileAvatar user={follower} size="xs" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-text">{follower.username}</p>
                              {follower.name && <p className="truncate text-xs text-text-secondary">{follower.name}</p>}
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                isAdded
                                  ? removeCFMutation.mutate(follower._id)
                                  : addCFMutation.mutate(follower._id)
                              }
                              disabled={addCFMutation.isPending || removeCFMutation.isPending}
                              className={`flex-shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                isAdded
                                  ? 'border border-border bg-surface text-text hover:bg-border'
                                  : 'bg-primary text-white hover:bg-secondary'
                              }`}
                            >
                              {isAdded ? 'Remove' : 'Add'}
                            </motion.button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {/* Empty states */}
                {cfFollowers.length === 0 && closeFriends.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Star className="h-8 w-8 text-text-secondary" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-text">No followers yet</p>
                    <p className="text-xs text-text-secondary px-6">Follow people and they'll appear here.</p>
                  </div>
                )}
                {cfSearch && cfFollowers.length === 0 && (
                  <div className="py-8 text-center text-sm text-text-secondary">No results for "{cfSearch}"</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <AnimatePresence>
        {modal === 'settings' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="w-full sm:max-w-xs overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-semibold text-text">Settings</h2>
                <button
                  onClick={() => setModal(null)}
                  className="rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="py-2">
                {/* Edit profile */}
                <button
                  onClick={() => setModal('edit')}
                  className="flex w-full items-center gap-3 px-5 py-3 text-sm text-text hover:bg-background transition-colors"
                >
                  <Settings className="h-4 w-4 text-text-secondary" />
                  Edit profile
                </button>

                {/* Privacy */}
                <button
                  onClick={() => setModal('edit')}
                  className="flex w-full items-center gap-3 px-5 py-3 text-sm text-text hover:bg-background transition-colors"
                >
                  {profileUser.isPrivate
                    ? <Lock className="h-4 w-4 text-text-secondary" />
                    : <Globe className="h-4 w-4 text-text-secondary" />
                  }
                  {profileUser.isPrivate ? 'Account is Private' : 'Account is Public'}
                  <span className="ml-auto text-xs text-text-secondary">Change</span>
                </button>

                {/* Close friends */}
                <button
                  onClick={() => setModal('closeFriends')}
                  className="flex w-full items-center gap-3 px-5 py-3 text-sm text-text hover:bg-background transition-colors"
                >
                  <Star className="h-4 w-4 text-success" />
                  Close Friends
                  <span className="ml-auto text-xs text-text-secondary">{closeFriends.length}</span>
                </button>

                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-3 px-5 py-3 text-sm text-text hover:bg-background transition-colors"
                >
                  {theme === 'dark'
                    ? <Sun className="h-4 w-4 text-text-secondary" />
                    : <Moon className="h-4 w-4 text-text-secondary" />
                  }
                  {theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                </button>

                <div className="my-1 border-t border-border" />

                {/* Log out */}
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 px-5 py-3 text-sm font-semibold text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
