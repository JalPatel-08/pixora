const Bone = ({ className }) => (
  <div className={`shimmer rounded-lg ${className}`} />
);

export const PostSkeleton = () => (
  <article className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    {/* Header */}
    <div className="flex items-center gap-3 p-4">
      <Bone className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3 w-28" />
        <Bone className="h-2.5 w-16" />
      </div>
    </div>

    {/* Image */}
    <Bone className="aspect-square w-full rounded-none" />

    {/* Actions */}
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
