import { useCallback, useRef } from 'react';

/**
 * Returns a ref to attach to a button and a triggerRipple handler.
 * Usage: const { ref, onPointerDown } = useRipple();
 *        <button ref={ref} onPointerDown={onPointerDown} ...>
 */
export const useRipple = () => {
  const ref = useRef(null);

  const onPointerDown = useCallback((e) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    el.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }, []);

  return { ref, onPointerDown };
};
