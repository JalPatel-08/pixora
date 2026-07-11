import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { userService } from '../services/api';
import { ExploreSkeleton } from '../components/common/Skeletons';
import { PostModal } from '../components/post/PostModal';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { SearchSkeleton } from '../components/common/Skeletons';

// ── Inline search bar (mobile — desktop uses sidebar SearchPanel) ──────────────
const ExploreSearch = () => {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!input.trim()) { setQuery(''); return; }
    debounceRef.current = setTimeout(() => setQuery(input.trim()), 380);
    return () => clearTimeout(debounceRef.current);
  }, [input]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => userService.search(query),
    enabled: query.length > 0,
    staleTime: 30 * 1000,
    retry: false,
  });

  const users = data?.users ?? [];
  const showDropdown = focused && (query.length > 0 || input.length > 0);

  const clear = () => { setInput(''); setQuery(''); inputRef.current?.focus(); };

  return (
    <div className="relative mb-4 md:hidden">
      <div className={`flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 transition-all ${focused ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
        <Search className="h-4 w-4 flex-shrink-0 text-text-secondary" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search users…"
          className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-secondary/60"
        />
        <AnimatePresence>
          {input && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onMouseDown={(e) => { e.preventDefault(); clear(); }}
            >
              <X className="h-4 w-4 text-text-secondary hover:text-text" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            {isFetching && <SearchSkeleton count={3} />}
            {!isFetching && users.length === 0 && query && (
              <p className="px-4 py-5 text-center text-sm text-text-secondary">No users found for "{query}"</p>
            )}
            {!isFetching && users.length > 0 && (
              <ul>
                {users.map((u) => (
                  <li key={u._id}>
                    <Link
                      to={`/profile/${u.username}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-background transition-colors"
                    >
                      <ProfileAvatar user={u} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">{u.username}</p>
                        {u.name && <p className="truncate text-xs text-text-secondary">{u.name}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Post tile ─────────────────────────────────────────────────────────────────
const ExploreTile = ({ post, index, onClick }) => (
  <motion.div
    onClick={onClick}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    whileHover={{ scale: 1.02, zIndex: 1 }}
    transition={{ delay: (index % 12) * 0.03, scale: { duration: 0.2 } }}
    className="group relative aspect-square w-full cursor-pointer overflow-hidden bg-surface"
  >
    {post.media?.length > 0 ? (
      post.media[0].mediaType === 'video' ? (
        <video src={post.media[0].url} className="h-full w-full object-cover" muted />
      ) : (
        <img src={post.media[0].url} alt="" className="h-full w-full object-cover" loading="lazy" />
      )
    ) : (
      <div className="h-full w-full bg-border" />
    )}
    <div className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/40 text-white group-hover:flex">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Heart className="h-5 w-5 fill-white" />
        {post.likesCount ?? post.likes?.length ?? 0}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <MessageCircle className="h-5 w-5 fill-white" />
        {post.commentsCount ?? 0}
      </span>
    </div>
  </motion.div>
);

// ── Explore page ──────────────────────────────────────────────────────────────
export const Explore = () => {
  const { ref, inView } = useInView();
  const [activePostId, setActivePostId] = useState(null);

  const fetchExplore = async ({ pageParam = 1 }) => {
    const res = await api.get(`/posts/explore?page=${pageParam}&limit=12`);
    return res.data;
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, error } = useInfiniteQuery({
    queryKey: ['explore'],
    queryFn: fetchExplore,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage, fetchNextPage]);

  if (status === 'pending') {
    return (
      <div className="mx-auto w-full max-w-[935px] px-4 pt-8 pb-10">
        <div className="mb-4 h-10 w-full animate-pulse rounded-xl bg-surface md:hidden" />
        <ExploreSkeleton count={12} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="font-medium text-danger">Failed to load explore</p>
        <p className="text-sm text-text-secondary">{error.message}</p>
      </div>
    );
  }

  const posts = data.pages.flatMap((page) => page.posts);

  return (
    <div className="mx-auto w-full max-w-[935px] px-4 pt-8">
      {/* Search bar — visible on mobile only; desktop uses sidebar SearchPanel */}
      <ExploreSearch />

      <div className="grid grid-cols-3 gap-px pb-10">
        {posts.map((post, i) => (
          <ExploreTile
            key={post._id ?? post.id}
            post={post}
            index={i}
            onClick={() => setActivePostId(post._id ?? post.id)}
          />
        ))}
      </div>

      <div ref={ref} className="flex h-10 w-full items-center justify-center mb-8">
        {isFetchingNextPage && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
        )}
      </div>

      {activePostId && (
        <PostModal postId={activePostId} onClose={() => setActivePostId(null)} />
      )}
    </div>
  );
};

export default Explore;
