import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { commentService } from '../../services/api';
import { timeAgo } from '../../utils/formatters';
import { ProfileAvatar } from '../ProfileAvatar';
import { Spinner } from '../common/Spinner';

const CommentRow = ({ comment, postId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes?.length ?? 0);
  const isOwn = user?._id === comment.author?._id;

  const likeMutation = useMutation({
    mutationFn: () => commentService.toggleLike(comment._id),
    onMutate: () => {
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c - 1 : c + 1));
    },
    onError: () => {
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => commentService.deleteComment(comment._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] }),
  });

  return (
    <div className="group flex items-start gap-2.5 py-2">
      <Link to={`/profile/${comment.author?.username}`} className="flex-shrink-0">
        <ProfileAvatar user={comment.author} size="xs" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-text">
          <Link to={`/profile/${comment.author?.username}`} className="mr-1 font-semibold hover:text-primary transition-colors">
            {comment.author?.username}
          </Link>
          {comment.text}
        </p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-text-secondary">
          <span>{timeAgo(comment.createdAt)}</span>
          {likeCount > 0 && <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => likeMutation.mutate()} className="p-1">
          <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-red-500 text-red-500' : 'text-text-secondary hover:text-red-400'}`} />
        </motion.button>
        {isOwn && (
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="p-1"
          >
            <Trash2 className="h-3.5 w-3.5 text-text-secondary hover:text-danger" />
          </motion.button>
        )}
      </div>
    </div>
  );
};

export const CommentSection = ({ postId, commentsCount }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => commentService.getComments(postId),
  });

  const addMutation = useMutation({
    mutationFn: (t) => commentService.addComment(postId, { text: t }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) addMutation.mutate(text.trim());
  };

  const comments = data?.comments ?? [];

  return (
    <div className="border-t border-border">
      <div className="max-h-60 overflow-y-auto px-4 pt-2">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-secondary">No comments yet. Be the first.</p>
        ) : (
          comments.map((c) => <CommentRow key={c._id} comment={c} postId={postId} />)
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 border-t border-border px-4 py-3">
        <ProfileAvatar user={user} size="xs" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-secondary/60"
          maxLength={500}
        />
        {text.trim() && (
          <motion.button
            type="submit"
            disabled={addMutation.isPending}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 rounded-lg bg-primary p-1.5 text-white disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </form>
    </div>
  );
};
