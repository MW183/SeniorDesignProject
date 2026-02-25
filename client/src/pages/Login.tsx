import React, { useState } from 'react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';

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
      </Card>
    </div>
  );
}
