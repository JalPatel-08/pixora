import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../api/axios';

const schema = yup.object({
  password: yup.string().min(6, 'At least 6 characters').required('Password is required'),
  confirm: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Please confirm your password'),
});

export const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  const mutation = useMutation({
    mutationFn: ({ password }) => api.post(`/auth/reset-password/${token}`, { password }),
    onSuccess: () => navigate('/login', { state: { message: 'Password reset successful. Please log in.' } }),
    onError: (e) => setServerError(e.response?.data?.message || 'Reset failed. The link may have expired.'),
  });

  const inputCls = (err) => `w-full rounded-xl border bg-background px-4 py-3 text-sm text-text outline-none transition-all placeholder:text-text-secondary/50
    focus:border-primary focus:ring-2 focus:ring-primary/20
    ${err ? 'border-danger ring-2 ring-danger/20' : 'border-border hover:border-text-secondary/40'}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/30">
      <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-accent" />

      <div className="flex flex-col items-center px-8 py-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent shadow-lg shadow-primary/30"
        >
          <span className="font-logo text-2xl text-white">P</span>
        </motion.div>
        <h1 className="font-logo text-2xl gradient-text mb-1">Pixora</h1>
        <p className="mb-8 mt-2 text-center text-sm text-text-secondary">Enter your new password below.</p>

        {serverError && (
          <div className="mb-4 w-full rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger text-center">
            {serverError}
          </div>
        )}

        <form className="w-full space-y-4" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">New Password</label>
            <div className="relative">
              <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="At least 6 characters" className={inputCls(errors.password)} />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">Confirm Password</label>
            <input {...register('confirm')} type="password" placeholder="Repeat your password" className={inputCls(errors.confirm)} />
            {errors.confirm && <p className="text-xs text-danger">{errors.confirm.message}</p>}
          </div>

          <motion.button
            type="submit"
            disabled={mutation.isPending}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 disabled:opacity-60"
          >
            {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting…</> : 'Reset password'}
          </motion.button>
        </form>

        <div className="mt-6 w-full border-t border-border pt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-primary hover:underline">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
