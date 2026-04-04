import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {Button} from './ui/button';
import {Input} from './ui/input';
import FormField from './ui/formField';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';


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
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

 
  useEffect(() => {
    if (!searchTerm.trim()) {
      setClients([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api(`/users?search=${encodeURIComponent(searchTerm)}&role=CLIENT`);
        if (res.ok && Array.isArray(res.body)) {
          setClients(res.body);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
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
      const res = await api('/users', {
        method: 'POST',
        body: {
          name: newClient.name.trim(),
          email: newClient.email.trim() || null,
          password: 'password',
          phone: newClient.phone.trim() || null,
          role: 'CLIENT'
        }
      });

      if (res.ok) {
        onClientSelected(res.body);
        setNewClient({ name: '', email: '', phone: '' });
        setShowForm(false);
        setSearchTerm('');
        setOpen(false);
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
        <span className="text-sm font-medium text-foreground">{label}</span>
        {!showForm && (
          <button
            type="button"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setShowForm(true);
            }}
            className="text-xs text-accent hover:text-accent/80 underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Create new
          </button>
        )}
      </div>

      {!showForm ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <span className="truncate text-slate-400">{placeholder}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <div className="flex flex-col">
              <Input
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="m-1 mb-0"
              />
              <Command>
              <CommandEmpty>
                {loading ? 'Searching...' : 'No clients found'}
              </CommandEmpty>
              <CommandList>
                <CommandGroup>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.id}
                      onSelect={() => {
                        onClientSelected(client);
                        setOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">{client.name}</p>
                        {(client.email || client.phone) && (
                          <p className="text-xs text-slate-400">
                            {client.email && <span>{client.email}</span>}
                            {client.email && client.phone && <span> • </span>}
                            {client.phone && <span>{client.phone}</span>}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <form onSubmit={handleCreateClient} className="space-y-2 bg-card p-3 rounded border border-border">
          <FormField label="Name" id="client-name">
            <Input
              id="client-name"
              type="text"
              placeholder="Full name"
              value={newClient.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClient({ ...newClient, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Email" id="client-email">
            <Input
              id="client-email"
              type="email"
              placeholder="Email (optional)"
              value={newClient.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClient({ ...newClient, email: e.target.value })}
            />
          </FormField>
          <FormField label="Phone" id="client-phone">
            <Input
              id="client-phone"
              type="tel"
              placeholder="Phone (optional)"
              value={newClient.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClient({ ...newClient, phone: e.target.value })}
            />
          </FormField>
          {error && <div className="text-xs text-destructive">{error}</div>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isCreating} className="text-sm py-1 px-3">
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
            <button
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                setShowForm(false);
                setNewClient({ name: '', email: '', phone: '' });
                setError(null);
              }}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-muted-foreground/80"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
