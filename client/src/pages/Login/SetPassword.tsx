import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import FormField from '../../components/ui/formField';

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!token) {
      setError('No verification token provided');
      return;
    }

    try {
      setLoading(true);
      const res = await api('/auth/set-password', {
        method: 'POST',
        body: { token, password }
      });

      if (res.ok) {
        setSuccess(true);
        // Auto-redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(res.body?.error || 'Failed to set password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <h2 className="text-2xl font-semibold mb-4">Set Your Password</h2>
          <p className="text-foreground mb-4">
            No verification token found. This link may have expired.
          </p>
          <Link to="/login">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Back to Login
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <div className="text-center">
          {success ? (
            <>
              <h2 className="text-2xl font-semibold mb-4 text-green-400">✓ Password Set!</h2>
              <div className="bg-green-900/20 border border-green-600 rounded p-4 mb-6">
                <p className="text-foreground mb-2">
                  Your password has been set successfully.
                </p>
                <p className="text-sm text-foreground">
                  Redirecting to login page...
                </p>
              </div>
              <Link to="/login">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Go to Login
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-2">Set Your Password</h2>
              <p className="text-foreground mb-6">
                Welcome! Please create a password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Password" id="password">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="Enter password (min 6 characters)"
                    disabled={loading}
                  />
                </FormField>

                <FormField label="Confirm Password" id="confirmPassword">
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    disabled={loading}
                  />
                </FormField>

                {error && (
                  <div className="bg-red-900/20 border border-red-600 rounded p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Setting Password...' : 'Set Password'}
                </Button>
              </form>

              <p className="text-xs text-foreground mt-4">
                Password must be at least 6 characters long
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
