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
    return <p className="text-muted-foreground">Loading venue...</p>;
  }

  if (!wedding) {
    return <p className="text-destructive">Wedding not found</p>;
  }

  return (
    <div className="space-y-4">
      {/* Venue Display */}
      <div>
        {selectedAddress ? (
          <button
            type="button"
            onClick={() => setSelectedAddress(null)}
            className="w-full text-left bg-card border-2 hover:bg-primary/10 rounded p-3 transition-colors cursor-pointer"
          >
            <p className="font-medium text-card-foreground">{selectedAddress.street}</p>
            <p className="text-sm text-foreground">
              {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}
            </p>
            <p className="text-xs text-primary mt-2">Click to change</p>
          </button>
        ) : (
          <AddressSelector
            onAddressSelected={setSelectedAddress}
            label="Add venue location"
            placeholder="Search for venue..."
          />
        )}
      </div>

      {error && <div className="text-sm text-destructive mt-4">{error}</div>}

      <div className="flex gap-2 mt-4">
        {hasChanges() && (
          <Button 
            onClick={handleSaveVenue}
            disabled={updating}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        )}
        {!hasChanges() && selectedAddress && (
          <span className="text-xs text-muted-foreground flex items-center">✓ Venue set</span>
        )}
      </div>
    </div>
  );
}
