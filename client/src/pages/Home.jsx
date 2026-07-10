import { useState, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Rss } from 'lucide-react';
import { postService } from '../services/api';
import { PostCard } from '../components/post/PostCard';
import { PostSkeleton } from '../components/post/PostSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { StoriesBar } from '../components/stories/StoriesBar';

export const Home = () => {
  const [deletedIds, setDeletedIds] = useState(new Set());
  const { ref, inView } = useInView({ threshold: 0 });
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 1 }) => postService.getFeed(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination?.hasMore ? last.pagination.page + 1 : undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDeleted = (id) => {
    setDeletedIds((s) => new Set(s).add(id));
  };

  // ── Loading skeletons ───────────────────────────────────────────────────────
  if (status === 'pending') {
    return (
      <div className="mx-auto max-w-[470px]">
        {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="font-medium text-danger">Failed to load feed</p>
        <p className="mt-1 text-sm text-text-secondary">{error.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['feed'] })}
          className="mt-4 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-border"
        >
          Try again
        </button>
      </div>
    );
  }

  const posts = data.pages
    .flatMap((p) => p.posts)
    .filter((p) => !deletedIds.has(p._id));

  return (
    <>
      <div className="mx-auto max-w-[470px]">
        <StoriesBar />

        {/* ── Feed ─────────────────────────────────────────────────────────── */}
        {posts.length === 0 ? (
          <EmptyState
            emoji="📡"
            title="Your feed is empty"
            subtitle="Follow people to see their posts here."
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDeleted={handleDeleted}
            />
          ))
        )}

        {/* ── Infinite scroll trigger ───────────────────────────────────────── */}
        <div ref={ref} className="flex h-16 items-center justify-center">
          {isFetchingNextPage && (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-xs text-text-secondary">You're all caught up ✓</p>
          )}
        </div>
      </div>

    </>
  );
};

export default Home;
