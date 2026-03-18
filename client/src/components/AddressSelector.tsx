import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Button from './ui/Button';
import Input from './ui/Input';
import FormField from './ui/FormField';
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
}

export default function AddressSelector({ 
  onAddressSelected, 
  label = 'Select or Create Location',
  placeholder = 'Search US addresses (e.g., "1600 Pennsylvania Ave")...'
}: AddressSelectorProps) {
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
        const res = await api(`/address?city=${encodeURIComponent(searchTerm)}`);
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
            onClick={() => setShowForm(true)}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            + Manual entry
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
          {loading && <p className="text-xs text-slate-400">Searching addresses...</p>}
          {suggestions.length > 0 && (
            <div className="border border-slate-600 rounded bg-slate-800 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={`${suggestion.id}-${idx}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm border-b border-slate-700 last:border-b-0"
                >
                  <div className="font-medium text-white">{suggestion.displayName}</div>
                  {suggestion.isExisting && <div className="text-xs text-slate-500">In your database</div>}
                </button>
              ))}
            </div>
          )}
          {searchTerm.trim() && suggestions.length === 0 && !loading && (
            <p className="text-xs text-slate-400">No addresses found</p>
          )}
        </div>
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
              onClick={() => {
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
