import React, { useState } from 'react';
import { api } from '../lib/api';

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
      <div className="card">
        <h2 className="text-2xl font-semibold mb-4">Login</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded border bg-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded border bg-transparent" />
          </div>
          <div>
            <button type="submit" className="btn-primary">Login</button>
          </div>
        </form>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      </div>
    </div>
  );
}
