import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const schema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  name: yup.string().required('Full name is required'),
  username: yup.string().min(3, 'At least 3 characters').required('Username is required'),
  password: yup.string().min(6, 'At least 6 characters').required('Password is required'),
}).required();

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

export const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      setSuccessMsg(data.message || 'Registration successful! Please check your email to verify.');
      setTimeout(() => navigate('/login'), 5000);
    },
    onError: (error) => setServerError(error.response?.data?.message || 'Failed to register'),
  });

  const onSubmit = (data) => { setServerError(''); setSuccessMsg(''); registerMutation.mutate(data); };

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
        <p className="mb-8 text-center text-sm font-medium text-text-secondary">
          Sign up to see photos and videos from your friends.
        </p>

        {serverError && (
          <div className="mb-4 w-full rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger text-center">
            {serverError}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 w-full rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success text-center">
            {successMsg}
          </div>
        )}

        <form className="w-full space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <AuthInput label="Email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
          <AuthInput label="Full Name" placeholder="Your full name" error={errors.name?.message} {...register('name')} />
          <AuthInput label="Username" placeholder="Choose a username" error={errors.username?.message} {...register('username')} />
          <AuthInput
            label="Password"
            placeholder="At least 6 characters"
            error={errors.password?.message}
            showToggle
            showPass={showPass}
            onToggle={() => setShowPass((v) => !v)}
            {...register('password')}
          />

          <p className="text-center text-xs text-text-secondary">
            By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
          </p>

          <motion.button
            type="submit"
            disabled={registerMutation.isPending || !!successMsg}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-opacity disabled:opacity-60"
          >
            {registerMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing up…</> : 'Create account'}
          </motion.button>
        </form>

        <div className="mt-6 w-full border-t border-border pt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
