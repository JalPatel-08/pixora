import { useState, useRef } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../services/api';
import { ProfileAvatar } from './ProfileAvatar';

// ── Ripple helper ─────────────────────────────────────────────────────────────
function spawnRipple(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const span = document.createElement('span');
  span.style.cssText = `
    position:absolute;border-radius:50%;pointer-events:none;
    width:${size}px;height:${size}px;left:${x}px;top:${y}px;
    background:currentColor;opacity:0.15;transform:scale(0);
    animation:_ripple 0.55s cubic-bezier(.4,0,.2,1) forwards;
  `;
  if (!document.getElementById('_ripple_kf')) {
    const s = document.createElement('style');
    s.id = '_ripple_kf';
    s.textContent = '@keyframes _ripple{to{transform:scale(1);opacity:0}}';
    document.head.appendChild(s);
  }
  el.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
}

// ── Field ─────────────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, placeholder, textarea, maxLength }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {label}
    </label>
    {textarea ? (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-text outline-none transition-all placeholder:text-text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    ) : (
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl border border-border bg-background p-3 text-sm text-text outline-none transition-all placeholder:text-text-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    )}
    {maxLength && (
      <p className="mt-0.5 text-right text-xs text-text-secondary">{value.length}/{maxLength}</p>
    )}
  </div>
);

// ── EditProfileModal ──────────────────────────────────────────────────────────
export const EditProfileModal = ({ user, onClose }) => {
  const queryClient = useQueryClient();
  const avatarRef = useRef();
  const coverRef = useRef();
  const overlayRef = useRef();

  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    website: user.website || '',
    location: user.location || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [error, setError] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['authUser'] });
    queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
  };

  const updateMutation = useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: () => { invalidate(); onClose(); },
    onError: (e) => setError(e.response?.data?.message || 'Update failed'),
  });

  const avatarMutation = useMutation({
    mutationFn: userService.updateAvatar,
    onSuccess: invalidate,
    onError: (e) => setError(e.response?.data?.message || 'Avatar upload failed'),
  });

  const coverMutation = useMutation({
    mutationFn: userService.updateCover,
    onSuccess: invalidate,
    onError: (e) => setError(e.response?.data?.message || 'Cover upload failed'),
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append('profilePicture', file);
    avatarMutation.mutate(fd);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append('coverPhoto', file);
    coverMutation.mutate(fd);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const anyLoading = avatarMutation.isPending || coverMutation.isPending || updateMutation.isPending;

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === overlayRef.current && !anyLoading && onClose()}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onPointerDown={spawnRipple}
            onClick={onClose}
            disabled={anyLoading}
            className="relative overflow-hidden rounded-full p-1.5 text-text-secondary hover:bg-background hover:text-text transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </motion.button>
          <h2 className="font-semibold text-text">Edit profile</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onPointerDown={spawnRipple}
            onClick={() => updateMutation.mutate(form)}
            disabled={anyLoading}
            className="relative overflow-hidden rounded-lg px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : 'Save'}
          </motion.button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {/* Cover photo */}
          <div className="relative h-32 w-full overflow-hidden bg-border group/cover">
            <AnimatePresence mode="wait">
              {(coverPreview || user.coverPhoto?.url) && (
                <motion.img
                  key={coverPreview || user.coverPhoto?.url}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={coverPreview || user.coverPhoto.url}
                  alt="cover"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/cover:scale-105"
                />
              )}
            </AnimatePresence>
            <motion.button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={coverMutation.isPending}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-100"
            >
              {coverMutation.isPending
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : (
                  <>
                    <motion.div whileHover={{ scale: 1.15 }} transition={{ type: 'spring', stiffness: 400 }}>
                      <Camera className="h-5 w-5" />
                    </motion.div>
                    <span className="text-xs font-medium">Change cover</span>
                  </>
                )
              }
            </motion.button>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>

          {/* Avatar */}
          <div className="relative -mt-10 ml-6 mb-2 w-fit">
            <div className="relative rounded-full ring-4 ring-card group/avatar">
              <ProfileAvatar
                user={avatarPreview ? { ...user, profilePicture: { url: avatarPreview } } : user}
                size="md"
              />
              {avatarMutation.isPending ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity hover:opacity-100"
                >
                  <motion.div whileHover={{ scale: 1.2 }} transition={{ type: 'spring', stiffness: 400 }}>
                    <Camera className="h-5 w-5 text-white" />
                  </motion.div>
                </motion.button>
              )}
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Form fields */}
          <div className="space-y-4 px-6 pb-6">
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="rounded-xl bg-danger/10 border border-danger/20 px-3 py-2 text-sm text-danger"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <Field label="Name" value={form.name} onChange={set('name')} placeholder="Name" maxLength={50} />
            <Field label="Bio" value={form.bio} onChange={set('bio')} placeholder="Bio" textarea maxLength={150} />
            <Field label="Website" value={form.website} onChange={set('website')} placeholder="https://yoursite.com" />
            <Field label="Location" value={form.location} onChange={set('location')} placeholder="City, Country" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
