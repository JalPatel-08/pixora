import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useRipple } from '../../hooks/useRipple';

/**
 * Drop-in replacement for <button> / <motion.button> with ripple effect.
 * Accepts all standard button props + Framer Motion props.
 */
export const RippleButton = forwardRef(({ children, className = '', onPointerDown: externalPD, ...props }, forwardedRef) => {
  const { ref: rippleRef, onPointerDown } = useRipple();

  const setRef = (node) => {
    rippleRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const handlePointerDown = (e) => {
    onPointerDown(e);
    externalPD?.(e);
  };

  return (
    <motion.button
      ref={setRef}
      className={`relative overflow-hidden ${className}`}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {children}
    </motion.button>
  );
});

RippleButton.displayName = 'RippleButton';
