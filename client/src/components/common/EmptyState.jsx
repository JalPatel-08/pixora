import { motion } from 'framer-motion';

export const EmptyState = ({ icon: Icon, title, subtitle, emoji }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="flex flex-col items-center justify-center py-20 text-center"
  >
    {emoji ? (
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        className="mb-5 text-5xl select-none"
        aria-hidden="true"
      >
        {emoji}
      </motion.div>
    ) : Icon ? (
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border"
      >
        <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
      </motion.div>
    ) : null}
    <motion.h2
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="text-lg font-semibold text-text"
    >
      {title}
    </motion.h2>
    {subtitle && (
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="mt-1.5 max-w-xs text-sm text-text-secondary"
      >
        {subtitle}
      </motion.p>
    )}
  </motion.div>
);
