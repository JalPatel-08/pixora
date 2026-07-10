import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../services/api';
import { ProfileAvatar } from './ProfileAvatar';
import { SearchSkeleton } from './common/Skeletons';

export const SearchPanel = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (input.trim().length === 0) { setQuery(''); return; }
    debounceRef.current = setTimeout(() => setQuery(input.trim()), 400);
    return () => clearTimeout(debounceRef.current);
  }, [input]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['search', query],
    queryFn: () => userService.search(query),
    enabled: query.length > 0,
    staleTime: 30 * 1000,
    retry: false,
  });

  const users = data?.users ?? [];
  const showResults = query.length > 0;

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <h2 className="font-logo text-lg font-bold text-text">Search</h2>
        {onClose && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors"
          >
            <X className="h-4 w-4" />
          </motion.button>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-xl bg-background border border-border px-3 py-2.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-4 w-4 flex-shrink-0 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search users…"
            className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-secondary/60"
          />
          <AnimatePresence>
            {input && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => { setInput(''); setQuery(''); }}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4 text-text-secondary hover:text-text" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isFetching && <SearchSkeleton count={4} />}

        {isError && !isFetching && (
          <p className="px-4 py-8 text-center text-sm text-danger">Something went wrong. Try again.</p>
        )}

        {!isFetching && !isError && showResults && users.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="text-4xl select-none" aria-hidden>🔍</div>
            <p className="font-semibold text-text">Nothing found</p>
            <p className="text-sm text-text-secondary">Try another username or keyword.</p>
          </div>
        )}

        {!isFetching && users.length > 0 && (
          <ul>
            {users.map((u, i) => (
              <motion.li
                key={u._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/profile/${u.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background"
                >
                  <ProfileAvatar user={u} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{u.username}</p>
                    {u.name && <p className="truncate text-xs text-text-secondary">{u.name}</p>}
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}

        {!showResults && !isFetching && (
          <p className="px-4 py-8 text-center text-sm text-text-secondary">
            Search for people to follow.
          </p>
        )}
      </div>
    </div>
  );
};
