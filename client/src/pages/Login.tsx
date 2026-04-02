import React, { useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import FormField from '../components/ui/formField';
import { Link } from 'react-router-dom';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await api('/auth/login', { method: 'POST', body: { email, password } });
    if (res.ok && res.body.token) {
      onLogin();
    } else {
      setError(res.body?.error || 'Login failed');
    }
  }

  const isEmailNotVerifiedError = error && error.includes('Email not verified');

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <h2 className="flex content-center text-2xl font-semibold mb-4">Login</h2>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Email" id="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password" id="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
          </FormField>
          <p className="text-sm text-slate-400 text-center">
            <Link to="/reset-password" className="text-blue-400 hover:text-blue-300">
              Forgot your password?
            </Link>
          </p>
          <div className="flex justify-center pt-4">
            <Button type="submit" variant="default" size="lg">Login</Button>
          </div>
        </form>
        {error && (
          <div className="mt-4 space-y-3">
            <div className={`text-sm p-3 rounded border ${
              isEmailNotVerifiedError 
                ? 'bg-yellow-900/20 border-yellow-600 text-yellow-400' 
                : 'bg-red-900/20 border-red-600 text-red-400'
            }`}>
              {error}
            </div>
            {isEmailNotVerifiedError && (
              <Link to={`/resend-verification?email=${encodeURIComponent(email)}`}>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  Resend Verification Email
                </Button>
              </Link>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
