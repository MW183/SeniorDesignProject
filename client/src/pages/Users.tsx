import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui';
import { Button } from '../components/ui';
import { Input } from '../components/ui';

export default function Users({ currentUser }: { currentUser?: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isAdmin = currentUser?.role === 'ADMIN';

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function load() {
    const res = await api('/users');
    if (res.ok) setUsers(Array.isArray(res.body) ? res.body : []);
    else console.error('GET /users failed', res.status, res.body);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await api('/users', { method: 'POST', body: { name, email, password, role: 'USER' } });
    if (res.ok) { setName(''); setEmail(''); setPassword(''); load(); }
    else {
      const err = res.body?.error || (res.body?.details ? JSON.stringify(res.body.details) : 'Create failed');
      alert(err);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <Card>
        <h2 className="text-2xl font-semibold mb-4">{isAdmin ? 'Users' : 'Planners'}</h2>
        {isAdmin && (
          <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Input placeholder="Name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="Password" type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} className="flex-1" />
              <Button type="submit">Create</Button>
            </div>
          </form>
        )}

        <Input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        <ul className="space-y-2">
          {filteredUsers.map(u => (
            <li key={u.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-sm text-foreground">{u.email}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
