import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const schema = yup.object({
  emailOrUsername: yup.string().required('Email or username is required'),
  password: yup.string().required('Password is required'),
});

const AuthInput = ({ label, error, type = 'text', showToggle, onToggle, showPass, ...props }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</label>
    <div className="relative">
      <input
        type={showToggle ? (showPass ? 'text' : 'password') : type}
        className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-text outline-none transition-all placeholder:text-text-secondary/50
          focus:border-primary focus:ring-2 focus:ring-primary/20
          ${error ? 'border-danger ring-2 ring-danger/20' : 'border-border hover:border-text-secondary/40'}`}
        {...props}
      />
      {showToggle && (
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
    {error && <p className="text-xs text-danger">{error}</p>}
  </div>
);

export const Login = () => {
  const { login } = useAuth();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const successMsg = location.state?.message || '';

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  const mutation = useMutation({
    mutationFn: login,
    onError: (e) => setServerError(e.response?.data?.message || 'Failed to log in'),
  });

  const onSubmit = (data) => { setServerError(''); mutation.mutate(data); };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/30">
      {/* Top gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-accent" />

      <div className="flex flex-col items-center px-8 py-10">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent shadow-lg shadow-primary/30"
        >
          <span className="font-logo text-2xl text-white">P</span>
        </motion.div>
        <h1 className="font-logo text-2xl gradient-text mb-1">Pixora</h1>
        <p className="mb-8 text-xs text-text-secondary">Where Moments Become Stories.</p>

        {successMsg && (
          <div className="mb-4 w-full rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success text-center">
            {successMsg}
          </div>
        )}
        {serverError && (
          <div className="mb-4 w-full rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger text-center">
            {serverError}
          </div>
        )}

        <form className="w-full space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <AuthInput
            label="Username or Email"
            placeholder="Enter your username or email"
            error={errors.emailOrUsername?.message}
            {...register('emailOrUsername')}
          />
          <AuthInput
            label="Password"
            placeholder="Enter your password"
            error={errors.password?.message}
            showToggle
            showPass={showPass}
            onToggle={() => setShowPass((v) => !v)}
            {...register('password')}
          />

          <motion.button
            type="submit"
            disabled={mutation.isPending}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-opacity disabled:opacity-60"
          >
            {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Logging in…</> : 'Log in'}
          </motion.button>
        </form>

        <div className="my-6 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>

        <div className="mt-6 w-full border-t border-border pt-6 text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
