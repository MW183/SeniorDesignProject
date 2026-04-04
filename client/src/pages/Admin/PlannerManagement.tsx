import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import Table from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import ConfirmDialog from '../../components/ConfirmDialog';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function PlannerManagement({ currentUser }: { currentUser?: any }) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const filteredUsers = users
    .filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isAdmin = currentUser?.role === 'ADMIN';

  async function load() {
    setLoading(true);
    const res = await api('/users?role=USER');
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
    setDeleteConfirm(user);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    const res = await api(`/users/${deleteConfirm.id}`, { method: 'DELETE' });
    if (res.ok) {
      setDeleteConfirm(null);
      load();
    } else {
      alert(res.body?.error || 'Delete failed');
      setDeleteConfirm(null);
    }
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
          <Button variant="destructive" size="sm" onClick={() => deleteUser(user)}>
            Delete
          </Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Manage Planners</h2>
      </div>
      
      {/* Search */}
      <Card className="mb-6">
        <Input
          type="text"
          placeholder="Search planners by name or email..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              load();
            }
          }}
        />
      </Card>
      
      {/* Add User Form */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Add New Planner</h3>
        <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} required />
          <Input placeholder="Email" type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required />
          <Input placeholder="Password" type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-1/2 justify-self-center">Create User</Button>
        </form>
      </Card>

      {/* User List */}
      <Card>
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h3 className="text-lg font-semibold m-0">Planners</h3>
          <p className="m-0 text-sm text-foreground">Manage all planners in the system</p>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : filteredUsers.length === 0 && users.length > 0 ? (
          <p className="text-foreground">No planners match your search.</p>
        ) : users.length === 0 ? (
          <p className="text-foreground">No planners found.</p>
        ) : (
          <Table columns={columns} data={filteredUsers} />
        )}
      </Card>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete Planner"
        message={`Are you sure you want to delete ${deleteConfirm?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
