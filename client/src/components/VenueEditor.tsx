import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import AddressSelector from './AddressSelector';

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode?: string;
}

interface Wedding {
  id: string;
  locationId?: string | null;
  location?: Address | null;
}

interface VenueEditorProps {
  weddingId: string;
  onUpdate?: (wedding: Wedding) => void;
  onSaveComplete?: () => void;
}

export default function VenueEditor({ weddingId, onUpdate, onSaveComplete }: VenueEditorProps) {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  useEffect(() => {
    fetchWeddingDetails();
  }, [weddingId]);

  const fetchWeddingDetails = async () => {
    try {
      setLoading(true);
      const res = await api(`/weddings/${weddingId}`);
      if (res.ok) {
        setWedding(res.body);
        setSelectedAddress(res.body.location || null);
      } else {
        setError('Failed to load wedding details');
      }
    } catch (err) {
      setError('An error occurred while loading wedding details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVenue = async () => {
    if (!wedding) return;

    setError(null);
    setUpdating(true);

    try {
      if (!selectedAddress?.id || selectedAddress.id === wedding.locationId) {
        setError('No venue changes to save');
        setUpdating(false);
        return;
      }

      const res = await api(`/weddings/${weddingId}`, {
        method: 'PUT',
        body: {
          locationId: selectedAddress.id
        }
      });

      if (res.ok) {
        const updatedWedding = {
          ...wedding,
          locationId: selectedAddress.id,
          location: selectedAddress
        };
        setWedding(updatedWedding);
        onUpdate?.(updatedWedding);
        setError(null);
        onSaveComplete?.();
      } else {
        setError(res.body?.error || 'Failed to save venue');
      }
    } catch (err) {
      setError('An error occurred while saving');
    } finally {
      setUpdating(false);
    }
  };

  const hasChanges = () => {
    if (!wedding) return false;
    return selectedAddress?.id !== wedding.locationId;
  };

  if (loading) {
    return <p className="text-slate-400">Loading venue...</p>;
  }

  if (!wedding) {
    return <p className="text-red-400">Wedding not found</p>;
  }

  return (
    <div className="space-y-4">
      {/* Venue Display */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">Venue Location</h4>
        {selectedAddress ? (
          <div className="bg-slate-800 border border-slate-700 rounded p-3 mb-2">
            <p className="font-medium text-white">{selectedAddress.street}</p>
            <p className="text-sm text-slate-300">
              {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAddress(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
            >
              Change
            </button>
          </div>
        ) : (
          <AddressSelector
            onAddressSelected={setSelectedAddress}
            label="Add venue location"
            placeholder="Search for venue..."
          />
        )}
      </div>

      {error && <div className="text-sm text-red-400 mt-4">{error}</div>}

      <div className="flex gap-2 mt-6">
        <Button
          onClick={handleSaveVenue}
          disabled={updating || !hasChanges()}
        >
          {updating ? 'Saving...' : 'Save'}
        </Button>
        {!hasChanges() && selectedAddress && (
          <span className="text-xs text-slate-400 flex items-center">✓ Venue set</span>
        )}
      </div>
    </div>
  );
}
