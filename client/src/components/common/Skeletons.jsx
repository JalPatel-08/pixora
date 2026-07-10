import { motion } from 'framer-motion';

const Bone = ({ className }) => <div className={`shimmer rounded-lg ${className}`} />;

// ── Post ──────────────────────────────────────────────────────────────────────
export const PostSkeleton = () => (
  <article className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <div className="flex items-center gap-3 p-4">
      <Bone className="h-9 w-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3 w-28" />
        <Bone className="h-2.5 w-16" />
      </div>
    </div>
    <Bone className="aspect-square w-full rounded-none" />
    <div className="p-4 space-y-3">
      <div className="flex gap-4">
        <Bone className="h-6 w-6 rounded-full" />
        <Bone className="h-6 w-6 rounded-full" />
        <Bone className="h-6 w-6 rounded-full" />
      </div>
      <Bone className="h-3 w-20" />
      <Bone className="h-3 w-52" />
      <Bone className="h-3 w-36" />
    </div>
  </article>
);

// ── Stories bar ───────────────────────────────────────────────────────────────
export const StorySkeleton = ({ count = 5 }) => (
  <div className="mb-5 flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.06, duration: 0.28 }}
        className="flex flex-col items-center gap-2 flex-shrink-0"
      >
        <Bone className="h-14 w-14 rounded-full" />
        <Bone className="h-2 w-10" />
      </motion.div>
    ))}
  </div>
);

// ── Profile header + grid ─────────────────────────────────────────────────────
export const ProfileSkeleton = () => (
  <div className="mx-auto w-full max-w-[935px] px-0 md:px-4 pt-4 md:pt-8">
    <header className="flex flex-col items-center gap-4 border-b border-border px-4 pb-6 pt-4 md:flex-row md:items-start md:gap-16">
      <Bone className="h-20 w-20 rounded-full flex-shrink-0 md:h-36 md:w-36" />
      <div className="flex flex-1 flex-col items-center gap-4 md:items-start w-full">
        <div className="flex gap-3">
          <Bone className="h-6 w-32" />
          <Bone className="h-8 w-24 rounded-xl" />
        </div>
        <div className="flex gap-8">
          <Bone className="h-4 w-12" />
          <Bone className="h-4 w-16" />
          <Bone className="h-4 w-16" />
        </div>
        <div className="space-y-2 w-full max-w-xs">
          <Bone className="h-3 w-24" />
          <Bone className="h-3 w-48" />
          <Bone className="h-3 w-36" />
        </div>
      </div>
    </header>
    <div className="grid grid-cols-3 gap-px pt-px mt-4">
      {[...Array(9)].map((_, i) => (
        <Bone key={i} className="aspect-square rounded-none" />
      ))}
    </div>
  </div>
);

// ── Conversation list ─────────────────────────────────────────────────────────
export const ConversationListSkeleton = ({ count = 6 }) => (
  <div className="flex flex-col gap-0 w-full">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05, duration: 0.22 }}
        className="flex items-center gap-3 px-4 py-3"
      >
        <Bone className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3 w-28" />
          <Bone className="h-2.5 w-40" />
        </div>
      </motion.div>
    ))}
  </div>
);

// ── Message bubbles ───────────────────────────────────────────────────────────
export const MessagesSkeleton = ({ count = 8 }) => (
  <div className="flex flex-col gap-3 px-4 py-4">
    {[...Array(count)].map((_, i) => {
      const isOwn = i % 3 === 0;
      return (
        <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <Bone className={`h-9 rounded-2xl ${isOwn ? 'w-40' : 'w-52'}`} />
        </div>
      );
    })}
  </div>
);

// ── Notifications ─────────────────────────────────────────────────────────────
export const NotificationSkeleton = ({ count = 6 }) => (
  <div className="space-y-1">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05, duration: 0.22 }}
        className="flex items-center gap-3 rounded-xl px-4 py-3"
      >
        <Bone className="h-9 w-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3 w-48" />
          <Bone className="h-2.5 w-24" />
        </div>
        <Bone className="h-10 w-10 rounded-lg flex-shrink-0" />
      </motion.div>
    ))}
  </div>
);

// ── Search results ────────────────────────────────────────────────────────────
export const SearchSkeleton = ({ count = 5 }) => (
  <div>
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05, duration: 0.22 }}
        className="flex items-center gap-3 px-4 py-3"
      >
        <Bone className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3 w-28" />
          <Bone className="h-2.5 w-20" />
        </div>
      </motion.div>
    ))}
  </div>
);

// ── Explore grid ──────────────────────────────────────────────────────────────
export const ExploreSkeleton = ({ count = 12 }) => (
  <div className="grid grid-cols-3 gap-px">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.03, duration: 0.25 }}
      >
        <Bone className="aspect-square rounded-none" />
      </motion.div>
    ))}
  </div>
);

// ── Right sidebar suggestions ─────────────────────────────────────────────────
export const SuggestionsSkeleton = ({ count = 5 }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.06, duration: 0.22 }}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Bone className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-1.5 min-w-0">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-2 w-14" />
          </div>
        </div>
        <Bone className="h-6 w-14 rounded-lg flex-shrink-0" />
      </motion.div>
    ))}
  </div>
);

// ── Sidebar nav items ─────────────────────────────────────────────────────────
export const NavSkeleton = ({ count = 5 }) => (
  <div className="flex flex-col gap-0.5">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.06, duration: 0.22 }}
        className="flex items-center gap-3.5 rounded-xl px-3 py-2.5"
      >
        <Bone className="h-5 w-5 rounded-md flex-shrink-0" />
        <Bone className="h-3 w-20" />
      </motion.div>
    ))}
  </div>
);
