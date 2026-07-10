import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../api/axios';

export const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then((res) => {
        setMessage(res.data.message || 'Email verified successfully.');
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err.response?.data?.message || 'Invalid or expired verification link.');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex w-full max-w-md flex-col items-center overflow-hidden rounded-2xl border border-border bg-card p-10 text-center shadow-xl shadow-black/5 dark:shadow-black/30"
      >
        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 w-full bg-gradient-to-r from-primary via-secondary to-accent" />

        {/* Logo */}
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent shadow-lg shadow-primary/30">
          <span className="font-logo text-2xl text-white">P</span>
        </div>
        <h1 className="font-logo text-2xl gradient-text mb-6">Pixora</h1>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            <p className="text-sm text-text-secondary">Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <p className="font-semibold text-text">{message}</p>
            <Link
              to="/login"
              className="mt-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
            >
              Log in
            </Link>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
              <XCircle className="h-8 w-8 text-danger" />
            </div>
            <p className="font-semibold text-text">{message}</p>
            <Link to="/login" className="mt-2 text-sm font-semibold text-primary hover:underline">
              Back to login
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
