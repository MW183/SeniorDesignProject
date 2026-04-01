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

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <h2 className="text-2xl font-semibold mb-4">Login</h2>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Email" id="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password" id="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </FormField>
          <div>
            <Button type="submit">Login</Button>
          </div>
        </form>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

        <div className="mt-6 pt-6 border-t border-slate-700 space-y-3">
          <p className="text-sm text-slate-400 text-center">
            <Link to="/reset-password" className="text-blue-400 hover:text-blue-300">
              Forgot your password?
            </Link>
          </p>
          <p className="text-sm text-slate-400 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
