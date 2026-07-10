import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mail } from 'lucide-react';
import api from '../api/axios';

const schema = yup.object({ email: yup.string().email('Invalid email').required('Email is required') });

export const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/auth/forgot-password', data),
    onSuccess: () => setSent(true),
    onError: (e) => setServerError(e.response?.data?.message || 'Something went wrong'),
  });

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

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center gap-3 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Mail className="h-6 w-6 text-success" />
            </div>
            <p className="font-semibold text-text">Check your email</p>
            <p className="text-sm text-text-secondary">We sent a password reset link to your email address.</p>
            <Link to="/login" className="mt-2 text-sm font-semibold text-primary hover:underline">Back to login</Link>
          </motion.div>
        ) : (
          <>
            <p className="mb-8 mt-2 text-center text-sm text-text-secondary">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {serverError && (
              <div className="mb-4 w-full rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger text-center">
                {serverError}
              </div>
            )}

            <form className="w-full space-y-4" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">Email</label>
                <input
                  {...register('email')}
                  placeholder="you@example.com"
                  className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-text outline-none transition-all placeholder:text-text-secondary/50
                    focus:border-primary focus:ring-2 focus:ring-primary/20
                    ${errors.email ? 'border-danger ring-2 ring-danger/20' : 'border-border hover:border-text-secondary/40'}`}
                />
                {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={mutation.isPending}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 disabled:opacity-60"
              >
                {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send reset link'}
              </motion.button>
            </form>

            <div className="mt-6 w-full border-t border-border pt-6 text-center text-sm">
              <Link to="/login" className="font-semibold text-primary hover:underline">Back to login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
