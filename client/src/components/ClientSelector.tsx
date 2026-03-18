import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Button from './ui/Button';
import Input from './ui/Input';
import FormField from './ui/FormField';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface ClientSelectorProps {
  onClientSelected: (client: Client) => void;
  label?: string;
  placeholder?: string;
}

export default function ClientSelector({ 
  onClientSelected, 
  label = 'Select or Create Client',
  placeholder = 'Search by name or email...'
}: ClientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Search for clients as user types
  useEffect(() => {
    if (!searchTerm.trim()) {
      setClients([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api(`/clients?search=${encodeURIComponent(searchTerm)}`);
        if (res.ok && Array.isArray(res.body)) {
          setClients(res.body);
        }
      } catch (err) {
        console.error('Failed to search clients:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    if (!newClient.name.trim()) {
      setError('Name is required');
      setIsCreating(false);
      return;
    }

    try {
      const res = await api('/clients', {
        method: 'POST',
        body: {
          name: newClient.name.trim(),
          email: newClient.email.trim() || null,
          phone: newClient.phone.trim() || null,
          notes: null
        }
      });

      if (res.ok) {
        onClientSelected(res.body);
        setNewClient({ name: '', email: '', phone: '' });
        setShowForm(false);
        setSearchTerm('');
      } else {
        setError(res.body?.error || res.body?.errors?.[0] || 'Failed to create client');
      }
    } catch (err) {
      setError('An error occurred while creating the client');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            + Create new
          </button>
        )}
      </div>

      {!showForm ? (
        <div>
          <Input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          {loading && <p className="text-xs text-slate-400">Loading...</p>}
          {clients.length > 0 && (
            <div className="border border-slate-600 rounded bg-slate-800 max-h-48 overflow-y-auto">
              {clients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
                    onClientSelected(client);
                    setSearchTerm('');
                    setClients([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm border-b border-slate-700 last:border-b-0"
                >
                  <div className="font-medium text-white">{client.name}</div>
                  {(client.email || client.phone) && (
                    <div className="text-xs text-slate-400">
                      {client.email && <span>{client.email}</span>}
                      {client.email && client.phone && <span> • </span>}
                      {client.phone && <span>{client.phone}</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {searchTerm.trim() && clients.length === 0 && !loading && (
            <p className="text-xs text-slate-400">No clients found</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleCreateClient} className="space-y-2 bg-slate-800 p-3 rounded border border-slate-700">
          <FormField label="Name" id="client-name">
            <Input
              id="client-name"
              type="text"
              placeholder="Full name"
              value={newClient.name}
              onChange={e => setNewClient({ ...newClient, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Email" id="client-email">
            <Input
              id="client-email"
              type="email"
              placeholder="Email (optional)"
              value={newClient.email}
              onChange={e => setNewClient({ ...newClient, email: e.target.value })}
            />
          </FormField>
          <FormField label="Phone" id="client-phone">
            <Input
              id="client-phone"
              type="tel"
              placeholder="Phone (optional)"
              value={newClient.phone}
              onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
            />
          </FormField>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isCreating} className="text-sm py-1 px-3">
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewClient({ name: '', email: '', phone: '' });
                setError(null);
              }}
              className="px-3 py-1 text-sm text-slate-400 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
