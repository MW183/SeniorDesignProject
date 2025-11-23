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
    <div style={{textAlign: 'left'}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:16}}>
        <h2 style={{margin:0}}>Admin Home</h2>
        <p style={{margin:0,color:'#666'}}>Overview of users in the system.</p>
      </div>
      {loading ? <p>Loading...</p> : (
        <table style={{width:'100%',borderCollapse:'collapse', tableLayout: 'fixed', marginTop: 12}}>
          <thead>
            <tr>
              <th style={{textAlign:'left',borderBottom:'1px solid #ddd', width: '35%'}}>Name</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #ddd', width: '45%'}}>Email</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #ddd', width: '15%'}}>Role</th>
              <th style={{textAlign:'left',borderBottom:'1px solid #ddd', width: '80px'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{padding:'8px 0', textAlign: 'left'}}>{u.name}</td>
                <td style={{padding:'8px 0', textAlign: 'left'}}>{u.email}</td>
                <td style={{padding:'8px 0', textAlign: 'left'}}>{u.role}</td>
                <td style={{padding:'8px 0', textAlign: 'center'}}>
                  <button onClick={async () => {
                    if (!confirm(`Delete user ${u.email}?`)) return;
                    const res = await api(`/users/${u.id}`, { method: 'DELETE' });
                    if (res.ok) load(); else alert(res.body?.error || 'Delete failed');
                  }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{marginTop:12}}><em>Use the Users page to add new users.</em></p>
    </div>
  );
}
