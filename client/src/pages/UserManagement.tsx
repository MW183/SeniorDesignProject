import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function UserManagement({ currentUser }: { currentUser?: any }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isAdmin = currentUser?.role === 'ADMIN';

  async function load() {
    setLoading(true);
    const res = await api('/users');
    if (res.ok) setUsers(Array.isArray(res.body) ? res.body : []);
    else setUsers([]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await api('/users', { method: 'POST', body: { name, email, password, role: 'USER' } });
    if (res.ok) { 
      setName(''); 
      setEmail(''); 
      setPassword(''); 
      load(); 
    } else {
      const err = res.body?.error || (res.body?.details ? JSON.stringify(res.body.details) : 'Create failed');
      alert(err);
    }
  }

  async function deleteUser(user: User) {
    if (!confirm(`Delete user ${user.email}?`)) return;
    const res = await api(`/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) load();
    else alert(res.body?.error || 'Delete failed');
  }

  const columns = [
    { key: 'name', label: 'Name', className: 'text-left pb-2 w-2/5' },
    { key: 'email', label: 'Email', className: 'text-left pb-2 w-2/5' },
    { key: 'role', label: 'Role', className: 'text-left pb-2 w-1/5' },
    ...(isAdmin ? [{
      key: 'actions',
      label: 'Actions',
      className: 'text-left pb-2 w-[80px]',
      render: (user: User) => (
        <div className="text-center">
          <Button variant="danger" size="sm" onClick={() => deleteUser(user)}>
            Delete
          </Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-semibold mb-4">User Management</h2>
      
      {/* Add User Form */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Add New User</h3>
        <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
          <Input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Button type="submit">Create User</Button>
        </form>
      </Card>

      {/* User List */}
      <Card>
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h3 className="text-lg font-semibold m-0">Users</h3>
          <p className="m-0 text-sm text-slate-400">Manage all users in the system</p>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <Table columns={columns} data={users} />
        )}
      </Card>
    </div>
  );
}
