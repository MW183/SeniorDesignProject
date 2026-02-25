import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
      <div className="card">
        <h2 className="text-2xl font-semibold mb-4">Users</h2>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="px-3 py-2 rounded border bg-transparent" />
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="px-3 py-2 rounded border bg-transparent" />
          <div className="flex gap-2">
            <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} className="flex-1 px-3 py-2 rounded border bg-transparent" />
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>

        <ul className="space-y-2">
          {users.map(u => (
            <li key={u.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-sm text-slate-300">{u.email}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
