import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Card from './ui/Card';
import Button from './ui/Button';
import ClientSelector from './ClientSelector';
import AddressSelector from './AddressSelector';
import PlannerAssignment from './PlannerAssignment';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  type: string;
}

interface Wedding {
  id: string;
  date: string;
  spouse1Id?: string | null;
  spouse2Id?: string | null;
  locationId?: string | null;
  spouse1?: Client | null;
  spouse2?: Client | null;
  location?: Address | null;
}

interface WeddingDetailsEditorProps {
  weddingId: string;
  onUpdate?: (wedding: Wedding) => void;
  currentUser?: any;
  showOnlyLocation?: boolean;
}

export default function WeddingDetailsEditor({ weddingId, onUpdate, currentUser, showOnlyLocation = false }: WeddingDetailsEditorProps) {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpouse1, setSelectedSpouse1] = useState<Client | null>(null);
  const [selectedSpouse2, setSelectedSpouse2] = useState<Client | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Address | null>(null);

  useEffect(() => {
    fetchWeddingDetails();
  }, [weddingId]);

  const fetchWeddingDetails = async () => {
    try {
      setLoading(true);
      const res = await api(`/weddings/${weddingId}`);
      if (res.ok) {
        setWedding(res.body);
        setSelectedSpouse1(res.body.spouse1 || null);
        setSelectedSpouse2(res.body.spouse2 || null);
        setSelectedLocation(res.body.location || null);
      } else {
        setError('Failed to load wedding details');
      }
    } catch (err) {
      setError('An error occurred while loading wedding details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!wedding) return;
    
    setError(null);
    setUpdating(true);

    try {
      const updates: any = {};
      
      if (showOnlyLocation) {
        if (selectedLocation?.id && selectedLocation.id !== wedding.locationId) {
          updates.locationId = selectedLocation.id;
        }
      } else {
        if (selectedSpouse1?.id && selectedSpouse1.id !== wedding.spouse1Id) {
          updates.spouse1Id = selectedSpouse1.id;
        }
        if (selectedSpouse2?.id && selectedSpouse2.id !== wedding.spouse2Id) {
          updates.spouse2Id = selectedSpouse2.id;
        }
        if (selectedLocation?.id && selectedLocation.id !== wedding.locationId) {
          updates.locationId = selectedLocation.id;
        }
      }

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setUpdating(false);
        return;
      }

      const res = await api(`/weddings/${weddingId}`, {
        method: 'PUT',
        body: updates
      });

      if (res.ok) {
        const updatedWedding = { ...wedding, ...updates, spouse1: selectedSpouse1, spouse2: selectedSpouse2, location: selectedLocation };
        setWedding(updatedWedding);
        onUpdate?.(updatedWedding);
        setError(null);
      } else {
        setError(res.body?.error || 'Failed to save wedding details');
      }
    } catch (err) {
      setError('An error occurred while saving');
    } finally {
      setUpdating(false);
    }
  };

  const hasChanges = () => {
    if (!wedding) return false;
    if (showOnlyLocation) {
      return selectedLocation?.id !== wedding.locationId;
    }
    return selectedSpouse1?.id !== wedding.spouse1Id ||
           selectedSpouse2?.id !== wedding.spouse2Id ||
           selectedLocation?.id !== wedding.locationId;
  };

  if (loading) {
    return <Card><p className="text-slate-400">Loading wedding details...</p></Card>;
  }

  if (!wedding) {
    return <Card><p className="text-red-400">Wedding not found</p></Card>;
  }

  const weddingDate = new Date(wedding.date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div>
      {!showOnlyLocation && <h3 className="text-lg font-semibold mb-2">Wedding Details</h3>}
      {!showOnlyLocation && <p className="text-slate-400 mb-4">Date: {weddingDate}</p>}
      {showOnlyLocation && <h4 className="text-sm font-medium text-slate-300 mb-3">Venue</h4>}

      <div className="space-y-6">
        {!showOnlyLocation && (
          <>
            {/* Spouse 1 */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Couple Member 1</h4>
              {selectedSpouse1 ? (
                <div className="bg-slate-800 border border-slate-700 rounded p-3 mb-2">
                  <p className="font-medium text-white">{selectedSpouse1.name}</p>
                  {selectedSpouse1.email && <p className="text-xs text-slate-400">{selectedSpouse1.email}</p>}
                  {selectedSpouse1.phone && <p className="text-xs text-slate-400">{selectedSpouse1.phone}</p>}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSpouse1(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <ClientSelector 
                  onClientSelected={setSelectedSpouse1}
                  label="Add couple member 1"
                  placeholder="Search for couple member 1..."
                />
              )}
            </div>

            {/* Spouse 2 */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Couple Member 2</h4>
              {selectedSpouse2 ? (
                <div className="bg-slate-800 border border-slate-700 rounded p-3 mb-2">
                  <p className="font-medium text-white">{selectedSpouse2.name}</p>
                  {selectedSpouse2.email && <p className="text-xs text-slate-400">{selectedSpouse2.email}</p>}
                  {selectedSpouse2.phone && <p className="text-xs text-slate-400">{selectedSpouse2.phone}</p>}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSpouse2(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <ClientSelector 
                  onClientSelected={setSelectedSpouse2}
                  label="Add couple member 2"
                  placeholder="Search for couple member 2..."
                />
              )}
            </div>
          </>
        )}

        {/* Location */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">Ceremony/Reception Location</h4>
          {selectedLocation ? (
            <div className="bg-slate-800 border border-slate-700 rounded p-3 mb-2">
              <p className="font-medium text-white">
                {selectedLocation.street}
              </p>
              <p className="text-sm text-slate-400">
                {selectedLocation.city}, {selectedLocation.state} {selectedLocation.zip}
              </p>
              <p className="text-xs text-slate-500 mt-1">{selectedLocation.type}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLocation(null);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
              >
                Change
              </button>
            </div>
          ) : (
            <AddressSelector 
              onAddressSelected={setSelectedLocation}
              label="Add location"
              placeholder="Search for location..."
            />
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 mt-4">
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-6">
        <Button 
          onClick={handleSaveDetails} 
          disabled={updating || !hasChanges()}
        >
          {updating ? 'Saving...' : 'Save Details'}
        </Button>
        {showOnlyLocation ? (
          !hasChanges() && selectedLocation && (
            <span className="text-xs text-slate-400 flex items-center">✓ Location set</span>
          )
        ) : (
          !hasChanges() && selectedSpouse1 && selectedSpouse2 && selectedLocation && (
            <span className="text-xs text-slate-400 flex items-center">✓ All details complete</span>
          )
        )}
      </div>

      {!showOnlyLocation && currentUser?.role === 'ADMIN' && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <PlannerAssignment weddingId={weddingId} onAssignmentChanged={() => onUpdate?.(wedding!)} />
        </div>
      )}
    </div>
  );
}
