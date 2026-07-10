import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { ExploreSkeleton } from '../components/common/Skeletons';

// ── Post tile ─────────────────────────────────────────────────────────────────
const ExploreTile = ({ post, index }) => (
  <motion.div
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
    {/* Hover overlay */}
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

  const fetchExplore = async ({ pageParam = 1 }) => {
    const res = await api.get(`/posts/explore?page=${pageParam}&limit=12`);
    return res.data;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery({
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
      <div className="grid grid-cols-3 gap-px pb-10">
        {posts.map((post, i) => (
          <ExploreTile key={post._id ?? post.id} post={post} index={i} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={ref} className="flex h-10 w-full items-center justify-center mb-8">
        {isFetchingNextPage && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
        )}
      </div>
    </div>
  );
};

export default Explore;
