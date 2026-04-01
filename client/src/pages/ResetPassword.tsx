import React, { useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import FormField  from '../components/ui/formField';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [stage, setStage] = useState<'request' | 'reset'>(!token ? 'request' : 'reset');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim()) {
        setError('Email is required');
        setLoading(false);
        return;
      }

      const res = await api('/auth/request-reset', {
        method: 'POST',
        body: { email: email.trim() }
      });

      if (res.ok) {
        setResetLink(res.body?.resetLink);
        setStage('reset');
        if (res.body?.resetLink) {
          const urlToken = res.body.resetLink.split('token=')[1];
          window.history.replaceState({}, '', `/reset-password?token=${urlToken}`);
        }
      } else {
        setError(res.body?.error || 'Failed to request reset');
      }
    } catch (err) {
      setError('An error occurred while requesting password reset');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('No reset token provided');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await api('/auth/reset', {
        method: 'POST',
        body: { token, newPassword }
      });

      if (res.ok) {
        setSuccess(true);
        setError(null);
      } else {
        setError(res.body?.error || 'Password reset failed');
      }
    } catch (err) {
      setError('An error occurred during password reset');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4 text-green-400">✓ Password Reset</h2>
            <div className="bg-green-900/20 border border-green-600 rounded p-4 mb-6">
              <p className="text-slate-200">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Go to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        {stage === 'request' ? (
          <>
            <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>
            <p className="text-slate-400 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleRequestReset} className="space-y-4">
              <FormField label="Email Address" id="resetEmail">
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="your@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </FormField>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-400 text-center">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300">
                  Sign in
                </Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-4">Set New Password</h2>
            <p className="text-slate-400 mb-6">
              Enter your new password below.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <FormField label="New Password" id="newPassword">
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </FormField>

              <FormField label="Confirm Password" id="confirmNewPassword">
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </FormField>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>

            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
          </>
        )}
      </Card>
    </div>
  );
}
