import React, { useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import FormField  from '../components/ui/formField';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await api('/auth/register', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          role: 'USER'
        }
      });

      if (res.ok) {
        setRegisterSuccess(true);
        if (res.body?.verificationLink) {
          setVerificationLink(res.body.verificationLink);
        }
      } else {
        setError(res.body?.error || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  }

  if (registerSuccess) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4 text-green-400">Account Created!</h2>
            <div className="bg-slate-700/50 p-4 rounded mb-6">
              <p className="text-slate-200 mb-4">
                A verification email has been sent to <strong>{email}</strong>
              </p>
              <p className="text-sm text-slate-400">
                Please check your email and click the verification link to activate your account.
              </p>
            </div>

            {verificationLink && (
              <div>
                <p className="text-xs text-slate-500 mb-3">Dev Mode: Direct link</p>
                <Link to={`/verify-email?token=${verificationLink.split('token=')[1]}`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 mb-3">
                    Verify Email Now
                  </Button>
                </Link>
              </div>
            )}

            <Link to="/login">
              <Button variant="outline" className="w-full">
                Back to Login
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
        <h2 className="text-2xl font-semibold mb-4">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Full Name" id="name">
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField label="Email" id="email">
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField label="Password" id="password">
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField label="Confirm Password" id="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </>
        </form>

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-sm text-slate-400 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-4 p-3 bg-slate-700/30 rounded text-xs text-slate-400">
          <strong>Tip:</strong> If you were added as a couple member, look for the verification email from your wedding planner.
        </div>
      </Card>
    </div>
  );
}
