import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminHome() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api('/users');
    if (res.ok) setUsers(Array.isArray(res.body) ? res.body : []);
    else setUsers([]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="text-2xl font-semibold m-0">Admin Home</h2>
        <p className="m-0 text-sm text-slate-400">Overview of users in the system.</p>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse mt-3">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left pb-2 w-2/5">Name</th>
                <th className="text-left pb-2 w-2/5">Email</th>
                <th className="text-left pb-2 w-1/5">Role</th>
                <th className="text-left pb-2 w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="odd:bg-white/2">
                  <td className="py-2 align-top">{u.name}</td>
                  <td className="py-2 align-top">{u.email}</td>
                  <td className="py-2 align-top">{u.role}</td>
                  <td className="py-2 text-center">
                    <button className="px-3 py-1 rounded bg-red-600 text-white text-sm" onClick={async () => {
                      if (!confirm(`Delete user ${u.email}?`)) return;
                      const res = await api(`/users/${u.id}`, { method: 'DELETE' });
                      if (res.ok) load(); else alert(res.body?.error || 'Delete failed');
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm"><em>Use the Users page to add new users.</em></p>
    </div>
  );
}
