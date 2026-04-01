import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {Button} from './ui/button';
import {Input} from './ui/input';
import FormField from './ui/formField';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ChevronsUpDown, Plus } from 'lucide-react';
//interface for form
interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  type: string;
}
//handles form suggestion
interface AddressSuggestion {
  id: string;
  displayName: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  isExisting?: boolean;
}
//props for form
interface AddressSelectorProps {
  onAddressSelected: (address: Address) => void;
  label?: string;
  placeholder?: string;
  addressType?: string; // Optional: filter by address type (e.g., 'Venue', 'Vendor')
}

export default function AddressSelector({ 
  onAddressSelected, 
  label = 'Select or Create Location',
  placeholder = 'Search US addresses (e.g., "1600 Pennsylvania Ave")...',
  addressType
}: AddressSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ 
    street: '', 
    city: '', 
    state: '', 
    zip: '',
    type: 'Venue'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Parse Nominatim response to extract address components
  const parseNominatimAddress = (result: any) => {
    const address = result.address || {};
    const components = {
      street: result.namedetails?.name || address.house_number && address.road 
        ? `${address.house_number} ${address.road}` 
        : address.road || '',
      city: address.city || address.town || address.village || '',
      state: address.state || '',
      zip: address.postcode || ''
    };
    return components;
  };

  // Search for addresses as user types
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setLoading(true);
      try {
        // First, try to fetch from our backend for existing addresses
        const typeParam = addressType ? `&type=${addressType}` : '';
        const res = await api(`/address?city=${encodeURIComponent(searchTerm)}${typeParam}`);
        const existingAddresses: AddressSuggestion[] = [];
        
        if (res.ok && Array.isArray(res.body)) {
          existingAddresses.push(...res.body.map((addr: Address) => ({
            id: addr.id,
            displayName: `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`,
            street: addr.street,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
            isExisting: true
          })));
        }

        // Then search Nominatim for US addresses (only if searchTerm looks like an address)
        if (searchTerm.length > 2) {
          try {
            const nominatimRes = await fetch(
              `https://nominatim.openstreetmap.org/search?country=us&q=${encodeURIComponent(searchTerm)}&format=json&limit=5`,
              { headers: { 'Accept': 'application/json' } }
            );
            
            if (nominatimRes.ok) {
              const nominatimResults = await nominatimRes.json();
              const nominatimSuggestions = nominatimResults.map((result: any, idx: number) => {
                const components = parseNominatimAddress(result);
                return {
                  id: `nominatim-${idx}`,
                  displayName: result.display_name,
                  ...components,
                  isExisting: false
                };
              });
              
              setSuggestions([...existingAddresses, ...nominatimSuggestions]);
            } else {
              setSuggestions(existingAddresses);
            }
          } catch (err) {
            // Fall back to just existing addresses if Nominatim fails
            console.error('Nominatim search failed:', err);
            setSuggestions(existingAddresses);
          }
        } else {
          setSuggestions(existingAddresses);
        }
      } catch (err) {
        console.error('Failed to search addresses:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    if (suggestion.isExisting) {
      // If it's an existing address from our DB, use it directly
      onAddressSelected({
        id: suggestion.id,
        street: suggestion.street || '',
        city: suggestion.city || '',
        state: suggestion.state || '',
        zip: suggestion.zip || '',
        type: 'Venue'
      });
    } else {
      // If it's from Nominatim, populate the form
      setNewAddress({
        street: suggestion.street || '',
        city: suggestion.city || '',
        state: suggestion.state || '',
        zip: suggestion.zip || '',
        type: 'Venue'
      });
      setShowForm(true);
    }
    setSearchTerm('');
    setSuggestions([]);
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    if (!newAddress.street.trim() || !newAddress.city.trim() || !newAddress.state.trim() || !newAddress.zip.trim()) {
      setError('Street, city, state, and zip are required');
      setIsCreating(false);
      return;
    }

    try {
      const res = await api('/address', {
        method: 'POST',
        body: {
          street: newAddress.street.trim(),
          city: newAddress.city.trim(),
          state: newAddress.state.trim().toUpperCase(),
          zip: newAddress.zip.trim(),
          type: newAddress.type
        }
      });

      if (res.ok) {
        onAddressSelected(res.body);
        setNewAddress({ street: '', city: '', state: '', zip: '', type: 'Venue' });
        setShowForm(false);
        setSearchTerm('');
      } else {
        setError(res.body?.error || res.body?.errors?.[0] || 'Failed to create address');
      }
    } catch (err) {
      setError('An error occurred while creating the address');
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
            onClick={(e) => {
              e.stopPropagation();
              setShowForm(true);
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Manual entry
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="m-1 mb-0"
              />
              <Command>
              <CommandEmpty>
                {loading ? 'Searching addresses...' : 'No addresses found'}
              </CommandEmpty>
              <CommandList>
                <CommandGroup>
                  {suggestions.map((suggestion, idx) => (
                    <CommandItem
                      key={`${suggestion.id}-${idx}`}
                      value={suggestion.id}
                      onSelect={() => {
                        handleSelectSuggestion(suggestion);
                        setOpen(false);
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">{suggestion.displayName}</p>
                        {suggestion.isExisting && (
                          <p className="text-xs text-slate-500">In your database</p>
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
        <form onSubmit={handleCreateAddress} className="space-y-2 bg-slate-800 p-3 rounded border border-slate-700">
          <FormField label="Street Address" id="addr-street">
            <Input
              id="addr-street"
              type="text"
              placeholder="Street address"
              value={newAddress.street}
              onChange={e => setNewAddress({ ...newAddress, street: e.target.value })}
              required
            />
          </FormField>
          <FormField label="City" id="addr-city">
            <Input
              id="addr-city"
              type="text"
              placeholder="City"
              value={newAddress.city}
              onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="State" id="addr-state">
              <Input
                id="addr-state"
                type="text"
                placeholder="State"
                maxLength={2}
                value={newAddress.state}
                onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Zip" id="addr-zip">
              <Input
                id="addr-zip"
                type="text"
                placeholder="Zip"
                value={newAddress.zip}
                onChange={e => setNewAddress({ ...newAddress, zip: e.target.value })}
                required
              />
            </FormField>
          </div>
          <FormField label="Type" id="addr-type">
            <select
              id="addr-type"
              value={newAddress.type}
              onChange={e => setNewAddress({ ...newAddress, type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Venue">Venue</option>
              <option value="Vendor">Vendor</option>
              <option value="Client">Client</option>
            </select>
          </FormField>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isCreating} className="text-sm py-1 px-3">
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowForm(false);
                setNewAddress({ street: '', city: '', state: '', zip: '', type: 'Venue' });
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
