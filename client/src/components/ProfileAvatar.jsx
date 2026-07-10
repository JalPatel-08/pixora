import { motion } from 'framer-motion';

const SIZES = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-10 w-10 text-sm',
  md: 'h-16 w-16 text-xl',
  lg: 'h-24 w-24 md:h-36 md:w-36 text-4xl',
};

export const ProfileAvatar = ({ user, size = 'lg', className = '' }) => (
  <motion.div
    whileHover={{ scale: 1.06 }}
    whileTap={{ scale: 0.97 }}
    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
    className={`${SIZES[size]} flex-shrink-0 overflow-hidden rounded-full bg-border ${className}`}
  >
    {user?.profilePicture?.url ? (
      <img
        src={user.profilePicture.url}
        alt={user.username}
        className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-primary to-secondary font-bold uppercase text-white">
        {user?.username?.charAt(0) ?? '?'}
      </div>
    )}
  </motion.div>
);
